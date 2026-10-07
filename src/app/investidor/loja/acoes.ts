"use server";

import type { Hash } from "viem";
import { obterDependencias } from "@/servidor/dependencias";
import { prepararResgate, registrarResgate } from "@/servidor/operacoes/loja";
import { exigirArea } from "@/servidor/sessao";

export async function preparar(beneficioId: string) {
  const usuario = await exigirArea("investidor");
  return prepararResgate(obterDependencias(), usuario.id, { beneficioId });
}

export async function registrar(txHash: Hash, beneficioId: string) {
  const usuario = await exigirArea("investidor");
  return registrarResgate(obterDependencias(), usuario.id, { txHash, beneficioId });
}
