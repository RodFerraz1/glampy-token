"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { obterBanco } from "@/servidor/dependencias";
import { criarConvite } from "@/servidor/operacoes/convites";
import { exigirArea } from "@/servidor/sessao";

export type EstadoDoConvite = { erro?: string; email?: string; link?: string };

export async function convidarInvestidor(_anterior: EstadoDoConvite, formulario: FormData): Promise<EstadoDoConvite> {
  const usuario = await exigirArea("administrador");
  const email = String(formulario.get("email") ?? "");

  const resultado = await criarConvite({ banco: obterBanco() }, usuario.id, { email });
  if ("erro" in resultado) return { erro: resultado.erro, email };
  refresh();
  const origem = (await headers()).get("origin");
  return { link: `${origem}/convite/${resultado.token}` };
}
