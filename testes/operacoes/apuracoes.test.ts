import assert from "node:assert/strict";
import { before, beforeEach, describe, it } from "node:test";
import { sucessorDe } from "@/calendario-da-oferta";
import { hashDoRelatorio, TAMANHO_MAXIMO_DO_RELATORIO } from "@/relatorio-de-apuracao";
import { AcessoNegado } from "@/servidor/autorizacao";
import { consultarRendimentos, listarApuracoes, registrarApuracao } from "@/servidor/operacoes/apuracoes";
import { investidorComCredito, prepararAmbiente, relatorioEmPdf, type Ambiente } from "../ambiente";
import { criarUsuario } from "../ambiente/usuarios";

describe("apurações simuladas e rendimentos", () => {
  let ambiente: Ambiente;
  let administrador: { id: string };
  before(async () => {
    ambiente = await prepararAmbiente();
  });
  beforeEach(async () => {
    await ambiente.banco.from("apuracoes_simuladas").delete().gt("periodo", 0).throwOnError();
    administrador = await criarUsuario(ambiente.banco, "administrador");
  });

  const registrar = (periodo: number, faturamentoCentavos = 1_000_000_00, relatorio = relatorioEmPdf(periodo)) =>
    registrarApuracao(ambiente, administrador.id, { periodo, faturamentoCentavos, relatorio });

  it("o royalty é 15% do faturamento e o valor por token é o royalty dividido pelos 300 tokens", async () => {
    const apuracao = await registrar(202704, 1_234_567_89);

    assert.deepEqual(apuracao, {
      periodo: 202704,
      faturamentoCentavos: 1_234_567_89,
      royaltyCentavos: 18_518_518,
      valorPorTokenCentavos: 61_728.393333,
      hashRelatorio: hashDoRelatorio(relatorioEmPdf(202704)),
    });
    const [lida] = await listarApuracoes(ambiente);
    assert.equal(lida.periodo, 202704);
    assert.equal(lida.royaltyCentavos, 18_518_518);
    assert.equal(lida.valorPorTokenCentavos, 61_728.393333);
    assert.equal(lida.hashRelatorio, hashDoRelatorio(relatorioEmPdf(202704)));
    const { data: auditoria } = await ambiente.banco
      .from("auditoria")
      .select("acao, entidade_id")
      .eq("ator_id", administrador.id)
      .throwOnError();
    assert.deepEqual(auditoria, [{ acao: "registrar_apuracao", entidade_id: "202704" }]);
  });

  it("os períodos começam em abril de 2027 e seguem em sequência, sem lacuna nem repetição", async () => {
    assert.deepEqual(await registrar(202705), { erro: "A próxima apuração é a de abril de 2027." });

    for (let periodo = 202704; periodo <= 202801; periodo = sucessorDe(periodo)) {
      assert.ok(!("erro" in (await registrar(periodo))), `período ${periodo}`);
    }

    assert.deepEqual(await registrar(202801), { erro: "A próxima apuração é a de fevereiro de 2028." });
    assert.deepEqual(await registrar(202803), { erro: "A próxima apuração é a de fevereiro de 2028." });
    assert.deepEqual(
      (await listarApuracoes(ambiente)).map(({ periodo }) => periodo),
      [202801, 202712, 202711, 202710, 202709, 202708, 202707, 202706, 202705, 202704],
    );
  });

  it("guarda o relatório, e quem baixa pelo link calcula o mesmo hash registrado", async () => {
    await registrar(202704);

    const [lida] = await listarApuracoes(ambiente);
    assert.ok(lida.relatorioUrl);
    const resposta = await fetch(lida.relatorioUrl);
    assert.equal(resposta.status, 200);
    assert.equal(hashDoRelatorio(new Uint8Array(await resposta.arrayBuffer())), lida.hashRelatorio);
  });

  it("recusa faturamento que não é um valor positivo em centavos e relatório que não é um PDF de até 4 MB", async () => {
    for (const faturamento of [0, -1, 10.5]) {
      assert.deepEqual(await registrar(202704, faturamento), { erro: "Informe o faturamento do mês." });
    }
    for (const relatorio of [new Uint8Array(), new TextEncoder().encode("não é um PDF")]) {
      assert.deepEqual(await registrar(202704, 1_000_00, relatorio), {
        erro: "Anexe o relatório de apuração do mês em PDF.",
      });
    }
    const grande = new Uint8Array(TAMANHO_MAXIMO_DO_RELATORIO + 1);
    grande.set(relatorioEmPdf(202704));
    assert.deepEqual(await registrar(202704, 1_000_00, grande), { erro: "O relatório tem de ter até 4 MB." });
    assert.deepEqual(await listarApuracoes(ambiente), []);
  });

  it("o rendimento do investidor é o valor por token vezes a posição atual on-chain", async () => {
    const investidor = await investidorComCredito(ambiente, 3n);
    await registrar(202704, 900_000_00);
    await registrar(202705, 1_200_000_00);

    const rendimentos = await consultarRendimentos(ambiente, investidor.id);

    assert.ok(rendimentos);
    assert.equal(rendimentos.posicao, 3n);
    assert.deepEqual(
      rendimentos.meses.map(({ periodo, valorPorTokenCentavos, recebidoCentavos }) => ({
        periodo,
        valorPorTokenCentavos,
        recebidoCentavos,
      })),
      [
        { periodo: 202705, valorPorTokenCentavos: 600_00, recebidoCentavos: 1_800_00 },
        { periodo: 202704, valorPorTokenCentavos: 450_00, recebidoCentavos: 1_350_00 },
      ],
    );
    assert.equal(rendimentos.totalCentavos, 3_150_00);
  });

  it("só o administrador registra e só o investidor consulta os próprios rendimentos", async () => {
    const investidor = await criarUsuario(ambiente.banco, "investidor");

    await assert.rejects(
      registrarApuracao(ambiente, investidor.id, {
        periodo: 202704,
        faturamentoCentavos: 1,
        relatorio: relatorioEmPdf(202704),
      }),
      AcessoNegado,
    );
    await assert.rejects(consultarRendimentos(ambiente, administrador.id), AcessoNegado);
    assert.equal(await consultarRendimentos(ambiente, investidor.id), null);
  });
});
