import type { Hash } from "viem";
import type { Dependencias } from "./adaptadores";
import type { Chamada } from "./adaptadores/conta-inteligente";
import type { ExecucaoDeGovernanca, SafeDeGovernanca } from "./adaptadores/governanca";
import type { Json } from "./adaptadores/tipos-do-banco";
import { registrarAuditoria } from "./auditoria";
import type { Resultado } from "./resultado";
import { mensagemDeErro } from "./transacoes";

export interface Decisao {
  txHash: Hash;
  /** Colhidas, das `donos` possíveis; a Safe exige `necessarias`. */
  assinaturas: number;
  necessarias: number;
  donos: number;
}

/**
 * Executa pela Safe de governança, numa transação só com as assinaturas dos
 * diretores, e grava na auditoria a decisão, ou a falha, com quantas
 * assinaturas foram colhidas.
 */
export async function decidirPelaGovernanca(
  { banco, governanca }: Pick<Dependencias, "banco" | "governanca">,
  {
    ator,
    acao,
    entidade,
    entidadeId,
    safe,
    chamadas,
    dados = {},
  }: {
    ator: string;
    acao: string;
    entidade: string;
    entidadeId: string;
    safe: SafeDeGovernanca;
    chamadas: Chamada[];
    dados?: { [chave: string]: Json };
  },
): Promise<Resultado<Decisao>> {
  const auditar = (resultado: { [chave: string]: Json }) =>
    registrarAuditoria(banco, { ator, acao, entidade, entidadeId, dados: { ...dados, ...resultado } });

  let execucao: ExecucaoDeGovernanca;
  try {
    execucao = await governanca.executar(safe, chamadas);
  } catch (erro) {
    const mensagem = `A decisão on-chain falhou: ${mensagemDeErro(erro)}`;
    await auditar({ erro: mensagem });
    return { erro: mensagem };
  }
  const decisao = {
    txHash: execucao.hash,
    assinaturas: execucao.assinaturas,
    necessarias: execucao.necessarias,
    donos: execucao.donos,
  };
  await auditar(decisao);
  return decisao;
}
