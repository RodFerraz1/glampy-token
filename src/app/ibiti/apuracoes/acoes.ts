"use server";

import { refresh } from "next/cache";
import { lerReais } from "@/formatacao";
import { obterBanco } from "@/servidor/dependencias";
import { registrarApuracao } from "@/servidor/operacoes/apuracoes";
import { exigirArea } from "@/servidor/sessao";

export async function registrar(periodo: number, formulario: FormData) {
  const usuario = await exigirArea("administrador");
  const relatorio = formulario.get("relatorio");
  const resultado = await registrarApuracao({ banco: obterBanco() }, usuario.id, {
    periodo,
    faturamentoCentavos: lerReais(String(formulario.get("faturamento") ?? "")) ?? 0,
    relatorio: relatorio instanceof File ? new Uint8Array(await relatorio.arrayBuffer()) : new Uint8Array(),
  });
  if (!("erro" in resultado)) refresh();
  return resultado;
}
