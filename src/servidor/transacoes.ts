import {
  BaseError,
  ContractFunctionRevertedError,
  isAddressEqual,
  parseEventLogs,
  type Address,
  type Hash,
  type Log,
  type TransactionReceipt,
  WaitForTransactionReceiptTimeoutError,
} from "viem";
import { entryPoint07Abi } from "viem/account-abstraction";
import { ENTRY_POINT } from "@/carteira/safe";
import type { Dependencias } from "./adaptadores";
import type { Database, Json } from "./adaptadores/tipos-do-banco";

export type TipoDeTransacao = Database["public"]["Enums"]["tipo_transacao"];

export interface TransacaoAcompanhada {
  perfilId: string;
  carteiraId: string;
  tipo: TipoDeTransacao;
  dados?: NonNullable<Json>;
}

/**
 * Envia a transação, grava em `transacoes` como pendente, espera o recibo e
 * grava o desfecho. Lança se o envio falhar ou se a transação reverter.
 */
export async function enviarTransacao(
  { banco, cadeia }: Pick<Dependencias, "banco" | "cadeia">,
  { perfilId, carteiraId, tipo, dados = {} }: TransacaoAcompanhada,
  envio: () => Promise<Hash>,
) {
  const hash = await envio();
  const { error } = await banco
    .from("transacoes")
    .insert({ perfil_id: perfilId, carteira_id: carteiraId, tipo, tx_hash: hash, dados });
  if (error) throw new Error(`falha ao registrar a transação ${hash}: ${error.message}`);

  const recibo = await cadeia.leitor.waitForTransactionReceipt({ hash });
  const desfecho = await registrarDesfecho({ banco }, hash, recibo);
  if (desfecho.status === "revertida") throw new Error(`a transação ${hash} reverteu`);

  return hash;
}

/** Grava o que o recibo diz de uma transação pendente: confirmada ou revertida, com o bloco. */
export async function registrarDesfecho(
  { banco }: Pick<Dependencias, "banco">,
  hash: Hash,
  recibo: Pick<TransactionReceipt, "status" | "blockNumber">,
) {
  const confirmada = recibo.status === "success";
  const desfecho = {
    status: confirmada ? ("confirmada" as const) : ("revertida" as const),
    bloco: Number(recibo.blockNumber),
    confirmada_em: confirmada ? new Date().toISOString() : null,
    erro: confirmada ? null : "a transação reverteu",
  };
  const { error } = await banco.from("transacoes").update(desfecho).eq("tx_hash", hash).eq("status", "pendente");
  if (error) throw new Error(`falha ao registrar o desfecho da transação ${hash}: ${error.message}`);
  return desfecho;
}

export function mensagemDeErro(erro: unknown) {
  if (erro instanceof BaseError) {
    const revertido = erro.walk((causa) => causa instanceof ContractFunctionRevertedError);
    if (revertido instanceof ContractFunctionRevertedError && revertido.data?.errorName) {
      return `o contrato recusou (${revertido.data.errorName})`;
    }
    return erro.shortMessage;
  }
  return erro instanceof Error ? erro.message : String(erro);
}

/** Enviada pela própria carteira ou, na Safe, uma operação dela incluída pelo bundler. */
export const ehOperacaoDaCarteira = (recibo: { from: Address; logs: Log[] }, carteira: Address) =>
  isAddressEqual(recibo.from, carteira) ||
  parseEventLogs({
    abi: entryPoint07Abi,
    eventName: "UserOperationEvent",
    logs: recibo.logs.filter((log) => isAddressEqual(log.address, ENTRY_POINT.address)),
    args: { sender: carteira },
  }).length > 0;

/**
 * O recibo de uma operação que o navegador já viu incluída. Se a rede demorar,
 * a recusa é `repetivel`: o navegador registra de novo o mesmo hash.
 */
export async function esperarRecibo({ cadeia }: Pick<Dependencias, "cadeia">, hash: Hash) {
  try {
    return await cadeia.leitor.waitForTransactionReceipt({ hash, timeout: 60_000 });
  } catch (falha) {
    if (falha instanceof WaitForTransactionReceiptTimeoutError) {
      return { erro: "A rede ainda não confirmou a operação. Tente registrar de novo em instantes.", repetivel: true };
    }
    throw falha;
  }
}
