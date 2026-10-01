"use server";

import { refresh } from "next/cache";
import { obterDependencias } from "@/servidor/dependencias";
import { decidirCrivo, decidirPreferencia } from "@/servidor/operacoes/decisoes-da-revenda";
import { lerIdDaOferta } from "@/servidor/operacoes/revenda";
import { exigirArea } from "@/servidor/sessao";

export type EstadoDaDecisao = { erro?: string; motivo?: string };


export async function preferencia(id: string, decisao: "exercer" | "recusar"): Promise<EstadoDaDecisao> {
  const usuario = await exigirArea("administrador");
  const resultado = await decidirPreferencia(obterDependencias(), usuario.id, lerIdDaOferta(id), { decisao });
  if ("erro" in resultado) return { erro: resultado.erro };
  refresh();
  return {};
}

export async function crivo(
  id: string,
  decisao: "aprovar" | "vetar",
  _anterior: EstadoDaDecisao,
  formulario: FormData,
): Promise<EstadoDaDecisao> {
  const usuario = await exigirArea("administrador");
  const motivo = String(formulario.get("motivo") ?? "");
  const resultado = await decidirCrivo(obterDependencias(), usuario.id, lerIdDaOferta(id), { decisao, motivo });
  if ("erro" in resultado) return { erro: resultado.erro, motivo };
  refresh();
  return {};
}
