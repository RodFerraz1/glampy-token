import { formatUnits } from "viem";

const FUSO_DE_BRASILIA = "America/Sao_Paulo";

const formatoDeReais = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatoDeCredito = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const formatoDeDataHora = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: FUSO_DE_BRASILIA,
});
const formatoDeData = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: FUSO_DE_BRASILIA });
// Uma coluna `date` ("2027-04-01") vira meia-noite UTC, que em Brasília ainda é o dia anterior.
const formatoDeDiaDoCalendario = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" });

export const formatarCpf = (cpf: string) => `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;

export const formatarTokens = (quantidade: bigint | number) =>
  BigInt(quantidade) === 1n ? "1 token" : `${quantidade} tokens`;

export const formatarReais = (centavos: number) => formatoDeReais.format(centavos / 100);

/** Valor no BRLStableMock, que tem 6 casas decimais. */
export const formatarStable = (valor: bigint) => formatoDeReais.format(Number(formatUnits(valor, 6)));

/** Crédito IbitiPass, que tem 18 casas decimais como um ERC-20. */
export const formatarCredito = (valor: bigint) => formatoDeCredito.format(Number(formatUnits(valor, 18)));

export function formatarData(valor: Date | string) {
  if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return formatoDeDiaDoCalendario.format(new Date(valor));
  }
  return formatoDeData.format(new Date(valor));
}

export const formatarDataHora = (valor: Date | string) => formatoDeDataHora.format(new Date(valor));

/**
 * Um valor digitado em reais ("1.500,50", "R$ 300") em centavos, ou `null` se
 * não for um valor. Sem vírgula, um ponto seguido de uma ou duas casas no fim
 * ("150.50") é decimal; com três, é milhar ("1.500").
 */
export function lerReais(texto: string) {
  const limpo = texto.replace("R$", "").trim();
  const numero = /^\d+\.\d{1,2}$/.test(limpo) ? limpo : limpo.replaceAll(".", "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(numero)) return null;
  return Math.round(Number(numero) * 100);
}
