"use server";

import type { Hash } from "viem";
import { obterDependencias } from "@/servidor/dependencias";
import {
  confirmarPagamentoSimulado,
  converterParaStablecoin,
  registrarCompra,
} from "@/servidor/operacoes/compra";
import type { OrigemDoEstoque } from "@/servidor/operacoes/consultar-posicao";
import { exigirArea } from "@/servidor/sessao";

// Fora de um inteiro, vira zero, que a operação recusa com a mensagem certa.
const paraQuantidade = (quantidade: number) => (Number.isSafeInteger(quantidade) ? BigInt(quantidade) : 0n);

export async function pagarViaPix(quantidade: number) {
  const usuario = await exigirArea("investidor");
  return confirmarPagamentoSimulado(obterDependencias(), usuario.id, { quantidade: paraQuantidade(quantidade) });
}

export async function converter(quantidade: number) {
  const usuario = await exigirArea("investidor");
  return converterParaStablecoin(obterDependencias(), usuario.id, { quantidade: paraQuantidade(quantidade) });
}

export async function registrar(txHash: Hash, origem: OrigemDoEstoque) {
  const usuario = await exigirArea("investidor");
  return registrarCompra(obterDependencias(), usuario.id, { txHash, origem });
}
