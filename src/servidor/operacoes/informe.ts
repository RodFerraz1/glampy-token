import type { Dependencias } from "@/servidor/adaptadores";
import { formatarCpf } from "@/formatacao";
import { consultarRendimentos } from "./apuracoes";

const anoDe = (periodo: number) => Math.floor(periodo / 100);

/** Os rendimentos simulados de um ano-calendário, com o titular, para o PDF. */
export async function montarInforme(
  { banco, cadeia }: Pick<Dependencias, "banco" | "cadeia">,
  perfilId: string,
  ano: number,
) {
  const rendimentos = await consultarRendimentos({ banco, cadeia }, perfilId);
  if (!rendimentos) return { erro: "O informe fica disponível depois que seu cadastro for aprovado." };
  const meses = rendimentos.meses
    .filter(({ periodo }) => anoDe(periodo) === ano)
    .sort((a, b) => a.periodo - b.periodo);
  if (meses.length === 0) return { erro: `Não há apurações em ${ano}.` };

  const { data: titular, error } = await banco
    .from("titulares")
    .select("nome_completo, cpf")
    .eq("perfil_id", perfilId)
    .single();
  if (error) throw new Error(`falha ao ler o titular do informe: ${error.message}`);

  return {
    ano,
    titular: { nome: titular.nome_completo, cpf: formatarCpf(titular.cpf) },
    posicao: rendimentos.posicao,
    meses,
    totalCentavos: meses.reduce((total, { recebidoCentavos }) => total + recebidoCentavos, 0),
  };
}

export type Informe = Exclude<Awaited<ReturnType<typeof montarInforme>>, { erro: string }>;

/** Os anos-calendário que têm apuração, e portanto informe. */
export const anosComApuracao = (meses: { periodo: number }[]) =>
  [...new Set(meses.map(({ periodo }) => anoDe(periodo)))].sort((a, b) => a - b);

export async function anosDoInforme(dependencias: Pick<Dependencias, "banco" | "cadeia">, perfilId: string) {
  return anosComApuracao((await consultarRendimentos(dependencias, perfilId))?.meses ?? []);
}

