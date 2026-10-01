"use server";

import { redirect } from "next/navigation";
import { obterBanco } from "@/servidor/dependencias";
import { marcarEntrega } from "@/servidor/operacoes/voucher";
import { exigirArea } from "@/servidor/sessao";

export type EstadoDaEntrega = { erro?: string };

export async function entregar(codigo: string): Promise<EstadoDaEntrega> {
  const usuario = await exigirArea("operador");
  const resultado = await marcarEntrega({ banco: obterBanco() }, usuario.id, codigo);
  if ("erro" in resultado) return { erro: resultado.erro };
  redirect(`/operador?codigo=${resultado.id}&entregue=1`);
}
