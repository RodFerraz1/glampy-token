import { PRIMEIRO_PERIODO, sucessorDe, ULTIMO_PERIODO } from "@/calendario-da-oferta";
import { ALIQUOTA_DO_ROYALTY_PERCENTUAL, TOKENS_EMITIDOS } from "@/royalty";

/** Ke do Memorando V2 (§6.3), a mesma taxa que precificou a emissão. */
export const TAXA_DE_DESCONTO_ANUAL = 0.183;

/** O Memorando (§12.3) projeta a revenda pela média dos últimos doze meses apurados. */
const MESES_DA_MEDIA = 12;

/**
 * Receita bruta projetada por ciclo no Memorando V2 (§6.4): tendas × diária ×
 * ocupação × 365 dias. O memorando mostra os totais arredondados em milhões.
 */
export const PROJECAO_DO_MEMORANDO = [
  { ciclo: 1, tendas: 6, diariaCentavos: 7_333_00, ocupacao: 0.5 },
  { ciclo: 2, tendas: 20, diariaCentavos: 8_066_00, ocupacao: 0.45 },
  { ciclo: 3, tendas: 20, diariaCentavos: 8_873_00, ocupacao: 0.5 },
  { ciclo: 4, tendas: 20, diariaCentavos: 9_760_00, ocupacao: 0.55 },
].map((ciclo) => ({ ...ciclo, receitaBrutaCentavos: ciclo.tendas * ciclo.diariaCentavos * ciclo.ocupacao * 365 }));

const PERIODOS_DA_VIGENCIA = (() => {
  const periodos = [];
  for (let periodo = PRIMEIRO_PERIODO; periodo <= ULTIMO_PERIODO; periodo = sucessorDe(periodo)) periodos.push(periodo);
  return periodos;
})();

const indiceDoMes = (periodo: number) => Math.floor(periodo / 100) * 12 + (periodo % 100);

/**
 * Valor presente do royalty que o lote ainda vai receber até março de 2031.
 * O fluxo mensal por token é a média dos últimos doze meses apurados ou, sem
 * nenhuma apuração, a projeção do memorando para o ciclo do mês. O royalty de
 * um mês chega no seguinte, e é descontado por (1 + 18,30%)^(k/12), com k em
 * meses a partir de hoje, ou da última apuração, se ela for posterior.
 */
export function calcularValorDeReferencia({
  apuracoes,
  quantidade,
  hoje = new Date(),
}: {
  apuracoes: { periodo: number; valorPorTokenCentavos: number }[];
  quantidade: number;
  hoje?: Date;
}) {
  const recentes = [...apuracoes].sort((a, b) => b.periodo - a.periodo).slice(0, MESES_DA_MEDIA);
  const ultima = recentes[0]?.periodo ?? 0;
  const media =
    recentes.length > 0
      ? recentes.reduce((total, { valorPorTokenCentavos }) => total + valorPorTokenCentavos, 0) / recentes.length
      : null;
  const dataBase = Math.max(hoje.getFullYear() * 12 + hoje.getMonth() + 1, ultima ? indiceDoMes(ultima) : 0);

  const meses = PERIODOS_DA_VIGENCIA.filter((periodo) => periodo > ultima).map((periodo) => {
    const ciclo = PROJECAO_DO_MEMORANDO[Math.floor(PERIODOS_DA_VIGENCIA.indexOf(periodo) / 12)];
    const fluxoPorTokenCentavos =
      media ?? (ciclo.receitaBrutaCentavos * ALIQUOTA_DO_ROYALTY_PERCENTUAL) / 100 / TOKENS_EMITIDOS / 12;
    const k = Math.max(1, indiceDoMes(periodo) - dataBase + 1);
    const fator = 1 / (1 + TAXA_DE_DESCONTO_ANUAL) ** (k / 12);
    return { periodo, k, fluxoPorTokenCentavos, fator, valorPresenteCentavos: fluxoPorTokenCentavos * fator };
  });
  const porToken = meses.reduce((total, { valorPresenteCentavos }) => total + valorPresenteCentavos, 0);

  return {
    origem: media === null ? ("memorando" as const) : ("apuracoes" as const),
    taxaAnual: TAXA_DE_DESCONTO_ANUAL,
    mesesDaMedia: recentes.length,
    meses,
    porTokenCentavos: Math.round(porToken),
    totalCentavos: Math.round(porToken * quantidade),
  };
}
