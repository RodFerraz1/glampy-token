/**
 * Datas do Memorando V2 (§2), exibidas ao investidor. Não são lidas dos
 * contratos: a v2 publicada conta a vigência de janeiro a dezembro, e a
 * divergência está declarada no roadmap.
 */
export const CALENDARIO_DA_OFERTA = {
  fimDaOferta: "2026-12-31",
  inicioDosDireitos: "2027-04-01",
  fimDosDireitos: "2031-03-31",
};

/** Apurações mensais simuladas, de abril de 2027 a março de 2031, em AAAAMM. */
export const PRIMEIRO_PERIODO = 202704;
export const ULTIMO_PERIODO = 203103;
export const TOTAL_DE_PERIODOS = 48;

export const sucessorDe = (periodo: number) => (periodo % 100 === 12 ? periodo + 89 : periodo + 1);

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export const formatarPeriodo = (periodo: number) => `${MESES[(periodo % 100) - 1]} de ${Math.floor(periodo / 100)}`;
