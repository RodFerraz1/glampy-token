import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { encodeFunctionData } from "viem";
import { AcessoNegado } from "@/servidor/autorizacao";
import { consultarCreditoPendente, prepararSaque, registrarSaque } from "@/servidor/operacoes/saque";
import { investidorAprovado, prepararAmbiente, type Ambiente } from "../ambiente";
import { criarUsuario } from "../ambiente/usuarios";

describe("saque de crédito pendente", () => {
  let ambiente: Ambiente;
  before(async () => {
    ambiente = await prepararAmbiente();
  });

  it("lê o crédito pendente da Distribuição para a Safe: na v2 é zero, e o saque fica indisponível", async () => {
    const investidor = await investidorAprovado(ambiente);

    const credito = await consultarCreditoPendente(ambiente, investidor.id);

    assert.ok(credito);
    assert.equal(credito.valor, await ambiente.cadeia.distribuicao.read.creditoPendente([investidor.carteira]));
    assert.equal(credito.valor, 0n);
    assert.equal(credito.podeSacar, false);
    assert.deepEqual(await prepararSaque(ambiente, investidor.id), { erro: "Não há crédito pendente para sacar." });
  });

  it("uma operação da carteira que não sacou não é registrada como saque", async () => {
    const investidor = await investidorAprovado(ambiente);
    const txHash = await ambiente.contaInteligente.executar(investidor.carteira, [
      {
        to: ambiente.cadeia.distribuicao.address,
        data: encodeFunctionData({
          abi: ambiente.cadeia.distribuicao.abi,
          functionName: "creditoPendente",
          args: [investidor.carteira],
        }),
      },
    ]);

    assert.deepEqual(await registrarSaque(ambiente, investidor.id, { txHash }), {
      erro: "O saque não aconteceu: a Distribuição não transferiu o crédito.",
    });
    const { data } = await ambiente.banco
      .from("transacoes")
      .select("tipo, status")
      .eq("tx_hash", txHash)
      .throwOnError();
    assert.deepEqual(data, [{ tipo: "saque_pendente", status: "revertida" }]);
  });

  it("sem carteira habilitada não há crédito para consultar", async () => {
    const investidor = await criarUsuario(ambiente.banco, "investidor");

    assert.equal(await consultarCreditoPendente(ambiente, investidor.id), null);
  });

  it("só o investidor consulta e saca", async () => {
    const administrador = await criarUsuario(ambiente.banco, "administrador");

    await assert.rejects(consultarCreditoPendente(ambiente, administrador.id), AcessoNegado);
    await assert.rejects(prepararSaque(ambiente, administrador.id), AcessoNegado);
    await assert.rejects(registrarSaque(ambiente, administrador.id, { txHash: `0x${"0".repeat(64)}` }), AcessoNegado);
  });
});
