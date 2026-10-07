import type { Cadeia } from "@/servidor/adaptadores/cadeia";

/**
 * Onde estão os 300 tokens: tesouraria, oferta e recolocação são do sistema; o
 * resto está com investidores. Um lote em revenda continua na carteira do vendedor.
 */
export async function distribuicaoDosTokens(cadeia: Cadeia) {
  const tesouraria = await cadeia.token.read.tesouraria();
  const [emissaoTotal, naTesouraria, disponivelNaOferta, disponivelNaRecolocacao] = await Promise.all([
    cadeia.token.read.EMISSAO_TOTAL(),
    cadeia.token.read.balanceOf([tesouraria]),
    cadeia.oferta.read.floatDisponivel(),
    cadeia.recolocacao.read.loteDisponivel(),
  ]);
  return {
    emissaoTotal,
    naTesouraria,
    disponivelNaOferta,
    disponivelNaRecolocacao,
    comInvestidores: emissaoTotal - naTesouraria - disponivelNaOferta - disponivelNaRecolocacao,
  };
}
