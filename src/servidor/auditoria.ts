import type { Banco } from "./adaptadores/banco";
import type { Json } from "./adaptadores/tipos-do-banco";

export interface RegistroDeAuditoria {
  /** Perfil do administrador ou operador que agiu. */
  ator: string;
  acao: string;
  entidade: string;
  entidadeId?: string;
  dados?: NonNullable<Json>;
}

export async function registrarAuditoria(
  banco: Banco,
  { ator, acao, entidade, entidadeId, dados = {} }: RegistroDeAuditoria,
) {
  const { error } = await banco.from("auditoria").insert({
    ator_id: ator,
    acao,
    entidade,
    entidade_id: entidadeId ?? null,
    dados,
  });
  if (error) throw new Error(`falha ao registrar auditoria de ${acao}: ${error.message}`);
}
