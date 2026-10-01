import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { AcessoNegado } from "@/servidor/autorizacao";
import { prepararResgate, registrarResgate, type StatusDoResgate } from "@/servidor/operacoes/loja";
import { marcarEntrega, validarVoucher } from "@/servidor/operacoes/voucher";
import { catalogoPublicado, investidorComCredito, prepararAmbiente, type Ambiente } from "../ambiente";
import { criarUsuario } from "../ambiente/usuarios";

describe("validação de voucher", () => {
  let ambiente: Ambiente;
  let beneficioId: string;
  let operador: { id: string };
  before(async () => {
    ambiente = await prepararAmbiente();
    [beneficioId] = (await catalogoPublicado(ambiente, [300_00])).beneficios;
    operador = await criarUsuario(ambiente.banco, "operador");
  });

  async function voucherConfirmado() {
    const investidor = await investidorComCredito(ambiente, 1n);
    const preparo = await prepararResgate(ambiente, investidor.id, { beneficioId });
    assert.ok(!("erro" in preparo));
    const txHash = await ambiente.contaInteligente.executar(investidor.carteira, preparo.chamadas);
    const registro = await registrarResgate(ambiente, investidor.id, { txHash, beneficioId });
    assert.ok(!("erro" in registro));
    return registro.resgateId;
  }

  const comStatus = async (status: StatusDoResgate) => {
    const id = await voucherConfirmado();
    const cancelamento =
      status === "cancelado"
        ? { motivo_cancelamento: "Teste", cancelado_por: operador.id, cancelado_em: new Date().toISOString() }
        : {};
    await ambiente.banco
      .from("resgates")
      .update({ status, ...cancelamento })
      .eq("id", id)
      .throwOnError();
    return id;
  };

  const resgate = async (id: string) =>
    (
      await ambiente.banco
        .from("resgates")
        .select("status, entregue_em, entregue_por")
        .eq("id", id)
        .single()
        .throwOnError()
    ).data;

  it("mostra o benefício, o nome do investidor e o status do voucher", async () => {
    const id = await voucherConfirmado();

    const voucher = await validarVoucher(ambiente, operador.id, id);

    assert.ok(voucher && !("erro" in voucher));
    assert.equal(voucher.id, id);
    assert.equal(voucher.beneficio.nome, "Benefício 1");
    assert.equal(voucher.investidor, "Maria da Silva");
    assert.equal(voucher.status, "confirmado");
    assert.equal(voucher.podeEntregar, true);
  });

  it("código que não é de voucher nenhum é recusado", async () => {
    for (const codigo of ["abc", crypto.randomUUID(), ""]) {
      assert.deepEqual(await validarVoucher(ambiente, operador.id, codigo), { erro: "Voucher não encontrado." });
    }
  });

  it("a entrega é aceita uma vez só: grava quando, quem e a auditoria", async () => {
    const id = await voucherConfirmado();

    const entrega = await marcarEntrega(ambiente, operador.id, ` ${id.toUpperCase()} `);

    assert.ok(!("erro" in entrega));
    const depois = await resgate(id);
    assert.equal(depois.status, "entregue");
    assert.equal(depois.entregue_por, operador.id);
    assert.ok(depois.entregue_em);
    const { data: auditoria } = await ambiente.banco
      .from("auditoria")
      .select("acao, entidade, entidade_id")
      .eq("ator_id", operador.id)
      .eq("entidade_id", id)
      .throwOnError();
    assert.deepEqual(auditoria, [{ acao: "marcar_entrega", entidade: "resgates", entidade_id: id }]);

    const segunda = await marcarEntrega(ambiente, operador.id, id);
    assert.ok("erro" in segunda);
    assert.match(segunda.erro, /^Este voucher já foi entregue em /);
    const voucher = await validarVoucher(ambiente, operador.id, id);
    assert.ok(voucher && !("erro" in voucher));
    assert.equal(voucher.podeEntregar, false);
    assert.match(voucher.aviso ?? "", /já foi entregue/);
  });

  it("duas entregas ao mesmo tempo: só uma é aceita", async () => {
    const id = await voucherConfirmado();

    const entregas = await Promise.all([marcarEntrega(ambiente, operador.id, id), marcarEntrega(ambiente, operador.id, id)]);

    assert.equal(entregas.filter((entrega) => !("erro" in entrega)).length, 1);
    const { data: auditoria } = await ambiente.banco
      .from("auditoria")
      .select("id")
      .eq("acao", "marcar_entrega")
      .eq("entidade_id", id)
      .throwOnError();
    assert.equal(auditoria.length, 1);
  });

  it("voucher cancelado, que falhou ou não confirmado on-chain não pode ser entregue", async () => {
    for (const [status, erro] of [
      ["cancelado", "Este voucher foi cancelado e não pode ser entregue."],
      ["falhou", "Este resgate falhou on-chain e não vale como voucher."],
      ["assinado", "Este resgate ainda não foi confirmado on-chain. Não entregue por enquanto."],
      ["submetido", "Este resgate ainda não foi confirmado on-chain. Não entregue por enquanto."],
    ] as const) {
      const id = await comStatus(status);

      assert.deepEqual(await marcarEntrega(ambiente, operador.id, id), { erro });
      const voucher = await validarVoucher(ambiente, operador.id, id);
      assert.ok(voucher && !("erro" in voucher));
      assert.equal(voucher.podeEntregar, false);
      assert.equal(voucher.aviso, erro);
      assert.equal((await resgate(id)).status, status);
    }
  });

  it("só o operador valida e entrega", async () => {
    const investidor = await criarUsuario(ambiente.banco, "investidor");
    const administrador = await criarUsuario(ambiente.banco, "administrador");

    for (const ator of [investidor, administrador]) {
      await assert.rejects(validarVoucher(ambiente, ator.id, crypto.randomUUID()), AcessoNegado);
      await assert.rejects(marcarEntrega(ambiente, ator.id, crypto.randomUUID()), AcessoNegado);
    }
  });
});
