import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calcularValorDeReferencia, PROJECAO_DO_MEMORANDO, TAXA_DE_DESCONTO_ANUAL } from "@/revenda/referencia";

const SETEMBRO_DE_2026 = new Date("2026-09-15T12:00:00Z");
const desconto = (k: number) => 1 / (1 + TAXA_DE_DESCONTO_ANUAL) ** (k / 12);

describe("valor de referência da revenda", () => {
  it("sem apurações, projeta os 48 meses pelo memorando e desconta a 18,30% ao ano a partir de hoje", () => {
    const referencia = calcularValorDeReferencia({ apuracoes: [], quantidade: 2, hoje: SETEMBRO_DE_2026 });

    assert.equal(referencia.origem, "memorando");
    assert.equal(referencia.meses.length, 48);
    const [abril] = referencia.meses;
    assert.equal(abril.periodo, 202704);
    // O royalty de abril de 2027 chega em maio: 8 meses depois de setembro de 2026.
    assert.equal(abril.k, 8);
    assert.equal(abril.fator, desconto(8));
    const [ano1, ano2] = PROJECAO_DO_MEMORANDO;
    assert.equal(abril.fluxoPorTokenCentavos, (ano1.receitaBrutaCentavos * 0.15) / 300 / 12);
    assert.equal(referencia.meses[12].fluxoPorTokenCentavos, (ano2.receitaBrutaCentavos * 0.15) / 300 / 12);
    const valorPresente = referencia.meses.reduce((total, mes) => total + mes.fluxoPorTokenCentavos * desconto(mes.k), 0);
    assert.equal(referencia.porTokenCentavos, Math.round(valorPresente));
    assert.equal(referencia.totalCentavos, Math.round(2 * valorPresente));
    // O memorando desconta por ciclo, a partir de abril de 2027, e chega a R$ 32.641,78.
    assert.ok(referencia.porTokenCentavos > 28_000_00 && referencia.porTokenCentavos < 34_000_00);
  });

  it("com apurações, projeta os meses restantes pela média dos últimos doze apurados", () => {
    const apuracoes = Array.from({ length: 14 }, (_, i) => ({
      periodo: i < 9 ? 202704 + i : 202801 + (i - 9),
      valorPorTokenCentavos: i < 2 ? 9_999_00 : 500_00,
    }));

    const referencia = calcularValorDeReferencia({ apuracoes, quantidade: 1, hoje: SETEMBRO_DE_2026 });

    assert.equal(referencia.origem, "apuracoes");
    assert.equal(referencia.mesesDaMedia, 12);
    assert.equal(referencia.meses[0].periodo, 202806);
    assert.ok(referencia.meses.every(({ fluxoPorTokenCentavos }) => fluxoPorTokenCentavos === 500_00));
    // A última apuração, de maio de 2028, é posterior a hoje: o desconto conta a partir dela.
    assert.equal(referencia.meses[0].k, 2);
  });

  it("depois da última apuração da vigência não resta royalty a receber", () => {
    const referencia = calcularValorDeReferencia({
      apuracoes: [{ periodo: 203103, valorPorTokenCentavos: 1 }],
      quantidade: 3,
      hoje: SETEMBRO_DE_2026,
    });

    assert.deepEqual(referencia.meses, []);
    assert.equal(referencia.totalCentavos, 0);
  });
});
