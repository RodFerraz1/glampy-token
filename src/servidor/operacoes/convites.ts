import { createHash, randomBytes } from "node:crypto";
import type { Dependencias } from "@/servidor/adaptadores";
import { registrarAuditoria } from "@/servidor/auditoria";
import { exigirPapel } from "@/servidor/autorizacao";

export const VALIDADE_DO_CONVITE_EM_DIAS = 7;
const VALIDADE_EM_MS = VALIDADE_DO_CONVITE_EM_DIAS * 24 * 60 * 60 * 1000;

const hashDoToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Devolve o token uma única vez: o banco guarda só o hash, e o link é montado por quem chama. */
export async function criarConvite(
  { banco }: Pick<Dependencias, "banco">,
  ator: string,
  { email, agora = new Date() }: { email: string; agora?: Date },
) {
  await exigirPapel(banco, ator, "administrador");
  email = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { erro: "Informe um e-mail válido." } as const;

  const token = randomBytes(32).toString("base64url");
  const expiraEm = new Date(agora.getTime() + VALIDADE_EM_MS).toISOString();
  const { data, error } = await banco
    .from("convites")
    .insert({
      email,
      hash_token: hashDoToken(token),
      criado_por: ator,
      criado_em: agora.toISOString(),
      expira_em: expiraEm,
    })
    .select("id")
    .single();
  if (error) throw new Error(`falha ao criar convite: ${error.message}`);
  await registrarAuditoria(banco, { ator, acao: "criar_convite", entidade: "convites", entidadeId: data.id, dados: { email } });

  return { id: data.id, token, expiraEm };
}

export type StatusDoConvite = "pendente" | "usado" | "vencido";

function statusDoConvite({ usado_em, expira_em }: { usado_em: string | null; expira_em: string }, agora: Date): StatusDoConvite {
  if (usado_em) return "usado";
  if (new Date(expira_em) <= agora) return "vencido";
  return "pendente";
}

/** Pública: é o que a página do link consulta antes de mostrar o cadastro. */
export async function validarConvite(
  { banco }: Pick<Dependencias, "banco">,
  token: string,
  { agora = new Date() }: { agora?: Date } = {},
) {
  const { data, error } = await banco
    .from("convites")
    .select("email, usado_em, expira_em")
    .eq("hash_token", hashDoToken(token))
    .maybeSingle();
  if (error) throw new Error(`falha ao validar convite: ${error.message}`);
  if (!data) return { status: "invalido" } as const;

  const status = statusDoConvite(data, agora);
  if (status !== "pendente") return { status };
  return { status, email: data.email };
}

export async function listarConvites(
  { banco }: Pick<Dependencias, "banco">,
  ator: string,
  { agora = new Date() }: { agora?: Date } = {},
) {
  await exigirPapel(banco, ator, "administrador");

  const { data, error } = await banco
    .from("convites")
    .select("id, email, criado_em, expira_em, usado_em")
    .order("criado_em", { ascending: false });
  if (error) throw new Error(`falha ao listar convites: ${error.message}`);

  return data.map((convite) => ({
    id: convite.id,
    email: convite.email,
    criadoEm: convite.criado_em,
    expiraEm: convite.expira_em,
    usadoEm: convite.usado_em,
    status: statusDoConvite(convite, agora),
  }));
}

/** Marca o convite como usado só se ainda estiver livre, e devolve se conseguiu. */
export async function usarConvite({ banco }: Pick<Dependencias, "banco">, token: string, agora: Date) {
  const { data, error } = await banco
    .from("convites")
    .update({ usado_em: agora.toISOString() })
    .eq("hash_token", hashDoToken(token))
    .is("usado_em", null)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`falha ao usar o convite: ${error.message}`);
  return data !== null;
}

export async function liberarConvite({ banco }: Pick<Dependencias, "banco">, token: string) {
  const { error } = await banco.from("convites").update({ usado_em: null }).eq("hash_token", hashDoToken(token));
  if (error) throw new Error(`falha ao liberar o convite: ${error.message}`);
}
