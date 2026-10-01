import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import type { Hash } from "viem";
import { AcessoNegado } from "@/servidor/autorizacao";
import { registrarAceite } from "@/servidor/operacoes/aceite";
import { converterParaStablecoin } from "@/servidor/operacoes/compra";
import { consultarExtrato } from "@/servidor/operacoes/extrato";
import { investidorAprovado, prepararAmbiente, type Ambiente } from "../ambiente";
import { clientesLocais, PRECO_UNITARIO } from "../ambiente/rede-local";
import { criarUsuario } from "../ambiente/usuarios";

describe("extrato do investidor", () => {
  let ambiente: Ambiente;
  before(async () => {
    ambiente = await prepararAmbiente();
  });

  const { teste } = clientesLocais();

  /** Com a mineração parada, a transação fica na mempool até `minerar`. */
  async function semMinerar<T>(envio: () => Promise<T>) {
    await teste.setAutomine(false);
    try {
      return await envio();
    } finally {
      await teste.setAutomine(true);
    }
  }
  const minerar = () => teste.mine({ blocks: 1 });

  /** Como quando o servidor deixa de esperar o recibo: a linha fica pendente. */
  async function registrarPendente(investidor: { id: string }, txHash: Hash) {
    await ambiente.banco
      .from("transacoes")
      .insert({ perfil_id: investidor.id, tipo: "compra_oferta", tx_hash: txHash, dados: { etapa: "conversao" } })
      .throwOnError();
  }

  const linhaDe = async (txHash: Hash) =>
    (
      await ambiente.banco
        .from("transacoes")
        .select("status, bloco, confirmada_em, erro")
        .eq("tx_hash", txHash)
        .single()
        .throwOnError()
    ).data;

  it("lista só as transações do próprio perfil, as mais recentes primeiro", async () => {
    const investidor = await investidorAprovado(ambiente);
    const outro = await investidorAprovado(ambiente);
    await registrarAceite(ambiente, investidor.id, { memorando: true, riscos: true });
    const conversao = await converterParaStablecoin(ambiente, investidor.id, { quantidade: 1n });
    assert.ok(!("erro" in conversao), "erro" in conversao ? conversao.erro : "");

    const extrato = await consultarExtrato(ambiente, investidor.id);

    assert.deepEqual(
      extrato.map(({ tipo, etapa, status, txHash }) => ({ tipo, etapa, status, txHash })),
      [
        { tipo: "compra_oferta", etapa: "conversao", status: "confirmada", txHash: conversao.txHash },
        { tipo: "habilitacao", etapa: null, status: "confirmada", txHash: extrato[1].txHash },
      ],
    );
    const doOutro = await consultarExtrato(ambiente, outro.id);
    assert.equal(doOutro.length, 1);
    assert.notEqual(doOutro[0].txHash, extrato[1].txHash);
    for (const { criadoEm } of extrato) assert.ok(!Number.isNaN(Date.parse(criadoEm)));
  });

  it("uma transação pendente continua pendente até ser minerada e então passa a confirmada", async () => {
    const investidor = await investidorAprovado(ambiente);
    const txHash = await semMinerar(async () => {
      const hash = await ambiente.cadeia.stable.write.emitirPara([investidor.carteira, PRECO_UNITARIO]);
      await registrarPendente(investidor, hash);

      const [antes] = await consultarExtrato(ambiente, investidor.id);
      assert.equal(antes.txHash, hash);
      assert.equal(antes.status, "pendente");
      assert.equal((await linhaDe(hash)).status, "pendente");
      return hash;
    });
    await minerar();

    const [depois] = await consultarExtrato(ambiente, investidor.id);

    assert.equal(depois.status, "confirmada");
    assert.equal(depois.erro, null);
    const linha = await linhaDe(txHash);
    assert.equal(linha.status, "confirmada");
    assert.equal(linha.erro, null);
    assert.ok(linha.bloco);
    assert.ok(linha.confirmada_em);
  });

  it("uma transação pendente que reverteu passa a revertida, com o erro", async () => {
    const investidor = await investidorAprovado(ambiente);
    const txHash = await semMinerar(async () => {
      // O agente não tem Glampy: a transferência reverte. O gas explícito evita a estimativa, que já recusaria.
      const hash = await ambiente.cadeia.token.write.transfer([investidor.carteira, 1n], { gas: 200_000n });
      await registrarPendente(investidor, hash);
      return hash;
    });
    await minerar();

    const [depois] = await consultarExtrato(ambiente, investidor.id);

    assert.equal(depois.status, "revertida");
    assert.equal(depois.erro, "a transação reverteu");
    const linha = await linhaDe(txHash);
    assert.equal(linha.status, "revertida");
    assert.equal(linha.confirmada_em, null);
    assert.ok(linha.bloco);
  });

  it("só o investidor consulta o extrato", async () => {
    const operador = await criarUsuario(ambiente.banco, "operador");

    await assert.rejects(consultarExtrato(ambiente, operador.id), AcessoNegado);
  });
});
