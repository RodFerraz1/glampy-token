import { encodeFunctionData, isAddressEqual, isHash, parseEventLogs, type Hash } from "viem";
import type { Dependencias } from "@/servidor/adaptadores";
import type { Chamada } from "@/servidor/adaptadores/conta-inteligente";
import { exigirPapel } from "@/servidor/autorizacao";
import type { Resultado } from "@/servidor/resultado";
import { ehOperacaoDaCarteira, esperarRecibo } from "@/servidor/transacoes";
import { lerCarteiraHabilitada } from "./carteira";

const NAO_HABILITADA = { erro: "Sua carteira não está habilitada." };
const NAO_SACOU = "O saque não aconteceu: a Distribuição não transferiu o crédito.";

/**
 * O crédito de um pagamento de royalty que falhou e ficou na Distribuição
 * para a Safe sacar. `null` sem carteira habilitada.
 */
export async function consultarCreditoPendente(
  { banco, cadeia }: Pick<Dependencias, "banco" | "cadeia">,
  perfilId: string,
) {
  await exigirPapel(banco, perfilId, "investidor");
  const carteira = await lerCarteiraHabilitada({ banco }, perfilId);
  if (!carteira) return null;
  const valor = await cadeia.distribuicao.read.creditoPendente([carteira.carteira]);
  return { valor, podeSacar: valor > 0n, carteira: carteira.carteira, passkey: carteira.passkey };
}

export async function prepararSaque(
  { banco, cadeia }: Pick<Dependencias, "banco" | "cadeia">,
  perfilId: string,
): Promise<Resultado<{ valor: bigint; chamadas: Chamada[] }>> {
  const credito = await consultarCreditoPendente({ banco, cadeia }, perfilId);
  if (!credito) return NAO_HABILITADA;
  if (!credito.podeSacar) return { erro: "Não há crédito pendente para sacar." };
  return {
    valor: credito.valor,
    chamadas: [
      {
        to: cadeia.distribuicao.address,
        data: encodeFunctionData({ abi: cadeia.distribuicao.abi, functionName: "sacarPendente" }),
      },
    ],
  };
}

/** A Safe já executou `sacarPendente`; o valor sacado vem do evento do contrato. */
export async function registrarSaque(
  { banco, cadeia }: Pick<Dependencias, "banco" | "cadeia">,
  perfilId: string,
  { txHash }: { txHash: Hash },
): Promise<Resultado<{ valor: bigint; txHash: Hash }>> {
  await exigirPapel(banco, perfilId, "investidor");
  const carteira = await lerCarteiraHabilitada({ banco }, perfilId);
  if (!carteira) return NAO_HABILITADA;
  if (!isHash(txHash)) return { erro: "Saque inválido." };

  const recibo = await esperarRecibo({ cadeia }, txHash);
  if ("erro" in recibo) return recibo;
  const [saque] =
    recibo.status === "success"
      ? parseEventLogs({
          abi: cadeia.distribuicao.abi,
          eventName: "CreditoPendenteSacado",
          logs: recibo.logs.filter((log) => isAddressEqual(log.address, cadeia.distribuicao.address)),
          args: { detentor: carteira.carteira },
        })
      : [];
  if (!saque && !ehOperacaoDaCarteira(recibo, carteira.carteira)) return { erro: "Esta transação não é da sua carteira." };

  const { error } = await banco.from("transacoes").upsert(
    {
      perfil_id: perfilId,
      carteira_id: carteira.carteiraId,
      tipo: "saque_pendente",
      tx_hash: txHash,
      status: saque ? "confirmada" : "revertida",
      bloco: Number(recibo.blockNumber),
      dados: saque ? { valor: saque.args.valor.toString() } : {},
      erro: saque ? null : NAO_SACOU,
      confirmada_em: saque ? new Date().toISOString() : null,
    },
    { onConflict: "tx_hash", ignoreDuplicates: true },
  );
  if (error) throw new Error(`falha ao registrar o saque ${txHash}: ${error.message}`);

  return saque ? { valor: saque.args.valor, txHash } : { erro: NAO_SACOU };
}
