"use server";

import { refresh } from "next/cache";
import { lerReais } from "@/formatacao";
import { obterBanco, obterDependencias } from "@/servidor/dependencias";
import {
  criarBeneficio,
  editarBeneficio,
  importarVersaoInicial,
  publicarCatalogo,
  type DadosDoBeneficio,
} from "@/servidor/operacoes/catalogo";
import { exigirArea } from "@/servidor/sessao";

export type ValoresDoBeneficio = Record<"nome" | "descricao" | "categoria" | "imagemUrl" | "precoTabela", string> & {
  ativo: boolean;
};

export type EstadoDoBeneficio = { erro?: string; valores?: ValoresDoBeneficio };

export type EstadoDaPublicacao = { erro?: string; mensagem?: string };

function valoresDe(formulario: FormData): ValoresDoBeneficio {
  const texto = (campo: string) => String(formulario.get(campo) ?? "");
  return {
    nome: texto("nome"),
    descricao: texto("descricao"),
    categoria: texto("categoria"),
    imagemUrl: texto("imagemUrl"),
    precoTabela: texto("precoTabela"),
    ativo: formulario.get("ativo") === "sim",
  };
}

const dadosDe = ({ precoTabela, ...valores }: ValoresDoBeneficio): DadosDoBeneficio => ({
  ...valores,
  precoTabelaCentavos: lerReais(precoTabela) ?? 0,
});

export async function salvarBeneficio(
  id: string | null,
  _anterior: EstadoDoBeneficio,
  formulario: FormData,
): Promise<EstadoDoBeneficio> {
  const usuario = await exigirArea("administrador");
  const valores = valoresDe(formulario);
  const dependencias = { banco: obterBanco() };
  const resultado = id
    ? await editarBeneficio(dependencias, usuario.id, id, dadosDe(valores))
    : await criarBeneficio(dependencias, usuario.id, dadosDe(valores));
  if ("erro" in resultado) return { erro: resultado.erro, valores };
  refresh();
  return {};
}

export async function publicar(): Promise<EstadoDaPublicacao> {
  const usuario = await exigirArea("administrador");
  const resultado = await publicarCatalogo(obterDependencias(), usuario.id);
  if ("erro" in resultado) return { erro: resultado.erro };
  refresh();
  return { mensagem: `Versão ${resultado.versao} publicada.` };
}

export async function importarVersao1(): Promise<EstadoDaPublicacao> {
  const usuario = await exigirArea("administrador");
  const resultado = await importarVersaoInicial(obterDependencias(), usuario.id);
  if ("erro" in resultado) return { erro: resultado.erro };
  refresh();
  return { mensagem: `Versão 1 importada, com ${resultado.beneficios} benefícios.` };
}
