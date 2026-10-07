import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import type { Address, Hash } from "viem";
import type { Chamada } from "@/servidor/adaptadores/conta-inteligente";
import { formatarReais } from "@/formatacao";
import { AcessoNegado } from "@/servidor/autorizacao";
import { decidirCrivo, decidirPreferencia } from "@/servidor/operacoes/decisoes-da-revenda";
import {
  consultarRevendas,
  lerOferta,
  pagarLiquidacao,
  prepararIndicacao,
  prepararOferta,
  registrarIndicacao,
  registrarLiquidacao,
  registrarOferta,
} from "@/servidor/operacoes/revenda";
import type { Resultado } from "@/servidor/resultado";
import { investidorComCredito, prepararAmbiente, type Ambiente } from "../ambiente";
import { comRelogioAdiantado } from "../ambiente/rede-local";
import { criarUsuario } from "../ambiente/usuarios";

const PRECO_CENTAVOS = 70_000_00;
const CENTAVO = 10_000n;

describe("revenda: comprador, crivo e liquidação", () => {
  let ambiente: Ambiente;
  let administrador: { id: string };
  before(async () => {
    ambiente = await prepararAmbiente();
    administrador = await criarUsuario(ambiente.banco, "administrador");
  });

  type Investidor = Awaited<ReturnType<typeof investidorComCredito>>;

  /** Como a tela: o servidor prepara, a Safe executa e o servidor registra. */
  async function executar<T extends object>(
    investidor: Investidor,
    preparo: Resultado<{ chamadas: Chamada[] }>,
    registrar: (txHash: Hash) => Promise<Resultado<T>>,
  ) {
    assert.ok(!("erro" in preparo), "erro" in preparo ? preparo.erro : "");
    const registro = await registrar(await ambiente.contaInteligente.executar(investidor.carteira, preparo.chamadas));
    assert.ok(!("erro" in registro), "erro" in registro ? registro.erro : "");
    return registro;
  }

  /** Oferta recusada pelo Ibiti, pronta para o vendedor indicar um comprador. */
  async function ofertaRecusada() {
    const vendedor = await investidorComCredito(ambiente, 3n, { nomeCompleto: "Vera Vendedora" });
    const comprador = await investidorComCredito(ambiente, 1n, { nomeCompleto: "Caio Comprador" });
    const { id } = await executar(
      vendedor,
      await prepararOferta(ambiente, vendedor.id, { quantidade: 2, precoCentavos: PRECO_CENTAVOS }),
      (txHash) => registrarOferta(ambiente, vendedor.id, { txHash }),
    );
    assert.ok(!("erro" in (await decidirPreferencia(ambiente, administrador.id, id, { decisao: "recusar" }))));
    return { vendedor, comprador, id };
  }

  async function indicar(vendedor: Investidor, id: bigint, comprador: Address) {
    return executar(vendedor, await prepararIndicacao(ambiente, vendedor.id, { id, comprador }), (txHash) =>
      registrarIndicacao(ambiente, vendedor.id, { txHash }),
    );
  }

  it("o caminho completo: indicar, aprovar no crivo e liquidar pelo preço combinado", async () => {
    const { vendedor, comprador, id } = await ofertaRecusada();
    const stableDoVendedor = await ambiente.cadeia.stable.read.balanceOf([vendedor.carteira]);

    await indicar(vendedor, id, comprador.carteira);
    assert.equal((await lerOferta(ambiente.cadeia, id))?.estado, "em_crivo");
    const { comoComprador } = (await consultarRevendas(ambiente, comprador.id))!;
    assert.deepEqual(comoComprador.map((oferta) => oferta.id), [id]);

    const aprovacao = await decidirCrivo(ambiente, administrador.id, id, { decisao: "aprovar" });
    assert.ok(!("erro" in aprovacao));
    assert.equal(aprovacao.assinaturas, 2);
    assert.equal((await lerOferta(ambiente.cadeia, id))?.estado, "aprovado");

    const precoFinal = PRECO_CENTAVOS + 1_000_00;
    await executar(comprador, await pagarLiquidacao(ambiente, comprador.id, { id, precoCentavos: precoFinal }), (txHash) =>
      registrarLiquidacao(ambiente, comprador.id, { txHash }),
    );

    assert.equal((await lerOferta(ambiente.cadeia, id))?.estado, "liquidado");
    assert.equal(await ambiente.cadeia.token.read.balanceOf([comprador.carteira]), 3n);
    assert.equal(await ambiente.cadeia.token.read.balanceOf([vendedor.carteira]), 1n);
    assert.equal(
      await ambiente.cadeia.stable.read.balanceOf([vendedor.carteira]),
      stableDoVendedor + BigInt(precoFinal) * CENTAVO,
    );
    const { data } = await ambiente.banco
      .from("transacoes")
      .select("tipo, status, dados")
      .eq("perfil_id", comprador.id)
      .eq("tipo", "revenda_liquidacao")
      .order("criado_em")
      .throwOnError();
    assert.deepEqual(
      data.map(({ status, dados }) => [status, (dados as { etapa: string }).etapa]),
      [
        ["confirmada", "conversao"],
        ["confirmada", "liquidacao"],
      ],
    );
  });

  it("o veto exige motivo, volta a oferta para RECUSADO e grava o motivo na auditoria", async () => {
    const { vendedor, comprador, id } = await ofertaRecusada();
    await indicar(vendedor, id, comprador.carteira);

    assert.deepEqual(await decidirCrivo(ambiente, administrador.id, id, { decisao: "vetar", motivo: " " }), {
      erro: "Informe o motivo do veto.",
    });
    const veto = await decidirCrivo(ambiente, administrador.id, id, { decisao: "vetar", motivo: "Comprador com pendência cadastral" });

    assert.ok(!("erro" in veto));
    const oferta = await lerOferta(ambiente.cadeia, id);
    assert.equal(oferta?.estado, "recusado");
    assert.equal(oferta?.compradorIndicado, null);
    const { data } = await ambiente.banco
      .from("auditoria")
      .select("acao, dados")
      .eq("entidade", "revendas")
      .eq("entidade_id", id.toString())
      .eq("ator_id", administrador.id)
      .eq("acao", "vetar_comprador")
      .throwOnError();
    assert.equal((data[0].dados as { motivo: string }).motivo, "Comprador com pendência cadastral");
  });

  it("recusa indicação fora da plataforma, liquidação abaixo do preço e liquidação por quem não foi aprovado", async () => {
    const { vendedor, comprador, id } = await ofertaRecusada();
    const outro = await investidorComCredito(ambiente, 1n);

    assert.deepEqual(
      await prepararIndicacao(ambiente, vendedor.id, { id, comprador: "0x000000000000000000000000000000000000dEaD" }),
      { erro: "O comprador precisa ser um investidor com carteira habilitada na plataforma." },
    );
    assert.deepEqual(await prepararIndicacao(ambiente, vendedor.id, { id, comprador: vendedor.carteira }), {
      erro: "Você não pode indicar a própria carteira.",
    });
    assert.deepEqual(await prepararIndicacao(ambiente, outro.id, { id, comprador: comprador.carteira }), {
      erro: "Esta oferta não é sua.",
    });

    await indicar(vendedor, id, comprador.carteira);
    await decidirCrivo(ambiente, administrador.id, id, { decisao: "aprovar" });

    assert.deepEqual(await pagarLiquidacao(ambiente, comprador.id, { id, precoCentavos: PRECO_CENTAVOS - 1 }), {
      erro: `O preço final não pode ficar abaixo do ofertado, ${formatarReais(PRECO_CENTAVOS)}.`,
    });
    assert.deepEqual(await pagarLiquidacao(ambiente, outro.id, { id, precoCentavos: PRECO_CENTAVOS }), {
      erro: "Só o comprador aprovado liquida esta revenda.",
    });
  });

  it("sem resposta do Ibiti em 30 dias, a indicação declara a recusa por silêncio na mesma operação", async () => {
    const vendedor = await investidorComCredito(ambiente, 2n);
    const comprador = await investidorComCredito(ambiente, 1n);
    const { id } = await executar(
      vendedor,
      await prepararOferta(ambiente, vendedor.id, { quantidade: 1, precoCentavos: PRECO_CENTAVOS }),
      (txHash) => registrarOferta(ambiente, vendedor.id, { txHash }),
    );
    assert.deepEqual(await prepararIndicacao(ambiente, vendedor.id, { id, comprador: comprador.carteira }), {
      erro: "Só dá para indicar um comprador depois que o Ibiti recusa a preferência ou veta o anterior.",
    });

    await comRelogioAdiantado(31 * 86_400, async () => {
      assert.deepEqual(await decidirPreferencia(ambiente, administrador.id, id, { decisao: "exercer" }), {
        erro: "O prazo de 30 dias da preferência acabou.",
      });
      const preparo = await prepararIndicacao(ambiente, vendedor.id, { id, comprador: comprador.carteira });
      assert.ok(!("erro" in preparo));
      assert.equal(preparo.chamadas.length, 2);

      await indicar(vendedor, id, comprador.carteira);

      assert.equal((await lerOferta(ambiente.cadeia, id))?.estado, "em_crivo");
    });
  });

  it("o crivo só decide oferta em crivo, e só o administrador decide", async () => {
    const { vendedor, id } = await ofertaRecusada();

    assert.deepEqual(await decidirCrivo(ambiente, administrador.id, id, { decisao: "aprovar" }), {
      erro: "Esta oferta não tem comprador em análise no crivo.",
    });
    await assert.rejects(decidirCrivo(ambiente, vendedor.id, id, { decisao: "aprovar" }), AcessoNegado);
  });
});
