import type { Dependencias } from "@/servidor/adaptadores";
import type { Json } from "@/servidor/adaptadores/tipos-do-banco";
import { exigirPapel } from "@/servidor/autorizacao";

const LIMITE = 200;

/** As ações de administradores e operadores, as mais recentes primeiro, com o e-mail do autor. */
export async function consultarAuditoria(
  { banco }: Pick<Dependencias, "banco">,
  ator: string,
  { acao, entidade }: { acao?: string; entidade?: string } = {},
) {
  await exigirPapel(banco, ator, "administrador");
  let consulta = banco
    .from("auditoria")
    .select("id, ator_id, acao, entidade, entidade_id, dados, criado_em")
    .order("id", { ascending: false })
    .limit(LIMITE);
  if (acao) consulta = consulta.eq("acao", acao);
  if (entidade) consulta = consulta.eq("entidade", entidade);
  const { data, error } = await consulta;
  if (error) throw new Error(`falha ao consultar a auditoria: ${error.message}`);

  const autores = new Map<string, string>();
  for (const id of new Set(data.flatMap(({ ator_id }) => (ator_id ? [ator_id] : [])))) {
    const { data: usuario } = await banco.auth.admin.getUserById(id);
    autores.set(id, usuario.user?.email ?? id);
  }

  return data.map((registro) => ({
    id: registro.id,
    autor: registro.ator_id ? (autores.get(registro.ator_id) ?? registro.ator_id) : "Sistema",
    acao: registro.acao,
    entidade: registro.entidade,
    entidadeId: registro.entidade_id,
    dados: registro.dados as Json,
    em: registro.criado_em,
  }));
}

export async function opcoesDaAuditoria({ banco }: Pick<Dependencias, "banco">, ator: string) {
  await exigirPapel(banco, ator, "administrador");
  const { data, error } = await banco.rpc("opcoes_da_auditoria");
  if (error) throw new Error(`falha ao ler os filtros da auditoria: ${error.message}`);
  const de = (tipo: string) => data.filter((opcao) => opcao.tipo === tipo).map(({ valor }) => valor).sort();
  return { acoes: de("acao"), entidades: de("entidade") };
}
