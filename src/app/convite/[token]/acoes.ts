"use server";

import { redirect } from "next/navigation";
import { obterBanco } from "@/servidor/dependencias";
import { criarConta } from "@/servidor/operacoes/cadastro";
import { entrar } from "@/servidor/operacoes/entrar";
import { clienteDaSessao } from "@/servidor/sessao";

export type EstadoDaConta = { erro?: string };

export async function criarContaNoConvite(token: string, _anterior: EstadoDaConta, formulario: FormData): Promise<EstadoDaConta> {
  const email = String(formulario.get("email") ?? "");
  const senha = String(formulario.get("senha") ?? "");
  if (senha !== String(formulario.get("confirmacao") ?? "")) return { erro: "As senhas não conferem." };

  const resultado = await criarConta({ banco: obterBanco() }, { token, email, senha });
  if ("erro" in resultado) return { erro: resultado.erro };

  const sessao = await entrar(await clienteDaSessao(), { email, senha });
  if ("erro" in sessao) throw new Error("a conta recém-criada não conseguiu entrar");
  redirect("/investidor/cadastro");
}
