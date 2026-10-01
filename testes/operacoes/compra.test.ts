import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { encodeFunctionData } from "viem";
import { AcessoNegado } from "@/servidor/autorizacao";
import { registrarAceite } from "@/servidor/operacoes/aceite";
import {
  condicoesDaCompra,
  confirmarPagamentoSimulado,
  converterParaStablecoin,
  prepararCompra,
  registrarCompra,
} from "@/servidor/operacoes/compra";
import {
  comprarComCarteiraHabilitada,
  confirmar,
  investidorAprovado,
  investidorEmAnalise,
  prepararAmbiente,
  type Ambiente,
} from "../ambiente";
import { contasLocais, PRECO_UNITARIO } from "../ambiente/rede-local";
import { criarUsuario } from "../ambiente/usuarios";
import { criarPagamentoFalso } from "../falsos/pagamento";

const DEPOIS_DA_OFERTA = new Date("2027-01-01T00:00:00Z");
const CENTAVOS_POR_TOKEN = PRECO_UNITARIO / 10_000n;

describe("compra de tokens", () => {
  let ambiente: Ambiente;
  before(async () => {
    ambiente = await prepararAmbiente();
  });

  async function investidorQueAceitou() {
    const investidor = await investidorAprovado(ambiente);
    await registrarAceite(ambiente, investidor.id, { memorando: true, riscos: true });
    return investidor;
  }

  const transacoesDe = async (perfilId: string) =>
    (
      await ambiente.banco
        .from("transacoes")
        .select("tipo, status, tx_hash, dados, erro")
        .eq("perfil_id", perfilId)
        .in("tipo", ["compra_oferta", "compra_recolocacao"])
        .order("criado_em")
        .throwOnError()
    ).data;

  const recolocar = (quantidade: bigint) =>
    confirmar(
      ambiente.cadeia,
      ambiente.cadeia.token.write.transfer([ambiente.cadeia.recolocacao.address, quantidade], {
        account: contasLocais.tesouraria,
      }),
    );

  /** A timeline inteira, como a tela chama: PIX, conversão, a Safe executa e a compra é registrada. */
  async function comprar(investidor: { id: string; carteira: `0x${string}` }, quantidade: bigint, agora?: Date) {
    const pagamento = await confirmarPagamentoSimulado(ambiente, investidor.id, { quantidade, agora });
    assert.ok(!("erro" in pagamento), "erro" in pagamento ? pagamento.erro : "");
    const conversao = await converterParaStablecoin(ambiente, investidor.id, { quantidade, agora });
    assert.ok(!("erro" in conversao), "erro" in conversao ? conversao.erro : "");
    const txHash = await ambiente.contaInteligente.executar(investidor.carteira, pagamento.compra.chamadas);
    const registro = await registrarCompra(ambiente, investidor.id, { txHash, origem: pagamento.compra.origem });
    return { pagamento, conversao, txHash, registro };
  }

  it("com a oferta aberta, a compra vem da oferta, pelo preço unitário dela", async () => {
    const investidor = await investidorQueAceitou();

    const compra = await prepararCompra(ambiente, investidor.id, { quantidade: 2n });

    assert.ok(!("erro" in compra));
    assert.equal(compra.origem, "oferta");
    assert.equal(compra.quantidade, 2n);
    assert.equal(compra.precoUnitario, await ambiente.cadeia.oferta.read.precoUnitario());
    assert.equal(compra.valor, 2n * PRECO_UNITARIO);
    assert.equal(compra.valorCentavos, 2n * CENTAVOS_POR_TOKEN);
  });

  it("depois da oferta, sem lote não há token à venda, e com lote a compra vem da recolocação", async () => {
    const investidor = await investidorQueAceitou();

    assert.deepEqual(await condicoesDaCompra(ambiente, investidor.id, { agora: DEPOIS_DA_OFERTA }), {
      erro: "Não há tokens à venda no momento.",
    });
    assert.deepEqual(await prepararCompra(ambiente, investidor.id, { quantidade: 1n, agora: DEPOIS_DA_OFERTA }), {
      erro: "Não há tokens à venda no momento.",
    });

    await recolocar(5n);

    const condicoes = await condicoesDaCompra(ambiente, investidor.id, { agora: DEPOIS_DA_OFERTA });
    assert.ok(!("erro" in condicoes));
    assert.equal(condicoes.origem, "recolocacao");
    assert.equal(condicoes.precoUnitario, await ambiente.cadeia.recolocacao.read.precoUnitario());
    assert.equal(condicoes.limite, 5n);
    const compra = await prepararCompra(ambiente, investidor.id, { quantidade: 5n, agora: DEPOIS_DA_OFERTA });
    assert.ok(!("erro" in compra));
    assert.equal(compra.origem, "recolocacao");
    assert.deepEqual(await prepararCompra(ambiente, investidor.id, { quantidade: 6n, agora: DEPOIS_DA_OFERTA }), {
      erro: "Você pode comprar no máximo 5 tokens agora.",
    });
  });

  it("a quantidade fica limitada ao teto restante do titular", async () => {
    const investidor = await investidorQueAceitou();
    await comprarComCarteiraHabilitada(ambiente, investidor.carteira, 38n);

    const condicoes = await condicoesDaCompra(ambiente, investidor.id);

    assert.ok(!("erro" in condicoes));
    assert.equal(condicoes.limite, 2n);
    assert.deepEqual(await prepararCompra(ambiente, investidor.id, { quantidade: 3n }), {
      erro: "Você pode comprar no máximo 2 tokens agora.",
    });
    assert.ok(!("erro" in (await prepararCompra(ambiente, investidor.id, { quantidade: 2n }))));
  });

  it("com a posição no teto, a compra é recusada", async () => {
    const investidor = await investidorQueAceitou();
    await comprarComCarteiraHabilitada(ambiente, investidor.carteira, 40n);

    assert.deepEqual(await condicoesDaCompra(ambiente, investidor.id), {
      erro: "Você já tem o teto de 40 tokens por pessoa.",
    });
  });

  it("quantidade que não é inteira e positiva é recusada", async () => {
    const investidor = await investidorQueAceitou();

    for (const quantidade of [0n, -1n]) {
      assert.deepEqual(await prepararCompra(ambiente, investidor.id, { quantidade }), {
        erro: "Informe quantos tokens quer comprar.",
      });
    }
  });

  it("sem aceite, a compra é recusada: nada é cobrado nem convertido", async () => {
    const investidor = await investidorAprovado(ambiente);
    const pagamento = criarPagamentoFalso();
    const recusa = { erro: "Aceite o Memorando de Oferta e o termo de ciência de riscos antes de comprar." };

    assert.deepEqual(await condicoesDaCompra(ambiente, investidor.id), recusa);
    assert.deepEqual(await prepararCompra(ambiente, investidor.id, { quantidade: 1n }), recusa);
    assert.deepEqual(
      await confirmarPagamentoSimulado({ ...ambiente, pagamento }, investidor.id, { quantidade: 1n }),
      recusa,
    );
    assert.deepEqual(await converterParaStablecoin(ambiente, investidor.id, { quantidade: 1n }), recusa);
    assert.deepEqual(pagamento.cobrancas, []);
    assert.equal(await ambiente.cadeia.stable.read.balanceOf([investidor.carteira]), 0n);
    assert.deepEqual(await transacoesDe(investidor.id), []);
  });

  it("sem a carteira habilitada, a compra é recusada", async () => {
    const investidor = await investidorEmAnalise(ambiente);
    await registrarAceite(ambiente, investidor.id, { memorando: true, riscos: true });

    assert.deepEqual(await condicoesDaCompra(ambiente, investidor.id), {
      erro: "Sua carteira não está habilitada para comprar.",
    });
  });

  it("a compra na oferta passa pelas cinco etapas e grava cada etapa on-chain", async () => {
    const investidor = await investidorQueAceitou();
    const valor = 3n * PRECO_UNITARIO;

    const { pagamento, conversao, txHash, registro } = await comprar(investidor, 3n);

    assert.ok(!("erro" in pagamento) && !("erro" in conversao));
    assert.ok(pagamento.cobranca);
    assert.equal(ambiente.pagamento.cobrancas.at(-1), 3n * CENTAVOS_POR_TOKEN);
    assert.deepEqual(registro, { origem: "oferta", quantidade: 3n, txHash, glampy: 3n });
    assert.equal(await ambiente.cadeia.token.read.balanceOf([investidor.carteira]), 3n);
    assert.deepEqual(await transacoesDe(investidor.id), [
      {
        tipo: "compra_oferta",
        status: "confirmada",
        tx_hash: conversao.txHash,
        dados: { etapa: "conversao", quantidade: 3, valor: valor.toString() },
        erro: null,
      },
      {
        tipo: "compra_oferta",
        status: "confirmada",
        tx_hash: txHash,
        dados: { etapa: "compra", quantidade: 3, valor: valor.toString() },
        erro: null,
      },
    ]);
  });

  it("a compra na recolocação é gravada como compra_recolocacao", async () => {
    const investidor = await investidorQueAceitou();
    await recolocar(2n);

    const { registro } = await comprar(investidor, 2n, DEPOIS_DA_OFERTA);

    assert.ok(!("erro" in registro));
    assert.equal(registro.origem, "recolocacao");
    assert.equal(registro.glampy, 2n);
    assert.deepEqual(
      (await transacoesDe(investidor.id)).map(({ tipo, dados }) => [tipo, (dados as { etapa: string }).etapa]),
      [
        ["compra_recolocacao", "conversao"],
        ["compra_recolocacao", "compra"],
      ],
    );
  });

  it("registrar a mesma compra de novo não duplica a transação", async () => {
    const investidor = await investidorQueAceitou();
    const { txHash, registro } = await comprar(investidor, 1n);

    assert.deepEqual(await registrarCompra(ambiente, investidor.id, { txHash, origem: "oferta" }), registro);
    assert.equal((await transacoesDe(investidor.id)).length, 2);
  });

  it("uma operação da carteira que não comprou é gravada como revertida e aponta o erro", async () => {
    const investidor = await investidorQueAceitou();
    const txHash = await ambiente.contaInteligente.executar(investidor.carteira, [
      {
        to: ambiente.cadeia.stable.address,
        data: encodeFunctionData({
          abi: ambiente.cadeia.stable.abi,
          functionName: "approve",
          args: [ambiente.cadeia.oferta.address, PRECO_UNITARIO],
        }),
      },
    ]);

    const registro = await registrarCompra(ambiente, investidor.id, { txHash, origem: "oferta" });

    assert.deepEqual(registro, { erro: "A compra não aconteceu: o contrato não entregou o token." });
    assert.deepEqual(await transacoesDe(investidor.id), [
      { tipo: "compra_oferta", status: "revertida", tx_hash: txHash, dados: { etapa: "compra" }, erro: registro.erro },
    ]);
  });

  it("a compra de outra carteira não é registrada", async () => {
    const investidor = await investidorQueAceitou();
    const outro = await investidorQueAceitou();
    const { txHash } = await comprar(outro, 1n);

    assert.deepEqual(await registrarCompra(ambiente, investidor.id, { txHash, origem: "oferta" }), {
      erro: "Esta transação não é da sua carteira.",
    });
    assert.deepEqual(await transacoesDe(investidor.id), []);
  });

  it("se o PIX não é aprovado, nada é convertido e a compra para no pagamento", async () => {
    const investidor = await investidorQueAceitou();

    const resultado = await confirmarPagamentoSimulado(
      { ...ambiente, pagamento: criarPagamentoFalso({ aprova: false }) },
      investidor.id,
      { quantidade: 1n },
    );

    assert.deepEqual(resultado, { erro: "O PIX não foi aprovado." });
    assert.deepEqual(await transacoesDe(investidor.id), []);
  });

  it("só o investidor compra", async () => {
    const operador = await criarUsuario(ambiente.banco, "operador");

    for (const operacao of [
      () => condicoesDaCompra(ambiente, operador.id),
      () => prepararCompra(ambiente, operador.id, { quantidade: 1n }),
      () => confirmarPagamentoSimulado(ambiente, operador.id, { quantidade: 1n }),
      () => converterParaStablecoin(ambiente, operador.id, { quantidade: 1n }),
      () => registrarCompra(ambiente, operador.id, { txHash: `0x${"0".repeat(64)}`, origem: "oferta" }),
    ]) {
      await assert.rejects(operacao(), AcessoNegado);
    }
  });
});
