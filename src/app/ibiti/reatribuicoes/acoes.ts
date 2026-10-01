"use server";

import { refresh } from "next/cache";
import { obterBanco, obterDependencias } from "@/servidor/dependencias";
import {
  analisarPedido,
  anunciarReatribuicao,
  cancelarAnunciada,
  executarReatribuicao,
} from "@/servidor/operacoes/reatribuicao";
import { exigirArea } from "@/servidor/sessao";

export type EstadoDaAnalise = { erro?: string; parecer?: string };

export async function analisar(
  id: string,
  status: "em_analise" | "recusada" | "cancelada",
  _anterior: EstadoDaAnalise,
  formulario: FormData,
): Promise<EstadoDaAnalise> {
  const usuario = await exigirArea("administrador");
  const parecer = String(formulario.get("parecer") ?? "");
  const resultado = await analisarPedido({ banco: obterBanco() }, usuario.id, id, { status, parecer });
  if ("erro" in resultado) return { erro: resultado.erro, parecer };
  refresh();
  return {};
}

export async function anunciar(id: string): Promise<EstadoDaAnalise> {
  const usuario = await exigirArea("administrador");
  const resultado = await anunciarReatribuicao(obterDependencias(), usuario.id, id);
  if ("erro" in resultado) return { erro: resultado.erro };
  refresh();
  return {};
}

export async function executar(id: string): Promise<EstadoDaAnalise> {
  const usuario = await exigirArea("administrador");
  const resultado = await executarReatribuicao(obterDependencias(), usuario.id, id);
  if ("erro" in resultado) return { erro: resultado.erro };
  refresh();
  return {};
}

export async function cancelarNaCadeia(id: string, _anterior: EstadoDaAnalise, formulario: FormData): Promise<EstadoDaAnalise> {
  const usuario = await exigirArea("administrador");
  const parecer = String(formulario.get("parecer") ?? "");
  const resultado = await cancelarAnunciada(obterDependencias(), usuario.id, id, { parecer });
  if ("erro" in resultado) return { erro: resultado.erro, parecer };
  refresh();
  return {};
}
