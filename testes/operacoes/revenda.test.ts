import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { AcessoNegado } from "@/servidor/autorizacao";
import {
  consultarReferencia,
  consultarRevendas,
  prepararCancelamento,
  prepararOferta,
  registrarCancelamento,
  registrarOferta,
} from "@/servidor/operacoes/revenda";
import { investidorComCredito, prepararAmbiente, type Ambiente } from "../ambiente";
import { criarUsuario } from "../ambiente/usuarios";

const DIA = 86_400;

describe("revenda: ofertar e acompanhar", () => {
  let ambiente: Ambiente;
  before(async () => {
    ambiente = await prepararAmbiente();
  });

  type Investidor = Awaited<ReturnType<typeof investidorComCredito>>;

  async function ofertar(investidor: Investidor, quantidade: number, precoCentavos = 100_000_00) {
    const preparo = await prepararOferta(ambiente, investidor.id, { quantidade, precoCentavos });
    assert.ok(!("erro" in preparo), "erro" in preparo ? preparo.erro : "");
    const txHash = await ambiente.contaInteligente.executar(investidor.carteira, preparo.chamadas);
    const registro = await registrarOferta(ambiente, investidor.id, { txHash });
    assert.ok(!("erro" in registro), "erro" in registro ? registro.erro : "");
    return registro.id;
  }

  it("ofertar trava o lote on-chain e a oferta aparece com o estado e os prazos lidos do contrato", async () => {
    const investidor = await investidorComCredito(ambiente, 5n);

    const id = await ofertar(investidor, 3, 98_000_00);

    assert.equal(await ambiente.cadeia.conformidade.read.saldoTravado([investidor.carteira]), 3n);
    assert.equal(await ambiente.cadeia.token.read.balanceOf([investidor.carteira]), 5n);
    const { minhas } = (await consultarRevendas(ambiente, investidor.id))!;
    assert.equal(minhas.length, 1);
    const [oferta] = minhas;
    const noContrato = await ambiente.cadeia.controle.read.ofertaDe([id]);
    assert.equal(oferta.id, id);
    assert.equal(oferta.estado, "ofertado");
    assert.equal(oferta.quantidade, 3n);
    assert.equal(oferta.precoCentavos, 98_000_00);
    const ofertadaEm = Number(noContrato.ofertadaEm);
    assert.equal(oferta.ofertadaEm.getTime(), ofertadaEm * 1000);
    assert.equal(oferta.preferenciaAte.getTime(), (ofertadaEm + 30 * DIA) * 1000);
    assert.equal(oferta.caducaEm.getTime(), (ofertadaEm + 90 * DIA) * 1000);
    assert.equal(oferta.crivoAte, null);
    const { data } = await ambiente.banco.from("transacoes").select("tipo, status").eq("perfil_id", investidor.id).eq("tipo", "revenda_oferta").throwOnError();
    assert.deepEqual(data, [{ tipo: "revenda_oferta", status: "confirmada" }]);
  });

  it("não oferta mais do que o saldo livre, nem quantidade ou preço inválidos", async () => {
    const investidor = await investidorComCredito(ambiente, 5n);
    await ofertar(investidor, 3);

    assert.deepEqual(await prepararOferta(ambiente, investidor.id, { quantidade: 3, precoCentavos: 1_00 }), {
      erro: "Você pode ofertar no máximo 2 tokens.",
    });
    for (const quantidade of [0, 1.5]) {
      assert.deepEqual(await prepararOferta(ambiente, investidor.id, { quantidade, precoCentavos: 1_00 }), {
        erro: "Informe quantos tokens quer ofertar.",
      });
    }
    assert.deepEqual(await prepararOferta(ambiente, investidor.id, { quantidade: 1, precoCentavos: 0 }), {
      erro: "Informe o preço do lote.",
    });
  });

  it("cancelar destrava o lote e encerra a oferta", async () => {
    const investidor = await investidorComCredito(ambiente, 2n);
    const id = await ofertar(investidor, 2);

    const preparo = await prepararCancelamento(ambiente, investidor.id, { id });
    assert.ok(!("erro" in preparo));
    const txHash = await ambiente.contaInteligente.executar(investidor.carteira, preparo.chamadas);
    const registro = await registrarCancelamento(ambiente, investidor.id, { txHash });

    assert.deepEqual(registro, { id, estado: "cancelado" });
    assert.equal(await ambiente.cadeia.conformidade.read.saldoTravado([investidor.carteira]), 0n);
    const { minhas } = (await consultarRevendas(ambiente, investidor.id))!;
    assert.equal(minhas[0].estado, "cancelado");
    assert.deepEqual(await prepararCancelamento(ambiente, investidor.id, { id }), {
      erro: "Esta oferta já foi encerrada.",
    });
  });

  it("não cancela a oferta de outro investidor", async () => {
    const vendedor = await investidorComCredito(ambiente, 1n);
    const outro = await investidorComCredito(ambiente, 1n);
    const id = await ofertar(vendedor, 1);

    assert.deepEqual(await prepararCancelamento(ambiente, outro.id, { id }), { erro: "Esta oferta não é sua." });
    assert.deepEqual(await prepararCancelamento(ambiente, outro.id, { id: 999_999n }), {
      erro: "Oferta de revenda não encontrada.",
    });

    const preparo = await prepararCancelamento(ambiente, vendedor.id, { id });
    assert.ok(!("erro" in preparo));
    const txHash = await ambiente.contaInteligente.executar(vendedor.carteira, preparo.chamadas);
    assert.deepEqual(await registrarCancelamento(ambiente, outro.id, { txHash }), {
      erro: "Esta transação não é da sua carteira.",
    });
  });

  it("a referência usa as apurações registradas e a projeção do memorando sem elas", async () => {
    await ambiente.banco.from("apuracoes_simuladas").delete().gt("periodo", 0).throwOnError();
    const investidor = await investidorComCredito(ambiente, 1n);

    const referencia = await consultarReferencia(ambiente, investidor.id);

    assert.equal(referencia.origem, "memorando");
    assert.equal(referencia.meses.length, 48);
  });

  it("só o investidor oferta e acompanha", async () => {
    const administrador = await criarUsuario(ambiente.banco, "administrador");

    for (const operacao of [
      () => consultarRevendas(ambiente, administrador.id),
      () => consultarReferencia(ambiente, administrador.id),
      () => prepararOferta(ambiente, administrador.id, { quantidade: 1, precoCentavos: 1 }),
      () => registrarOferta(ambiente, administrador.id, { txHash: `0x${"0".repeat(64)}` }),
      () => prepararCancelamento(ambiente, administrador.id, { id: 1n }),
      () => registrarCancelamento(ambiente, administrador.id, { txHash: `0x${"0".repeat(64)}` }),
    ]) {
      await assert.rejects(operacao(), AcessoNegado);
    }
  });
});
