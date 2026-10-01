"use server";

import { refresh } from "next/cache";
import type { Passkey } from "@/carteira/safe";
import { obterDependencias } from "@/servidor/dependencias";
import { abrirPedido } from "@/servidor/operacoes/reatribuicao";
import { exigirArea } from "@/servidor/sessao";

export type EstadoDoPedido = { erro?: string; carteira?: string; justificativa?: string; aberto?: boolean };

export async function abrirSucessao(_anterior: EstadoDoPedido, formulario: FormData): Promise<EstadoDoPedido> {
  const usuario = await exigirArea("investidor");
  const carteira = String(formulario.get("carteira") ?? "");
  const justificativa = String(formulario.get("justificativa") ?? "");
  const resultado = await abrirPedido(obterDependencias(), usuario.id, {
    motivo: "sucessao",
    carteiraDeOrigem: carteira,
    justificativa,
  });
  if ("erro" in resultado) return { erro: resultado.erro, carteira, justificativa };
  refresh();
  return { aberto: true };
}

export async function abrirPerdaDeAcesso(passkey: Passkey, justificativa: string): Promise<EstadoDoPedido> {
  const usuario = await exigirArea("investidor");
  const resultado = await abrirPedido(obterDependencias(), usuario.id, { motivo: "perda_de_acesso", passkey, justificativa });
  if ("erro" in resultado) return { erro: resultado.erro, justificativa };
  refresh();
  return { aberto: true };
}
