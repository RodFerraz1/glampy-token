import type { Dependencias } from "@/servidor/adaptadores";
import { registrarAuditoria } from "@/servidor/auditoria";
import { exigirPapel } from "@/servidor/autorizacao";
import { ehUuid, type Resultado } from "@/servidor/resultado";
import type { StatusDoResgate } from "./loja";

const SO_CONFIRMADO = { erro: "Só um resgate confirmado, ainda não entregue, pode ser cancelado." };

/** Todos os resgates do programa, os mais recentes primeiro, com o erro dos que falharam. */
export async function listarResgates(
  { banco }: Pick<Dependencias, "banco">,
  ator: string,
  { status }: { status?: StatusDoResgate } = {},
) {
  await exigirPapel(banco, ator, "administrador");
  let consulta = banco
    .from("resgates")
    .select(
      "id, status, custo::text, tx_hash, erro, criado_em, entregue_em, motivo_cancelamento, cancelado_em, beneficios(nome), perfis!resgates_perfil_id_fkey(titulares!titulares_perfil_id_fkey(nome_completo))",
    )
    .order("criado_em", { ascending: false });
  if (status) consulta = consulta.eq("status", status);
  const { data, error } = await consulta;
  if (error) throw new Error(`falha ao listar os resgates: ${error.message}`);

  return data.map((resgate) => ({
    id: resgate.id,
    status: resgate.status,
    beneficio: resgate.beneficios.nome,
    investidor: resgate.perfis.titulares?.nome_completo ?? "",
    custo: BigInt(resgate.custo),
    txHash: resgate.tx_hash as `0x${string}` | null,
    erro: resgate.erro,
    criadoEm: resgate.criado_em,
    entregueEm: resgate.entregue_em,
    motivoCancelamento: resgate.motivo_cancelamento,
    canceladoEm: resgate.cancelado_em,
  }));
}

/**
 * Cancela um voucher confirmado que não será entregue. O crédito já foi
 * consumido on-chain e não volta: o cancelamento só impede a entrega.
 */
export async function cancelarResgate(
  { banco }: Pick<Dependencias, "banco">,
  ator: string,
  resgateId: string,
  { motivo, agora = new Date() }: { motivo: string; agora?: Date },
): Promise<Resultado<{ status: "cancelado" }>> {
  await exigirPapel(banco, ator, "administrador");
  motivo = motivo.trim();
  if (!motivo) return { erro: "Informe o motivo do cancelamento." };
  if (!ehUuid(resgateId)) return SO_CONFIRMADO;

  const { data, error } = await banco
    .from("resgates")
    .update({ status: "cancelado", motivo_cancelamento: motivo, cancelado_por: ator, cancelado_em: agora.toISOString() })
    .eq("id", resgateId)
    .eq("status", "confirmado")
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`falha ao cancelar o resgate ${resgateId}: ${error.message}`);
  if (!data) return SO_CONFIRMADO;
  await registrarAuditoria(banco, {
    ator,
    acao: "cancelar_resgate",
    entidade: "resgates",
    entidadeId: resgateId,
    dados: { motivo },
  });

  return { status: "cancelado" };
}
