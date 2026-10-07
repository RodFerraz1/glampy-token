"use server";

import type { Hash } from "viem";
import { lerReais } from "@/formatacao";
import { obterDependencias } from "@/servidor/dependencias";
import {
  lerIdDaOferta,
  pagarLiquidacao,
  prepararCancelamento,
  prepararIndicacao,
  prepararOferta,
  registrarCancelamento,
  registrarIndicacao,
  registrarLiquidacao,
  registrarOferta,
} from "@/servidor/operacoes/revenda";
import { exigirArea } from "@/servidor/sessao";


export async function prepararAOferta(quantidade: number, preco: string) {
  const usuario = await exigirArea("investidor");
  return prepararOferta(obterDependencias(), usuario.id, { quantidade, precoCentavos: lerReais(preco) ?? 0 });
}

export async function registrarAOferta(txHash: Hash) {
  const usuario = await exigirArea("investidor");
  const registro = await registrarOferta(obterDependencias(), usuario.id, { txHash });
  return "erro" in registro ? registro : { id: registro.id.toString() };
}

export async function prepararOCancelamento(id: string) {
  const usuario = await exigirArea("investidor");
  return prepararCancelamento(obterDependencias(), usuario.id, { id: lerIdDaOferta(id) });
}

export async function registrarOCancelamento(txHash: Hash) {
  const usuario = await exigirArea("investidor");
  const registro = await registrarCancelamento(obterDependencias(), usuario.id, { txHash });
  return "erro" in registro ? registro : { id: registro.id.toString() };
}

export async function prepararAIndicacao(id: string, comprador: string) {
  const usuario = await exigirArea("investidor");
  return prepararIndicacao(obterDependencias(), usuario.id, { id: lerIdDaOferta(id), comprador });
}

export async function registrarAIndicacao(txHash: Hash) {
  const usuario = await exigirArea("investidor");
  const registro = await registrarIndicacao(obterDependencias(), usuario.id, { txHash });
  return "erro" in registro ? registro : { id: registro.id.toString() };
}

export async function pagarALiquidacao(id: string, preco: string) {
  const usuario = await exigirArea("investidor");
  return pagarLiquidacao(obterDependencias(), usuario.id, { id: lerIdDaOferta(id), precoCentavos: lerReais(preco) ?? 0 });
}

export async function registrarALiquidacao(txHash: Hash) {
  const usuario = await exigirArea("investidor");
  const registro = await registrarLiquidacao(obterDependencias(), usuario.id, { txHash });
  return "erro" in registro ? registro : { id: registro.id.toString() };
}
