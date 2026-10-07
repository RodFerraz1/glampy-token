import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { encodeFunctionData } from "viem";
import { AcessoNegado } from "@/servidor/autorizacao";
import { cancelarResgate, listarResgates } from "@/servidor/operacoes/gestao-de-resgates";
import { consultarLoja, prepararResgate, registrarResgate } from "@/servidor/operacoes/loja";
import { marcarEntrega } from "@/servidor/operacoes/voucher";
import { catalogoPublicado, investidorComCredito, prepararAmbiente, type Ambiente } from "../ambiente";
import { criarUsuario } from "../ambiente/usuarios";

describe("gestão de resgates pelo Ibiti", () => {
  let ambiente: Ambiente;
  let beneficioId: string;
  let administrador: { id: string };
  before(async () => {
    ambiente = await prepararAmbiente();
    ({ administrador, beneficios: [beneficioId] } = await catalogoPublicado(ambiente, [300_00]));
  });

  async function resgateConfirmado() {
    const investidor = await investidorComCredito(ambiente, 1n);
    const preparo = await prepararResgate(ambiente, investidor.id, { beneficioId });
    assert.ok(!("erro" in preparo));
    const txHash = await ambiente.contaInteligente.executar(investidor.carteira, preparo.chamadas);
    const registro = await registrarResgate(ambiente, investidor.id, { txHash, beneficioId });
    assert.ok(!("erro" in registro));
    return registro.resgateId;
  }

  async function resgateQueFalhou() {
    const investidor = await investidorComCredito(ambiente, 1n);
    const [{ item }] = (await consultarLoja(ambiente, investidor.id))!.beneficios;
    const txHash = await ambiente.contaInteligente.executar(investidor.carteira, [
      {
        to: ambiente.cadeia.ibitiPass.address,
        data: encodeFunctionData({ abi: ambiente.cadeia.ibitiPass.abi, functionName: "resgatar", args: [1n, item] }),
      },
    ]);
    await registrarResgate(ambiente, investidor.id, { txHash, beneficioId });
    const [falha] = await listarResgates(ambiente, administrador.id, { status: "falhou" });
    return falha.id;
  }

  it("lista todos os resgates, filtra por status e mostra o erro dos que falharam", async () => {
    const confirmado = await resgateConfirmado();
    const falhou = await resgateQueFalhou();

    const todos = await listarResgates(ambiente, administrador.id);
    assert.deepEqual(
      todos.slice(0, 2).map(({ id, status }) => ({ id, status })),
      [
        { id: falhou, status: "falhou" },
        { id: confirmado, status: "confirmado" },
      ],
    );
    const [comErro] = await listarResgates(ambiente, administrador.id, { status: "falhou" });
    assert.equal(comErro.id, falhou);
    assert.match(comErro.erro ?? "", /não confere com o catálogo/);
    assert.equal(comErro.investidor, "Maria da Silva");
    assert.equal(comErro.beneficio, "Benefício 1");
    assert.ok((await listarResgates(ambiente, administrador.id, { status: "confirmado" })).every(({ status }) => status === "confirmado"));
  });

  it("cancelar exige motivo, grava quem e quando, e a auditoria", async () => {
    const id = await resgateConfirmado();

    assert.deepEqual(await cancelarResgate(ambiente, administrador.id, id, { motivo: "  " }), {
      erro: "Informe o motivo do cancelamento.",
    });

    const cancelamento = await cancelarResgate(ambiente, administrador.id, id, { motivo: "Investidor desistiu" });

    assert.deepEqual(cancelamento, { status: "cancelado" });
    const [cancelado] = (await listarResgates(ambiente, administrador.id, { status: "cancelado" })).filter(
      (resgate) => resgate.id === id,
    );
    assert.equal(cancelado.motivoCancelamento, "Investidor desistiu");
    assert.ok(cancelado.canceladoEm);
    const { data } = await ambiente.banco
      .from("resgates")
      .select("cancelado_por")
      .eq("id", id)
      .single()
      .throwOnError();
    assert.equal(data.cancelado_por, administrador.id);
    const { data: auditoria } = await ambiente.banco
      .from("auditoria")
      .select("acao, dados")
      .eq("entidade_id", id)
      .eq("ator_id", administrador.id)
      .throwOnError();
    assert.deepEqual(auditoria, [{ acao: "cancelar_resgate", dados: { motivo: "Investidor desistiu" } }]);
  });

  it("só um resgate confirmado é cancelado: entregue, cancelado ou que falhou é recusado", async () => {
    const operador = await criarUsuario(ambiente.banco, "operador");
    const entregue = await resgateConfirmado();
    await marcarEntrega(ambiente, operador.id, entregue);
    const cancelado = await resgateConfirmado();
    await cancelarResgate(ambiente, administrador.id, cancelado, { motivo: "Primeiro cancelamento" });
    const falhou = await resgateQueFalhou();

    for (const id of [entregue, cancelado, falhou, crypto.randomUUID(), "não é uuid"]) {
      assert.deepEqual(await cancelarResgate(ambiente, administrador.id, id, { motivo: "Outro motivo" }), {
        erro: "Só um resgate confirmado, ainda não entregue, pode ser cancelado.",
      });
    }
    const [primeiro] = (await listarResgates(ambiente, administrador.id, { status: "cancelado" })).filter(
      ({ id }) => id === cancelado,
    );
    assert.equal(primeiro.motivoCancelamento, "Primeiro cancelamento");
  });

  it("só o administrador lista e cancela", async () => {
    const operador = await criarUsuario(ambiente.banco, "operador");

    await assert.rejects(listarResgates(ambiente, operador.id), AcessoNegado);
    await assert.rejects(cancelarResgate(ambiente, operador.id, crypto.randomUUID(), { motivo: "x" }), AcessoNegado);
  });
});
