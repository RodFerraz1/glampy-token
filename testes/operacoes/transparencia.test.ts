import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import type { Hash } from "viem";
import type { Chamada } from "@/servidor/adaptadores/conta-inteligente";
import { decidirCrivo, decidirPreferencia } from "@/servidor/operacoes/decisoes-da-revenda";
import { abrirPedido, analisarPedido, anunciarReatribuicao } from "@/servidor/operacoes/reatribuicao";
import { prepararIndicacao, prepararOferta, registrarIndicacao, registrarOferta } from "@/servidor/operacoes/revenda";
import { consultarTransparencia } from "@/servidor/operacoes/transparencia";
import type { Resultado } from "@/servidor/resultado";
import { catalogoPublicado, investidorComCredito, prepararAmbiente, type Ambiente } from "../ambiente";

describe("transparência pública", () => {
  let ambiente: Ambiente;
  let administrador: { id: string };
  let hashDoCatalogo: string;
  before(async () => {
    ambiente = await prepararAmbiente();
    ({ administrador } = await catalogoPublicado(ambiente, [100_00]));
    hashDoCatalogo = await ambiente.cadeia.ibitiPass.read.catalogoDaVersao([1]);

    type Investidor = Awaited<ReturnType<typeof investidorComCredito>>;
    const executar = async <T extends object>(
      investidor: Investidor,
      preparo: Resultado<{ chamadas: Chamada[] }>,
      registrar: (txHash: Hash) => Promise<Resultado<T>>,
    ) => {
      assert.ok(!("erro" in preparo));
      const registro = await registrar(await ambiente.contaInteligente.executar(investidor.carteira, preparo.chamadas));
      assert.ok(!("erro" in registro));
      return registro;
    };
    const vendedor = await investidorComCredito(ambiente, 4n, { nomeCompleto: "Nome Que Não Aparece" });
    const comprador = await investidorComCredito(ambiente, 1n);
    for (const decisao of ["aprovar", "vetar"] as const) {
      const { id } = await executar(
        vendedor,
        await prepararOferta(ambiente, vendedor.id, { quantidade: 1, precoCentavos: 50_000_00 }),
        (txHash) => registrarOferta(ambiente, vendedor.id, { txHash }),
      );
      await decidirPreferencia(ambiente, administrador.id, id, { decisao: "recusar" });
      await executar(vendedor, await prepararIndicacao(ambiente, vendedor.id, { id, comprador: comprador.carteira }), (txHash) =>
        registrarIndicacao(ambiente, vendedor.id, { txHash }),
      );
      assert.ok(!("erro" in (await decidirCrivo(ambiente, administrador.id, id, { decisao, motivo: "Motivo sigiloso" }))));
    }

    const pedido = await abrirPedido(ambiente, comprador.id, {
      motivo: "sucessao",
      carteiraDeOrigem: vendedor.carteira,
      justificativa: "Justificativa sigilosa",
    });
    assert.ok(!("erro" in pedido));
    await analisarPedido(ambiente, administrador.id, pedido.id, { status: "em_analise", parecer: "" });
    assert.ok(!("erro" in (await anunciarReatribuicao(ambiente, administrador.id, pedido.id))));
  });

  it("mostra os contratos com link para o explorador", async () => {
    const { contratos } = await consultarTransparencia(ambiente);

    const token = contratos.find(({ nome }) => nome === "TokenRoyalty");
    assert.ok(token);
    assert.equal(token.endereco.toLowerCase(), ambiente.cadeia.token.address.toLowerCase());
    assert.equal(token.link, `https://sepolia.etherscan.io/address/${token.endereco}`);
    assert.equal(contratos.length, 9);
  });

  it("mostra o número de detentores e os tokens em circulação, sem identificar ninguém", async () => {
    const transparencia = await consultarTransparencia(ambiente);

    assert.equal(transparencia.detentores, Number(await ambiente.cadeia.conformidade.read.totalDeDetentores()));
    // 4 + 1 vendidos na oferta; a reatribuição anunciada ainda não moveu nada.
    assert.equal(transparencia.emCirculacao, 5n);
    const texto = JSON.stringify(transparencia, (_, valor) => (typeof valor === "bigint" ? valor.toString() : valor));
    for (const sigilo of ["Nome Que Não Aparece", "Motivo sigiloso", "Justificativa sigilosa"]) {
      assert.ok(!texto.includes(sigilo), sigilo);
    }
  });

  it("monta o registro de decisões a partir dos eventos on-chain, o mais recente primeiro", async () => {
    const { decisoes, versoesDoCatalogo } = await consultarTransparencia(ambiente);

    assert.deepEqual(
      decisoes.map(({ tipo }) => tipo),
      ["reatribuicao_anunciada", "comprador_vetado", "comprador_aprovado", "catalogo_publicado"],
    );
    assert.ok(decisoes.every(({ em }) => em instanceof Date));
    assert.ok(decisoes.every(({ txHash }) => /^0x[0-9a-f]{64}$/.test(txHash)));
    assert.deepEqual(
      versoesDoCatalogo.map(({ versao, hashTabela }) => ({ versao, hashTabela })),
      [{ versao: 1, hashTabela: hashDoCatalogo }],
    );
  });
});
