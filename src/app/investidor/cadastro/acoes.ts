"use server";

import { redirect } from "next/navigation";
import type { Passkey } from "@/carteira/safe";
import { obterBanco, obterDependencias } from "@/servidor/dependencias";
import { enviarCadastro, type DadosDoCadastro } from "@/servidor/operacoes/cadastro";
import { criarCarteira } from "@/servidor/operacoes/carteira";
import { exigirArea } from "@/servidor/sessao";

export type EstadoDoCadastro = { erro?: string; valores?: Omit<DadosDoCadastro, "agora"> };

export async function enviarParaAnalise(_anterior: EstadoDoCadastro, formulario: FormData): Promise<EstadoDoCadastro> {
  const usuario = await exigirArea("investidor");
  const valores: Omit<DadosDoCadastro, "agora"> = {
    nomeCompleto: String(formulario.get("nomeCompleto") ?? ""),
    cpf: String(formulario.get("cpf") ?? ""),
    dataNascimento: String(formulario.get("dataNascimento") ?? ""),
    telefone: String(formulario.get("telefone") ?? ""),
    declaracaoAceita: formulario.get("declaracao") === "aceita",
  };

  const resultado = await enviarCadastro({ banco: obterBanco() }, usuario.id, valores);
  if ("erro" in resultado) return { erro: resultado.erro, valores };
  redirect("/investidor?enviado=1");
}

export async function registrarCarteira(passkey: Passkey) {
  const usuario = await exigirArea("investidor");
  return criarCarteira(obterDependencias(), usuario.id, passkey);
}
