import { TransactionReceiptNotFoundError, type Hash } from "viem";
import { ehEtapaGravada } from "@/etapas-da-compra";
import type { Dependencias } from "@/servidor/adaptadores";
import { exigirPapel } from "@/servidor/autorizacao";
import { registrarDesfecho } from "@/servidor/transacoes";

const etapaDe = (dados: unknown) =>
  dados && typeof dados === "object" && "etapa" in dados && ehEtapaGravada(dados.etapa) ? dados.etapa : null;

/**
 * Todas as transações do investidor, as mais recentes primeiro. As pendentes
 * são reconsultadas na cadeia: as já mineradas passam a confirmada ou
 * revertida, e o desfecho fica gravado.
 */
export async function consultarExtrato({ banco, cadeia }: Pick<Dependencias, "banco" | "cadeia">, perfilId: string) {
  await exigirPapel(banco, perfilId, "investidor");

  const { data, error } = await banco
    .from("transacoes")
    .select("id, tipo, status, tx_hash, dados, erro, criado_em")
    .eq("perfil_id", perfilId)
    .order("criado_em", { ascending: false });
  if (error) throw new Error(`falha ao ler as transações do perfil ${perfilId}: ${error.message}`);

  return Promise.all(
    data.map(async ({ id, tipo, status, tx_hash, dados, erro, criado_em }) => {
      const txHash = tx_hash as Hash;
      const transacao = { id, tipo, etapa: etapaDe(dados), status, txHash, erro, criadoEm: criado_em };
      if (status !== "pendente") return transacao;

      let recibo;
      try {
        recibo = await cadeia.leitor.getTransactionReceipt({ hash: txHash });
      } catch (falha) {
        if (falha instanceof TransactionReceiptNotFoundError) return transacao;
        throw falha;
      }
      const desfecho = await registrarDesfecho({ banco }, txHash, recibo);
      return { ...transacao, status: desfecho.status, erro: desfecho.erro };
    }),
  );
}

export type TransacaoDoExtrato = Awaited<ReturnType<typeof consultarExtrato>>[number];
