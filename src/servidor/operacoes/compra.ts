import {
  encodeFunctionData,
  isAddressEqual,
  isHash,
  parseEventLogs,
  type Address,
  type Hash,
  type Log,
} from "viem";
import type { Dependencias } from "@/servidor/adaptadores";
import type { Cadeia } from "@/servidor/adaptadores/cadeia";
import type { Chamada } from "@/servidor/adaptadores/conta-inteligente";
import { exigirPapel } from "@/servidor/autorizacao";
import type { Resultado } from "@/servidor/resultado";
import { ehOperacaoDaCarteira, enviarTransacao, mensagemDeErro, type TipoDeTransacao } from "@/servidor/transacoes";
import { consultarAceite } from "./aceite";
import { lerCarteiraHabilitada, type CarteiraHabilitada } from "./carteira";
import { estoqueAVenda, tetoDoTitular, type OrigemDoEstoque } from "./consultar-posicao";

/** O BRLStableMock tem 6 casas decimais: 10.000 unidades fazem um centavo. */
const UNIDADES_POR_CENTAVO = 10_000n;

const TIPO: Record<OrigemDoEstoque, TipoDeTransacao> = {
  oferta: "compra_oferta",
  recolocacao: "compra_recolocacao",
};

const SEM_ACEITE = { erro: "Aceite o Memorando de Oferta e o termo de ciência de riscos antes de comprar." };
const NAO_HABILITADA = { erro: "Sua carteira não está habilitada para comprar." };
const NAO_COMPROU = "A compra não aconteceu: o contrato não entregou o token.";

export interface Compra {
  origem: OrigemDoEstoque;
  quantidade: bigint;
  precoUnitario: bigint;
  /** Na menor unidade do BRLStableMock. */
  valor: bigint;
  valorCentavos: bigint;
  /** `approve` e `comprar`, que a Safe executa numa única operação. */
  chamadas: Chamada[];
}

const contratoDa = (cadeia: Cadeia, origem: OrigemDoEstoque) =>
  origem === "oferta" ? cadeia.oferta : cadeia.recolocacao;

async function avaliar(
  { banco, cadeia }: Pick<Dependencias, "banco" | "cadeia">,
  perfilId: string,
  agora: Date,
) {
  await exigirPapel(banco, perfilId, "investidor");
  const comprador = await lerCarteiraHabilitada({ banco }, perfilId);
  if (!comprador) return NAO_HABILITADA;
  if (!(await consultarAceite({ banco }, perfilId))) return SEM_ACEITE;

  const [estoque, { teto, restante }] = await Promise.all([
    estoqueAVenda({ cadeia }, { agora }),
    tetoDoTitular({ cadeia }, comprador.identificador),
  ]);
  if (!estoque) return { erro: "Não há tokens à venda no momento." };
  if (restante === 0n) return { erro: `Você já tem o teto de ${teto} tokens por pessoa.` };

  const precoUnitario = await contratoDa(cadeia, estoque.origem).read.precoUnitario();
  const limite = estoque.quantidade < restante ? estoque.quantidade : restante;
  return { comprador, origem: estoque.origem, precoUnitario, limite };
}

/**
 * O que o investidor pode comprar agora: de onde vem o token, a que preço e
 * até quantos, o menor entre o estoque da origem e o teto restante do titular.
 */
export async function condicoesDaCompra(
  dependencias: Pick<Dependencias, "banco" | "cadeia">,
  perfilId: string,
  { agora = new Date() }: { agora?: Date } = {},
) {
  const avaliacao = await avaliar(dependencias, perfilId, agora);
  if ("erro" in avaliacao) return avaliacao;
  const { comprador, ...condicoes } = avaliacao;
  return { ...condicoes, carteira: comprador.carteira, passkey: comprador.passkey };
}

async function preparar(
  dependencias: Pick<Dependencias, "banco" | "cadeia">,
  perfilId: string,
  { quantidade, agora = new Date() }: { quantidade: bigint; agora?: Date },
): Promise<Resultado<{ comprador: CarteiraHabilitada; compra: Compra }>> {
  const avaliacao = await avaliar(dependencias, perfilId, agora);
  if ("erro" in avaliacao) return avaliacao;
  const { comprador, origem, precoUnitario, limite } = avaliacao;
  if (quantidade <= 0n) return { erro: "Informe quantos tokens quer comprar." };
  if (quantidade > limite) return { erro: `Você pode comprar no máximo ${limite} tokens agora.` };

  const { cadeia } = dependencias;
  const contrato = contratoDa(cadeia, origem);
  const valor = quantidade * precoUnitario;
  const comprar =
    origem === "oferta"
      ? encodeFunctionData({ abi: cadeia.oferta.abi, functionName: "comprar", args: [quantidade] })
      : encodeFunctionData({ abi: cadeia.recolocacao.abi, functionName: "comprar", args: [quantidade] });

  return {
    comprador,
    compra: {
      origem,
      quantidade,
      precoUnitario,
      valor,
      valorCentavos: valor / UNIDADES_POR_CENTAVO,
      chamadas: [
        {
          to: cadeia.stable.address,
          data: encodeFunctionData({
            abi: cadeia.stable.abi,
            functionName: "approve",
            args: [contrato.address, valor],
          }),
        },
        { to: contrato.address, data: comprar },
      ],
    },
  };
}

export async function prepararCompra(
  dependencias: Pick<Dependencias, "banco" | "cadeia">,
  perfilId: string,
  pedido: { quantidade: bigint; agora?: Date },
): Promise<Resultado<Compra>> {
  const preparo = await preparar(dependencias, perfilId, pedido);
  return "erro" in preparo ? preparo : preparo.compra;
}

/** Etapa 1: o PIX simulado. Devolve a compra, com as chamadas que a Safe vai executar. */
export async function confirmarPagamentoSimulado(
  { banco, cadeia, pagamento }: Pick<Dependencias, "banco" | "cadeia" | "pagamento">,
  perfilId: string,
  pedido: { quantidade: bigint; agora?: Date },
): Promise<Resultado<{ compra: Compra; cobranca: string }>> {
  const preparo = await preparar({ banco, cadeia }, perfilId, pedido);
  if ("erro" in preparo) return preparo;

  const cobranca = await pagamento.cobrarPix(preparo.compra.valorCentavos);
  if (!cobranca.aprovada) return { erro: "O PIX não foi aprovado." };
  return { compra: preparo.compra, cobranca: cobranca.id };
}

const dadosDa = ({ quantidade, valor }: { quantidade: bigint; valor: bigint }) => ({
  quantidade: Number(quantidade),
  valor: valor.toString(),
});

/** Etapa 2: a conta agente emite a stablecoin do valor da compra para a Safe. */
export async function converterParaStablecoin(
  { banco, cadeia }: Pick<Dependencias, "banco" | "cadeia">,
  perfilId: string,
  pedido: { quantidade: bigint; agora?: Date },
): Promise<Resultado<{ txHash: Hash }>> {
  const preparo = await preparar({ banco, cadeia }, perfilId, pedido);
  if ("erro" in preparo) return preparo;
  const { comprador, compra } = preparo;

  try {
    const txHash = await enviarTransacao(
      { banco, cadeia },
      {
        perfilId,
        carteiraId: comprador.carteiraId,
        tipo: TIPO[compra.origem],
        dados: { etapa: "conversao", ...dadosDa(compra) },
      },
      () => cadeia.stable.write.emitirPara([comprador.carteira, compra.valor]),
    );
    return { txHash };
  } catch (erro) {
    return { erro: `A conversão para stablecoin falhou: ${mensagemDeErro(erro)}` };
  }
}

function vendaNoRecibo(cadeia: Cadeia, logs: Log[], carteira: Address) {
  const doContrato = (endereco: Address) => logs.filter((log) => isAddressEqual(log.address, endereco));
  const [oferta] = parseEventLogs({
    abi: cadeia.oferta.abi,
    eventName: "TokensVendidos",
    logs: doContrato(cadeia.oferta.address),
    args: { comprador: carteira },
  });
  if (oferta) return { origem: "oferta" as const, quantidade: oferta.args.quantidade, valor: oferta.args.valorPago };
  const [lote] = parseEventLogs({
    abi: cadeia.recolocacao.abi,
    eventName: "LoteRecolocado",
    logs: doContrato(cadeia.recolocacao.address),
    args: { comprador: carteira },
  });
  if (lote) return { origem: "recolocacao" as const, quantidade: lote.args.quantidade, valor: lote.args.valorPago };
  return null;
}

/**
 * Etapas 3 a 5: a Safe já executou `approve` e `comprar` numa operação só, e
 * o navegador informa o hash. A origem e a quantidade vêm do evento do
 * contrato, não do navegador; a origem informada só classifica a transação
 * quando a compra não aconteceu. Devolve o saldo de Glampy relido do contrato.
 */
export async function registrarCompra(
  { banco, cadeia }: Pick<Dependencias, "banco" | "cadeia">,
  perfilId: string,
  { txHash, origem }: { txHash: Hash; origem: OrigemDoEstoque },
): Promise<Resultado<{ origem: OrigemDoEstoque; quantidade: bigint; txHash: Hash; glampy: bigint }>> {
  await exigirPapel(banco, perfilId, "investidor");
  const comprador = await lerCarteiraHabilitada({ banco }, perfilId);
  if (!comprador) return NAO_HABILITADA;
  if (!isHash(txHash) || !(origem === "oferta" || origem === "recolocacao")) return { erro: "Compra inválida." };

  const recibo = await cadeia.leitor.waitForTransactionReceipt({ hash: txHash, timeout: 60_000 });
  const venda = recibo.status === "success" ? vendaNoRecibo(cadeia, recibo.logs, comprador.carteira) : null;
  if (!venda && !ehOperacaoDaCarteira(recibo, comprador.carteira)) return { erro: "Esta transação não é da sua carteira." };

  const { error } = await banco.from("transacoes").upsert(
    {
      perfil_id: perfilId,
      carteira_id: comprador.carteiraId,
      tipo: TIPO[venda?.origem ?? origem],
      tx_hash: txHash,
      status: venda ? "confirmada" : "revertida",
      bloco: Number(recibo.blockNumber),
      dados: venda ? { etapa: "compra", ...dadosDa(venda) } : { etapa: "compra" },
      erro: venda ? null : NAO_COMPROU,
      confirmada_em: venda ? new Date().toISOString() : null,
    },
    { onConflict: "tx_hash", ignoreDuplicates: true },
  );
  if (error) throw new Error(`falha ao registrar a compra ${txHash}: ${error.message}`);
  if (!venda) return { erro: NAO_COMPROU };

  const glampy = await cadeia.token.read.balanceOf([comprador.carteira]);
  return { origem: venda.origem, quantidade: venda.quantidade, txHash, glampy };
}
