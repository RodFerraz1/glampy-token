"use server";

import { refresh } from "next/cache";
import { obterBanco, obterDependencias } from "@/servidor/dependencias";
import {
  aprovarCadastro,
  desabilitarCarteira,
  habilitarCarteira,
  reprovarCadastro,
} from "@/servidor/operacoes/analise-de-cadastro";
import { exigirArea } from "@/servidor/sessao";

export type EstadoDaAnalise = { erro?: string; motivo?: string };

const motivoDe = (formulario: FormData) => String(formulario.get("motivo") ?? "");

// Aprovar e tentar de novo mudam o cadastro mesmo quando a habilitação falha:
// o erro fica gravado na carteira e a página o mostra depois do refresh.

export async function aprovar(titularId: string): Promise<EstadoDaAnalise> {
  const usuario = await exigirArea("administrador");
  const resultado = await aprovarCadastro(obterDependencias(), usuario.id, titularId);
  refresh();
  return "erro" in resultado ? { erro: resultado.erro } : {};
}

export async function tentarDeNovo(titularId: string): Promise<EstadoDaAnalise> {
  const usuario = await exigirArea("administrador");
  const resultado = await habilitarCarteira(obterDependencias(), usuario.id, titularId);
  refresh();
  return "erro" in resultado ? { erro: resultado.erro } : {};
}

export async function reprovar(titularId: string, _anterior: EstadoDaAnalise, formulario: FormData): Promise<EstadoDaAnalise> {
  const usuario = await exigirArea("administrador");
  const motivo = motivoDe(formulario);
  const resultado = await reprovarCadastro({ banco: obterBanco() }, usuario.id, titularId, { motivo });
  if ("erro" in resultado) return { erro: resultado.erro, motivo };
  refresh();
  return {};
}

export async function desabilitar(titularId: string, _anterior: EstadoDaAnalise, formulario: FormData): Promise<EstadoDaAnalise> {
  const usuario = await exigirArea("administrador");
  const motivo = motivoDe(formulario);
  const resultado = await desabilitarCarteira(obterDependencias(), usuario.id, titularId, { motivo });
  if ("erro" in resultado) return { erro: resultado.erro, motivo };
  refresh();
  return {};
}
