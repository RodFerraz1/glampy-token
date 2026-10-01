/** O royalty é 15% da receita bruta, dividido entre os 300 tokens emitidos. */
export const ALIQUOTA_DO_ROYALTY_PERCENTUAL = 15;
export const TOKENS_EMITIDOS = 300;

/** Royalty de 15% do faturamento, dividido pelos 300 tokens, com 6 casas de centavo como a coluna. */
export function calcularApuracao(faturamentoCentavos: number) {
  const royaltyCentavos = Math.round((faturamentoCentavos * ALIQUOTA_DO_ROYALTY_PERCENTUAL) / 100);
  return { royaltyCentavos, valorPorTokenCentavos: Number((royaltyCentavos / TOKENS_EMITIDOS).toFixed(6)) };
}
