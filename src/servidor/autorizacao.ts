import type { Banco } from "./adaptadores/banco";
import type { ClienteDaSessao } from "./adaptadores/sessao";
import type { Database } from "./adaptadores/tipos-do-banco";

export type Papel = Database["public"]["Enums"]["papel_usuario"];

export class AcessoNegado extends Error {}

/** Com o cliente da sessão, só lê o próprio perfil. */
export async function papelDe(banco: Banco | ClienteDaSessao, perfilId: string): Promise<Papel | null> {
  const { data, error } = await banco.from("perfis").select("papel").eq("id", perfilId).maybeSingle();
  if (error) throw new Error(`falha ao ler o papel do perfil ${perfilId}: ${error.message}`);
  return data?.papel ?? null;
}

/** Primeira linha de toda operação restrita a um papel. */
export async function exigirPapel(banco: Banco, perfilId: string, papel: Papel) {
  if ((await papelDe(banco, perfilId)) !== papel) {
    throw new AcessoNegado(`operação restrita ao papel ${papel}`);
  }
}
