"use server";

import { redirect } from "next/navigation";
import { AREAS } from "@/areas";
import { entrar } from "@/servidor/operacoes/entrar";
import { clienteDaSessao } from "@/servidor/sessao";

export type EstadoDoLogin = { erro?: string; email?: string };

export async function entrarNaPlataforma(_anterior: EstadoDoLogin, formulario: FormData): Promise<EstadoDoLogin> {
  const email = String(formulario.get("email") ?? "").trim();
  const senha = String(formulario.get("senha") ?? "");
  if (!email || !senha) return { erro: "Informe e-mail e senha.", email };

  const resultado = await entrar(await clienteDaSessao(), { email, senha });
  if ("erro" in resultado) return { erro: resultado.erro, email };
  redirect(AREAS[resultado.papel].caminho);
}

export async function sair() {
  const cliente = await clienteDaSessao();
  await cliente.auth.signOut();
  redirect("/entrar");
}
