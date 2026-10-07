"use server";

import type { Hash } from "viem";
import { obterDependencias } from "@/servidor/dependencias";
import { prepararSaque, registrarSaque } from "@/servidor/operacoes/saque";
import { exigirArea } from "@/servidor/sessao";

export async function preparar() {
  const usuario = await exigirArea("investidor");
  return prepararSaque(obterDependencias(), usuario.id);
}

export async function registrar(txHash: Hash) {
  const usuario = await exigirArea("investidor");
  return registrarSaque(obterDependencias(), usuario.id, { txHash });
}
