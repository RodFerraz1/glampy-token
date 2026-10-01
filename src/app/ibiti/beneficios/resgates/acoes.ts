"use server";

import { refresh } from "next/cache";
import { obterBanco } from "@/servidor/dependencias";
import { cancelarResgate } from "@/servidor/operacoes/gestao-de-resgates";
import { exigirArea } from "@/servidor/sessao";

export type EstadoDoCancelamento = { erro?: string; motivo?: string };

export async function cancelar(
  resgateId: string,
  _anterior: EstadoDoCancelamento,
  formulario: FormData,
): Promise<EstadoDoCancelamento> {
  const usuario = await exigirArea("administrador");
  const motivo = String(formulario.get("motivo") ?? "");
  const resultado = await cancelarResgate({ banco: obterBanco() }, usuario.id, resgateId, { motivo });
  if ("erro" in resultado) return { erro: resultado.erro, motivo };
  refresh();
  return {};
}
