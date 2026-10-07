import { formatarDataHora } from "@/formatacao";
import type { Dependencias } from "@/servidor/adaptadores";
import { registrarAuditoria } from "@/servidor/auditoria";
import { exigirPapel } from "@/servidor/autorizacao";
import { ehUuid, type Resultado } from "@/servidor/resultado";
import type { StatusDoResgate } from "./loja";

const NAO_ENCONTRADO = { erro: "Voucher não encontrado." };

/** Por que o voucher não pode ser entregue agora; `null` quando pode. */
function avisoDo(status: StatusDoResgate, entregueEm: string | null) {
  switch (status) {
    case "confirmado":
      return null;
    case "entregue":
      return `Este voucher já foi entregue em ${formatarDataHora(entregueEm ?? "")}.`;
    case "cancelado":
      return "Este voucher foi cancelado e não pode ser entregue.";
    case "falhou":
      return "Este resgate falhou on-chain e não vale como voucher.";
    case "submetido":
    case "assinado":
      return "Este resgate ainda não foi confirmado on-chain. Não entregue por enquanto.";
  }
}

export async function validarVoucher({ banco }: Pick<Dependencias, "banco">, operador: string, codigo: string) {
  await exigirPapel(banco, operador, "operador");
  const id = codigo.trim().toLowerCase();
  if (!ehUuid(id)) return NAO_ENCONTRADO;

  const { data, error } = await banco
    .from("resgates")
    .select(
      "id, status, entregue_em, beneficios(nome, descricao, categoria), perfis!resgates_perfil_id_fkey(titulares!titulares_perfil_id_fkey(nome_completo))",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`falha ao ler o voucher ${id}: ${error.message}`);
  if (!data) return NAO_ENCONTRADO;

  const aviso = avisoDo(data.status, data.entregue_em);
  return {
    id: data.id,
    status: data.status,
    beneficio: data.beneficios,
    investidor: data.perfis.titulares?.nome_completo ?? "",
    entregueEm: data.entregue_em,
    podeEntregar: aviso === null,
    aviso,
  };
}

/** Só um voucher confirmado é entregue, e uma vez: a troca de status é condicional ao `confirmado`. */
export async function marcarEntrega(
  { banco }: Pick<Dependencias, "banco">,
  operador: string,
  codigo: string,
  { agora = new Date() }: { agora?: Date } = {},
): Promise<Resultado<{ id: string; entregueEm: string }>> {
  const voucher = await validarVoucher({ banco }, operador, codigo);
  if ("erro" in voucher) return voucher;
  if (voucher.aviso) return { erro: voucher.aviso };

  const { data, error } = await banco
    .from("resgates")
    .update({ status: "entregue", entregue_em: agora.toISOString(), entregue_por: operador })
    .eq("id", voucher.id)
    .eq("status", "confirmado")
    .select("id, entregue_em")
    .maybeSingle();
  if (error) throw new Error(`falha ao marcar a entrega do voucher ${voucher.id}: ${error.message}`);
  if (!data?.entregue_em) {
    const atual = await validarVoucher({ banco }, operador, voucher.id);
    const motivo = "erro" in atual ? atual.erro : atual.aviso;
    return { erro: motivo ?? "O voucher mudou enquanto a entrega era registrada." };
  }
  await registrarAuditoria(banco, {
    ator: operador,
    acao: "marcar_entrega",
    entidade: "resgates",
    entidadeId: data.id,
    dados: { beneficio: voucher.beneficio.nome },
  });

  return { id: data.id, entregueEm: data.entregue_em };
}
