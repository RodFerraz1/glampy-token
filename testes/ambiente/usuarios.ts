import { createClient } from "@supabase/supabase-js";
import type { Banco } from "@/servidor/adaptadores/banco";
import type { ClienteDaSessao } from "@/servidor/adaptadores/sessao";
import type { Database } from "@/servidor/adaptadores/tipos-do-banco";
import type { Papel } from "@/servidor/autorizacao";
import { exigir } from ".";

export { bancoDeTeste } from ".";

/** Cliente com a chave pública, como o do navegador: só enxerga o que a RLS libera. */
export const novoClienteDeSessao = (): ClienteDaSessao =>
  createClient<Database>(exigir("SUPABASE_URL_TESTE"), exigir("SUPABASE_CHAVE_PUBLICA_TESTE"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

export async function criarUsuario(banco: Banco, papel: Papel) {
  const email = `${papel}-${crypto.randomUUID()}@teste.local`;
  const senha = crypto.randomUUID();
  const { data, error } = await banco.auth.admin.createUser({ email, password: senha, email_confirm: true });
  if (error) throw error;
  const { error: erroDoPapel } = await banco.from("perfis").update({ papel }).eq("id", data.user.id);
  if (erroDoPapel) throw erroDoPapel;
  return { id: data.user.id, email, senha };
}
