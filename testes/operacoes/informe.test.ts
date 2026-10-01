import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { sucessorDe } from "@/calendario-da-oferta";
import { gerarPdfDoInforme } from "@/informe/pdf";
import { AcessoNegado } from "@/servidor/autorizacao";
import { registrarApuracao } from "@/servidor/operacoes/apuracoes";
import { anosDoInforme, montarInforme } from "@/servidor/operacoes/informe";
import { investidorComCredito, prepararAmbiente, relatorioEmPdf, type Ambiente } from "../ambiente";
import { criarUsuario } from "../ambiente/usuarios";

describe("informe anual de rendimentos", () => {
  let ambiente: Ambiente;
  let investidor: Awaited<ReturnType<typeof investidorComCredito>>;
  before(async () => {
    ambiente = await prepararAmbiente();
    await ambiente.banco.from("apuracoes_simuladas").delete().gt("periodo", 0).throwOnError();
    const administrador = await criarUsuario(ambiente.banco, "administrador");
    // De abril de 2027 a janeiro de 2028, com R$ 300.000,00 de faturamento a mais por mês:
    // R$ 150,00 por token no primeiro, R$ 300,00 no segundo, e assim por diante.
    let faturamento = 300_000_00;
    for (let periodo = 202704; periodo <= 202801; periodo = sucessorDe(periodo)) {
      const apuracao = await registrarApuracao(ambiente, administrador.id, {
        periodo,
        faturamentoCentavos: faturamento,
        relatorio: relatorioEmPdf(periodo),
      });
      assert.ok(!("erro" in apuracao));
      faturamento += 300_000_00;
    }
    investidor = await investidorComCredito(ambiente, 2n);
  });

  it("soma os rendimentos do ano-calendário a partir das apurações", async () => {
    const informe = await montarInforme(ambiente, investidor.id, 2027);

    assert.ok(!("erro" in informe));
    assert.equal(informe.ano, 2027);
    assert.equal(informe.titular.nome, "Maria da Silva");
    assert.match(informe.titular.cpf, /^\d{3}\.\d{3}\.\d{3}-\d{2}$/);
    assert.equal(informe.posicao, 2n);
    assert.deepEqual(
      informe.meses.map(({ periodo }) => periodo),
      [202704, 202705, 202706, 202707, 202708, 202709, 202710, 202711, 202712],
    );
    // R$ 150,00 a R$ 1.350,00 por token, 2 tokens: 2 × 150 × (1 + 2 + … + 9) = R$ 13.500,00.
    assert.equal(informe.meses[0].recebidoCentavos, 300_00);
    assert.equal(informe.totalCentavos, 13_500_00);

    const seguinte = await montarInforme(ambiente, investidor.id, 2028);
    assert.ok(!("erro" in seguinte));
    assert.deepEqual(
      seguinte.meses.map(({ periodo, recebidoCentavos }) => ({ periodo, recebidoCentavos })),
      [{ periodo: 202801, recebidoCentavos: 3_000_00 }],
    );
    assert.equal(seguinte.totalCentavos, 3_000_00);
  });

  it("só há informe dos anos com apuração", async () => {
    assert.deepEqual(await anosDoInforme(ambiente, investidor.id), [2027, 2028]);
    assert.deepEqual(await montarInforme(ambiente, investidor.id, 2026), { erro: "Não há apurações em 2026." });
  });

  it("gera o PDF do informe", async () => {
    const informe = await montarInforme(ambiente, investidor.id, 2027);
    assert.ok(!("erro" in informe));

    const pdf = await gerarPdfDoInforme(informe);

    assert.equal(Buffer.from(pdf.subarray(0, 5)).toString(), "%PDF-");
    assert.ok(pdf.length > 1_000);
  });

  it("só o investidor aprovado tem informe", async () => {
    const administrador = await criarUsuario(ambiente.banco, "administrador");
    const semCadastro = await criarUsuario(ambiente.banco, "investidor");

    await assert.rejects(montarInforme(ambiente, administrador.id, 2027), AcessoNegado);
    assert.deepEqual(await montarInforme(ambiente, semCadastro.id, 2027), {
      erro: "O informe fica disponível depois que seu cadastro for aprovado.",
    });
  });
});
