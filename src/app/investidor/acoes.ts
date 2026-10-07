"use server";

import { refresh } from "next/cache";
import { obterBanco } from "@/servidor/dependencias";
import { registrarAceite } from "@/servidor/operacoes/aceite";
import { exigirArea } from "@/servidor/sessao";

export type EstadoDoAceite = { erro?: string };

export async function aceitarDocumentos(_anterior: EstadoDoAceite, formulario: FormData): Promise<EstadoDoAceite> {
  const usuario = await exigirArea("investidor");
  const resultado = await registrarAceite({ banco: obterBanco() }, usuario.id, {
    memorando: formulario.get("memorando") === "aceito",
    riscos: formulario.get("riscos") === "aceito",
  });
  if ("erro" in resultado) return { erro: resultado.erro };
  refresh();
  return {};
}
