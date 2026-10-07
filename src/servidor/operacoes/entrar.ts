import type { ClienteDaSessao } from "@/servidor/adaptadores/sessao";
import { papelDe } from "@/servidor/autorizacao";

/** Abre a sessão no cliente recebido, que é o da requisição, e devolve o papel registrado em `perfis`. */
export async function entrar(sessao: ClienteDaSessao, { email, senha }: { email: string; senha: string }) {
  const { data, error } = await sessao.auth.signInWithPassword({ email, password: senha });
  if (error?.code === "invalid_credentials") return { erro: "E-mail ou senha incorretos." } as const;
  if (error) throw new Error(`falha ao entrar: ${error.message}`);

  const papel = await papelDe(sessao, data.user.id);
  if (!papel) throw new Error(`perfil ausente para o usuário ${data.user.id}`);
  return { papel };
}
