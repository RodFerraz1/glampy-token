import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { AcessoNegado } from "@/servidor/autorizacao";
import { decidirPreferencia, listarRevendasParaDecisao } from "@/servidor/operacoes/decisoes-da-revenda";
import { lerOferta, prepararOferta, registrarOferta } from "@/servidor/operacoes/revenda";
import { investidorComCredito, prepararAmbiente, type Ambiente } from "../ambiente";
import { contasLocais } from "../ambiente/rede-local";
import { criarUsuario } from "../ambiente/usuarios";

const PRECO_DO_LOTE_CENTAVOS = 65_000_00;

describe("revenda: preferência do Ibiti", () => {
  let ambiente: Ambiente;
  let administrador: { id: string };
  before(async () => {
    ambiente = await prepararAmbiente();
    administrador = await criarUsuario(ambiente.banco, "administrador");
  });

  async function loteOfertado(quantidade = 2) {
    const vendedor = await investidorComCredito(ambiente, 3n, { nomeCompleto: "Vera Vendedora" });
    const preparo = await prepararOferta(ambiente, vendedor.id, { quantidade, precoCentavos: PRECO_DO_LOTE_CENTAVOS });
    assert.ok(!("erro" in preparo));
    const txHash = await ambiente.contaInteligente.executar(vendedor.carteira, preparo.chamadas);
    const registro = await registrarOferta(ambiente, vendedor.id, { txHash });
    assert.ok(!("erro" in registro));
    return { vendedor, id: registro.id };
  }

  const auditoriaDa = async (id: bigint) =>
    (
      await ambiente.banco
        .from("auditoria")
        .select("acao, dados")
        .eq("entidade", "revendas")
        .eq("entidade_id", id.toString())
        // Os ids de oferta recomeçam a cada suíte, que publica contratos novos.
        .eq("ator_id", administrador.id)
        .throwOnError()
    ).data;

  it("exercer a preferência recompra o lote para a tesouraria pelo preço ofertado", async () => {
    const { vendedor, id } = await loteOfertado(2);
    const tesouraria = contasLocais.tesouraria.address;
    const [tesourariaAntes, stableAntes] = await Promise.all([
      ambiente.cadeia.token.read.balanceOf([tesouraria]),
      ambiente.cadeia.stable.read.balanceOf([vendedor.carteira]),
    ]);

    const decisao = await decidirPreferencia(ambiente, administrador.id, id, { decisao: "exercer" });

    assert.ok(!("erro" in decisao), "erro" in decisao ? decisao.erro : "");
    assert.equal(decisao.assinaturas, 2);
    assert.equal(decisao.necessarias, 2);
    assert.equal((await lerOferta(ambiente.cadeia, id))?.estado, "liquidado");
    assert.equal(await ambiente.cadeia.token.read.balanceOf([tesouraria]), tesourariaAntes + 2n);
    assert.equal(await ambiente.cadeia.token.read.balanceOf([vendedor.carteira]), 1n);
    assert.equal(await ambiente.cadeia.conformidade.read.saldoTravado([vendedor.carteira]), 0n);
    assert.equal(
      await ambiente.cadeia.stable.read.balanceOf([vendedor.carteira]),
      stableAntes + BigInt(PRECO_DO_LOTE_CENTAVOS) * 10_000n,
    );
    const [auditoria] = await auditoriaDa(id);
    assert.equal(auditoria.acao, "exercer_preferencia");
    const dados = auditoria.dados as { assinaturas: number; donos: number; txHash: string; emissao: string | null };
    assert.equal(dados.assinaturas, 2);
    assert.equal(dados.donos, 3);
    assert.equal(dados.txHash, decisao.txHash);
    // A tesouraria já recebeu stablecoin das vendas da oferta: não precisou emitir.
    assert.equal(dados.emissao, null);
  });

  it("recusar deixa a oferta em RECUSADO, e o vendedor pode indicar um comprador", async () => {
    const { id } = await loteOfertado();

    const decisao = await decidirPreferencia(ambiente, administrador.id, id, { decisao: "recusar" });

    assert.ok(!("erro" in decisao));
    assert.equal((await lerOferta(ambiente.cadeia, id))?.estado, "recusado");
    assert.deepEqual(
      (await auditoriaDa(id)).map(({ acao }) => acao),
      ["recusar_preferencia"],
    );
  });

  it("só decide a preferência de uma oferta que aguarda a decisão", async () => {
    const { id } = await loteOfertado();
    await decidirPreferencia(ambiente, administrador.id, id, { decisao: "recusar" });

    for (const decisao of ["exercer", "recusar"] as const) {
      assert.deepEqual(await decidirPreferencia(ambiente, administrador.id, id, { decisao }), {
        erro: "Esta oferta não está aguardando a preferência do Ibiti.",
      });
    }
    assert.deepEqual(await decidirPreferencia(ambiente, administrador.id, 999_999n, { decisao: "recusar" }), {
      erro: "Oferta de revenda não encontrada.",
    });
  });

  it("lista as ofertas com o vendedor identificado e o prazo da preferência", async () => {
    const { id } = await loteOfertado();

    const ofertas = await listarRevendasParaDecisao(ambiente, administrador.id);

    const oferta = ofertas.find((oferta) => oferta.id === id);
    assert.ok(oferta);
    assert.equal(oferta.estado, "ofertado");
    assert.equal(oferta.vendedorNome, "Vera Vendedora");
    assert.equal(oferta.precoCentavos, PRECO_DO_LOTE_CENTAVOS);
  });

  it("só o administrador decide", async () => {
    const { vendedor, id } = await loteOfertado();

    await assert.rejects(decidirPreferencia(ambiente, vendedor.id, id, { decisao: "recusar" }), AcessoNegado);
    await assert.rejects(listarRevendasParaDecisao(ambiente, vendedor.id), AcessoNegado);
  });
});
