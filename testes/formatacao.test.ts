import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatarCredito, formatarData, formatarDataHora, formatarReais, formatarStable, lerReais } from "@/formatacao";

// Intl separa "R$" do número com espaço não separável.
const semEspacoEspecial = (texto: string) => texto.replace(/ /g, " ");

describe("formatação", () => {
  it("formata centavos em reais no padrão brasileiro", () => {
    assert.equal(semEspacoEspecial(formatarReais(123456780)), "R$ 1.234.567,80");
    assert.equal(semEspacoEspecial(formatarReais(5)), "R$ 0,05");
  });

  it("formata em reais um valor do BRLStableMock, de 6 casas", () => {
    assert.equal(semEspacoEspecial(formatarStable(32_641_780_000n)), "R$ 32.641,78");
    assert.equal(semEspacoEspecial(formatarStable(3n * 32_641_780_000n)), "R$ 97.925,34");
  });

  it("formata a data no fuso de Brasília", () => {
    assert.equal(formatarData(new Date("2026-10-01T02:30:00Z")), "30/09/2026");
    assert.equal(formatarData("2026-10-01T03:00:00Z"), "01/10/2026");
  });

  it("mantém o dia de uma data sem hora", () => {
    assert.equal(formatarData("2027-04-01"), "01/04/2027");
  });

  it("formata data e hora no fuso de Brasília", () => {
    assert.equal(formatarDataHora("2026-10-01T02:30:00Z"), "30/09/2026, 23:30");
  });

  it("formata o crédito IbitiPass, de 18 casas, com até duas decimais", () => {
    assert.equal(formatarCredito(1_500_000_000_000_000_000n), "1,5");
    assert.equal(formatarCredito(2_666_666_666_666_666_666n), "2,67");
    assert.equal(formatarCredito(1_234n * 10n ** 18n), "1.234");
    assert.equal(formatarCredito(0n), "0");
  });

  it("lê em centavos um valor em reais digitado no padrão brasileiro", () => {
    assert.equal(lerReais("1.500,50"), 150_050);
    assert.equal(lerReais("R$ 1.500"), 150_000);
    assert.equal(lerReais("300"), 30_000);
    assert.equal(lerReais("0,5"), 50);
    assert.equal(lerReais("1.500.000"), 150_000_000);
  });

  it("aceita ponto decimal quando não há vírgula e o ponto tem até duas casas depois", () => {
    assert.equal(lerReais("150.50"), 15_050);
    assert.equal(lerReais("2.5"), 250);
    assert.equal(lerReais("1.500"), 150_000);
    for (const invalido of ["", "abc", "1,234", "-10", "1.5.0,00x"]) assert.equal(lerReais(invalido), null);
  });
});
