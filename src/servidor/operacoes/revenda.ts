import {
  encodeFunctionData,
  getAddress,
  isAddress,
  isAddressEqual,
  isHash,
  parseEventLogs,
  zeroAddress,
  type Address,
  type Hash,
  type TransactionReceipt,
} from "viem";
import { formatarReais } from "@/formatacao";
import { calcularValorDeReferencia } from "@/revenda/referencia";
import type { Dependencias } from "@/servidor/adaptadores";
import type { Cadeia } from "@/servidor/adaptadores/cadeia";
import type { Chamada } from "@/servidor/adaptadores/conta-inteligente";
import type { Json } from "@/servidor/adaptadores/tipos-do-banco";
import { exigirPapel } from "@/servidor/autorizacao";
import type { Resultado } from "@/servidor/resultado";
import {
  ehOperacaoDaCarteira,
  enviarTransacao,
  esperarRecibo,
  mensagemDeErro,
  type TipoDeTransacao,
} from "@/servidor/transacoes";
import { listarApuracoes } from "./apuracoes";
import { lerCarteiraHabilitada, type CarteiraHabilitada } from "./carteira";

/** A ordem do enum `Estado` do ControleTransferencia. */
const ESTADOS = ["inexistente", "ofertado", "recusado", "em_crivo", "aprovado", "liquidado", "cancelado"] as const;
export type EstadoDaRevenda = (typeof ESTADOS)[number];

/** O BRLStableMock tem 6 casas decimais: 10.000 unidades fazem um centavo. */
const UNIDADES_POR_CENTAVO = 10_000n;

const NAO_HABILITADA = { erro: "Sua carteira não está habilitada." };
export const NAO_ENCONTRADA = { erro: "Oferta de revenda não encontrada." };
const DE_OUTRA_CARTEIRA = { erro: "Esta transação não é da sua carteira." };

const data = (segundos: bigint | number) => new Date(Number(segundos) * 1000);

/** O id da oferta chega da tela como texto, para não passar por Number. */
export const lerIdDaOferta = (id: string) => (/^\d+$/.test(id) ? BigInt(id) : 0n);

const prazos = new WeakMap<Cadeia, Promise<{ preferencia: bigint; caducidade: bigint }>>();

/** Os prazos são constantes do contrato: lidos uma vez por cadeia. */
function prazosDoControle(cadeia: Cadeia) {
  let lidos = prazos.get(cadeia);
  if (!lidos) {
    lidos = Promise.all([cadeia.controle.read.PRAZO_PREFERENCIA(), cadeia.controle.read.PRAZO_CADUCIDADE()]).then(
      ([preferencia, caducidade]) => ({ preferencia, caducidade }),
    );
    prazos.set(cadeia, lidos);
  }
  return lidos;
}

export async function lerOferta(cadeia: Cadeia, id: bigint) {
  const [oferta, prazo] = await Promise.all([cadeia.controle.read.ofertaDe([id]), prazosDoControle(cadeia)]);
  const estado = ESTADOS[oferta.estado];
  if (estado === "inexistente") return null;
  return {
    id,
    estado,
    vendedor: getAddress(oferta.vendedor),
    compradorIndicado: oferta.compradorIndicado === zeroAddress ? null : getAddress(oferta.compradorIndicado),
    quantidade: oferta.quantidade,
    /** Em unidades do BRLStableMock, como o contrato cobra. */
    preco: oferta.precoOfertado,
    // Para cima: o mínimo que a tela mostra tem de ser aceito na liquidação.
    precoCentavos: Number((oferta.precoOfertado + UNIDADES_POR_CENTAVO - 1n) / UNIDADES_POR_CENTAVO),
    ofertadaEm: data(oferta.ofertadaEm),
    preferenciaAte: data(oferta.ofertadaEm + prazo.preferencia),
    crivoAte: oferta.prazoDoCrivo === 0n ? null : data(oferta.prazoDoCrivo),
    caducaEm: data(oferta.ofertadaEm + prazo.caducidade),
  };
}

export type OfertaDeRevenda = NonNullable<Awaited<ReturnType<typeof lerOferta>>>;

/** Todas as ofertas já abertas, da mais recente para a mais antiga. */
export async function listarOfertas(cadeia: Cadeia) {
  const total = await cadeia.controle.read.totalDeOfertas();
  const ofertas = await Promise.all(Array.from({ length: Number(total) }, (_, i) => lerOferta(cadeia, total - BigInt(i))));
  return ofertas.filter((oferta): oferta is OfertaDeRevenda => oferta !== null);
}

async function investidorComCarteira({ banco }: Pick<Dependencias, "banco">, perfilId: string) {
  await exigirPapel(banco, perfilId, "investidor");
  return lerCarteiraHabilitada({ banco }, perfilId);
}

/**
 * As ofertas em que o investidor é vendedor e as em que foi indicado como
 * comprador, com o estado e os prazos lidos do contrato. `null` sem carteira habilitada.
 */
export async function consultarRevendas({ banco, cadeia }: Pick<Dependencias, "banco" | "cadeia">, perfilId: string) {
  const carteira = await investidorComCarteira({ banco }, perfilId);
  if (!carteira) return null;
  const [ofertas, saldo, travado] = await Promise.all([
    listarOfertas(cadeia),
    cadeia.token.read.balanceOf([carteira.carteira]),
    cadeia.conformidade.read.saldoTravado([carteira.carteira]),
  ]);
  return {
    minhas: ofertas.filter(({ vendedor }) => isAddressEqual(vendedor, carteira.carteira)),
    comoComprador: ofertas.filter(
      ({ compradorIndicado }) => compradorIndicado && isAddressEqual(compradorIndicado, carteira.carteira),
    ),
    saldo,
    travado,
    carteira: carteira.carteira,
    passkey: carteira.passkey,
  };
}

/** Por token: a tela multiplica pela quantidade que o investidor escolher. */
export async function consultarReferencia({ banco }: Pick<Dependencias, "banco">, perfilId: string) {
  await exigirPapel(banco, perfilId, "investidor");
  return calcularValorDeReferencia({ apuracoes: await listarApuracoes({ banco }), quantidade: 1 });
}

export async function prepararOferta(
  { banco, cadeia }: Pick<Dependencias, "banco" | "cadeia">,
  perfilId: string,
  { quantidade, precoCentavos }: { quantidade: number; precoCentavos: number },
): Promise<Resultado<{ chamadas: Chamada[] }>> {
  const carteira = await investidorComCarteira({ banco }, perfilId);
  if (!carteira) return NAO_HABILITADA;
  if (!Number.isSafeInteger(quantidade) || quantidade <= 0) return { erro: "Informe quantos tokens quer ofertar." };
  if (!Number.isSafeInteger(precoCentavos) || precoCentavos <= 0) return { erro: "Informe o preço do lote." };

  const [saldo, travado] = await Promise.all([
    cadeia.token.read.balanceOf([carteira.carteira]),
    cadeia.conformidade.read.saldoTravado([carteira.carteira]),
  ]);
  const livre = saldo - travado;
  if (BigInt(quantidade) > livre) {
    return { erro: `Você pode ofertar no máximo ${livre} ${livre === 1n ? "token" : "tokens"}.` };
  }

  return {
    chamadas: [
      {
        to: cadeia.controle.address,
        data: encodeFunctionData({
          abi: cadeia.controle.abi,
          functionName: "ofertar",
          args: [BigInt(quantidade), BigInt(precoCentavos) * UNIDADES_POR_CENTAVO],
        }),
      },
    ],
  };
}

/**
 * Registra no extrato uma operação da revenda que a Safe já executou. O que
 * aconteceu vem do evento do contrato; sem o evento, a operação não aconteceu.
 */
async function registrarNaRevenda<E>(
  { banco, cadeia }: Pick<Dependencias, "banco" | "cadeia">,
  carteira: CarteiraHabilitada,
  perfilId: string,
  {
    txHash,
    tipo,
    lerEvento,
    dados,
    naoAconteceu,
  }: {
    txHash: Hash;
    tipo: TipoDeTransacao;
    lerEvento: (recibo: TransactionReceipt) => E | undefined | Promise<E | undefined>;
    dados: (evento: E) => NonNullable<Json>;
    naoAconteceu: string;
  },
): Promise<Resultado<E>> {
  if (!isHash(txHash)) return { erro: "Operação inválida." };
  const recibo = await esperarRecibo({ cadeia }, txHash);
  if ("erro" in recibo) return recibo;
  const evento = recibo.status === "success" ? await lerEvento(recibo) : undefined;
  if (!evento && !ehOperacaoDaCarteira(recibo, carteira.carteira)) return DE_OUTRA_CARTEIRA;

  const { error } = await banco.from("transacoes").upsert(
    {
      perfil_id: perfilId,
      carteira_id: carteira.carteiraId,
      tipo,
      tx_hash: txHash,
      status: evento ? "confirmada" : "revertida",
      bloco: Number(recibo.blockNumber),
      dados: evento ? dados(evento) : {},
      erro: evento ? null : naoAconteceu,
      confirmada_em: evento ? new Date().toISOString() : null,
    },
    { onConflict: "tx_hash", ignoreDuplicates: true },
  );
  if (error) throw new Error(`falha ao registrar a transação ${txHash}: ${error.message}`);
  return evento ?? { erro: naoAconteceu };
}

const eventosDoControle = (cadeia: Cadeia, recibo: TransactionReceipt) =>
  recibo.logs.filter((log) => isAddressEqual(log.address, cadeia.controle.address));

export async function registrarOferta(
  { banco, cadeia }: Pick<Dependencias, "banco" | "cadeia">,
  perfilId: string,
  { txHash }: { txHash: Hash },
): Promise<Resultado<{ id: bigint }>> {
  const carteira = await investidorComCarteira({ banco }, perfilId);
  if (!carteira) return NAO_HABILITADA;
  const registro = await registrarNaRevenda({ banco, cadeia }, carteira, perfilId, {
    txHash,
    tipo: "revenda_oferta",
    lerEvento: (recibo) =>
      parseEventLogs({
        abi: cadeia.controle.abi,
        eventName: "LoteOfertado",
        logs: eventosDoControle(cadeia, recibo),
        args: { vendedor: carteira.carteira },
      })[0]?.args,
    dados: ({ id, quantidade, precoOfertado }) => ({
      oferta: id.toString(),
      quantidade: Number(quantidade),
      preco: precoOfertado.toString(),
    }),
    naoAconteceu: "A oferta não aconteceu: o contrato não registrou o lote.",
  });
  return "erro" in registro ? registro : { id: registro.id };
}

const ENCERRADAS: EstadoDaRevenda[] = ["liquidado", "cancelado"];

/** O primeiro evento cuja oferta tem esta carteira como vendedora. */
async function daCarteira<E extends { id: bigint }>(cadeia: Cadeia, carteira: Address, eventos: E[]) {
  for (const evento of eventos) {
    const oferta = await lerOferta(cadeia, evento.id);
    if (oferta && isAddressEqual(oferta.vendedor, carteira)) return evento;
  }
}

/** Uma oferta do próprio investidor que ainda está viva, como exige o `cancelar` do contrato. */
async function ofertaDoVendedor(cadeia: Cadeia, carteira: Address, id: bigint) {
  const oferta = await lerOferta(cadeia, id);
  if (!oferta) return NAO_ENCONTRADA;
  if (!isAddressEqual(oferta.vendedor, carteira)) return { erro: "Esta oferta não é sua." };
  if (ENCERRADAS.includes(oferta.estado)) return { erro: "Esta oferta já foi encerrada." };
  return oferta;
}

export async function prepararCancelamento(
  { banco, cadeia }: Pick<Dependencias, "banco" | "cadeia">,
  perfilId: string,
  { id }: { id: bigint },
): Promise<Resultado<{ chamadas: Chamada[] }>> {
  const carteira = await investidorComCarteira({ banco }, perfilId);
  if (!carteira) return NAO_HABILITADA;
  const oferta = await ofertaDoVendedor(cadeia, carteira.carteira, id);
  if ("erro" in oferta) return oferta;
  return {
    chamadas: [
      {
        to: cadeia.controle.address,
        data: encodeFunctionData({ abi: cadeia.controle.abi, functionName: "cancelar", args: [id] }),
      },
    ],
  };
}

export async function registrarCancelamento(
  { banco, cadeia }: Pick<Dependencias, "banco" | "cadeia">,
  perfilId: string,
  { txHash }: { txHash: Hash },
): Promise<Resultado<{ id: bigint; estado: "cancelado" }>> {
  const carteira = await investidorComCarteira({ banco }, perfilId);
  if (!carteira) return NAO_HABILITADA;
  const registro = await registrarNaRevenda({ banco, cadeia }, carteira, perfilId, {
    txHash,
    tipo: "revenda_cancelamento",
    // O evento não traz o vendedor, e `caducar` encerra qualquer oferta como cancelada: confere o vendedor no contrato.
    lerEvento: (recibo) =>
      daCarteira(
        cadeia,
        carteira.carteira,
        parseEventLogs({ abi: cadeia.controle.abi, eventName: "OfertaEncerrada", logs: eventosDoControle(cadeia, recibo) })
          .map(({ args }) => args)
          .filter(({ estadoFinal }) => ESTADOS[estadoFinal] === "cancelado"),
      ),
    dados: ({ id }) => ({ oferta: id.toString() }),
    naoAconteceu: "O cancelamento não aconteceu: a oferta continua aberta.",
  });
  return "erro" in registro ? registro : { id: registro.id, estado: "cancelado" };
}

const CADUCOU = { erro: "Esta oferta caducou: passaram os 90 dias sem liquidação." };

/**
 * O relógio da cadeia, e não o do servidor: é por ele que o contrato decide
 * se um prazo venceu.
 */
export async function agoraNaCadeia(cadeia: Cadeia) {
  return data((await cadeia.leitor.getBlock()).timestamp);
}

/**
 * O silêncio do Ibiti vencido vira decisão on-chain na mesma operação da
 * indicação: 30 dias sem resposta à preferência valem como recusa, e 15 dias
 * sem decidir o crivo valem como veto do comprador anterior.
 */
function silencioVencido(cadeia: Cadeia, oferta: OfertaDeRevenda, agora: Date): Chamada[] | null {
  const declarar = (functionName: "expirarPreferencia" | "expirarCrivo") => [
    { to: cadeia.controle.address, data: encodeFunctionData({ abi: cadeia.controle.abi, functionName, args: [oferta.id] }) },
  ];
  if (oferta.estado === "recusado") return [];
  if (oferta.estado === "ofertado" && agora > oferta.preferenciaAte) return declarar("expirarPreferencia");
  if (oferta.estado === "em_crivo" && oferta.crivoAte && agora > oferta.crivoAte) return declarar("expirarCrivo");
  return null;
}

export async function prepararIndicacao(
  { banco, cadeia }: Pick<Dependencias, "banco" | "cadeia">,
  perfilId: string,
  { id, comprador }: { id: bigint; comprador: string },
): Promise<Resultado<{ chamadas: Chamada[] }>> {
  const carteira = await investidorComCarteira({ banco }, perfilId);
  if (!carteira) return NAO_HABILITADA;
  const oferta = await ofertaDoVendedor(cadeia, carteira.carteira, id);
  if ("erro" in oferta) return oferta;
  const agora = await agoraNaCadeia(cadeia);
  const antes = silencioVencido(cadeia, oferta, agora);
  if (!antes) {
    return { erro: "Só dá para indicar um comprador depois que o Ibiti recusa a preferência ou veta o anterior." };
  }
  if (agora > oferta.caducaEm) return CADUCOU;

  comprador = comprador.trim();
  if (!isAddress(comprador)) return { erro: "Informe o endereço da carteira do comprador, que começa com 0x." };
  if (isAddressEqual(comprador, carteira.carteira)) return { erro: "Você não pode indicar a própria carteira." };
  const { data, error } = await banco
    .from("carteiras")
    .select("id")
    .eq("endereco", comprador.toLowerCase())
    .eq("tipo", "embutida")
    .eq("status", "habilitada")
    .maybeSingle();
  if (error) throw new Error(`falha ao conferir a carteira do comprador ${comprador}: ${error.message}`);
  if (!data) return { erro: "O comprador precisa ser um investidor com carteira habilitada na plataforma." };

  return {
    chamadas: [
      ...antes,
      {
        to: cadeia.controle.address,
        data: encodeFunctionData({
          abi: cadeia.controle.abi,
          functionName: "indicarComprador",
          args: [id, getAddress(comprador)],
        }),
      },
    ],
  };
}

export async function registrarIndicacao(
  { banco, cadeia }: Pick<Dependencias, "banco" | "cadeia">,
  perfilId: string,
  { txHash }: { txHash: Hash },
): Promise<Resultado<{ id: bigint; comprador: Address }>> {
  const carteira = await investidorComCarteira({ banco }, perfilId);
  if (!carteira) return NAO_HABILITADA;
  return registrarNaRevenda({ banco, cadeia }, carteira, perfilId, {
    txHash,
    tipo: "revenda_indicacao",
    // O evento não traz o vendedor: confere no contrato, porque o recibo de um bundle pode ter eventos de outros.
    lerEvento: (recibo) =>
      daCarteira(
        cadeia,
        carteira.carteira,
        parseEventLogs({ abi: cadeia.controle.abi, eventName: "CompradorIndicado", logs: eventosDoControle(cadeia, recibo) }).map(
          ({ args }) => args,
        ),
      ),
    dados: ({ id, comprador }) => ({ oferta: id.toString(), comprador }),
    naoAconteceu: "A indicação não aconteceu: o contrato não registrou o comprador.",
  });
}

/**
 * O comprador aprovado paga via PIX (simulado), a conta agente converte o
 * valor em stablecoin para a Safe dele, e a Safe aprova e liquida numa
 * operação só, como na compra. O preço final nunca fica abaixo do ofertado.
 * Se a Safe já tem a stablecoin de uma tentativa anterior, nada é cobrado de novo.
 */
export async function pagarLiquidacao(
  { banco, cadeia, pagamento }: Pick<Dependencias, "banco" | "cadeia" | "pagamento">,
  perfilId: string,
  { id, precoCentavos }: { id: bigint; precoCentavos: number },
): Promise<Resultado<{ chamadas: Chamada[]; conversao: Hash | null }>> {
  const carteira = await investidorComCarteira({ banco }, perfilId);
  if (!carteira) return NAO_HABILITADA;
  const oferta = await lerOferta(cadeia, id);
  if (!oferta) return NAO_ENCONTRADA;
  const aprovadoParaMim =
    oferta.estado === "aprovado" && !!oferta.compradorIndicado && isAddressEqual(oferta.compradorIndicado, carteira.carteira);
  if (!aprovadoParaMim) return { erro: "Só o comprador aprovado liquida esta revenda." };
  if ((await agoraNaCadeia(cadeia)) > oferta.caducaEm) return CADUCOU;
  if (!Number.isSafeInteger(precoCentavos) || BigInt(precoCentavos) * UNIDADES_POR_CENTAVO < oferta.preco) {
    return { erro: `O preço final não pode ficar abaixo do ofertado, ${formatarReais(oferta.precoCentavos)}.` };
  }

  const precoFinal = BigInt(precoCentavos) * UNIDADES_POR_CENTAVO;
  const chamadas = [
    {
      to: cadeia.stable.address,
      data: encodeFunctionData({ abi: cadeia.stable.abi, functionName: "approve", args: [cadeia.controle.address, precoFinal] }),
    },
    {
      to: cadeia.controle.address,
      data: encodeFunctionData({ abi: cadeia.controle.abi, functionName: "liquidar", args: [id, precoFinal] }),
    },
  ];
  const saldo = await cadeia.stable.read.balanceOf([carteira.carteira]);
  if (saldo >= precoFinal) return { chamadas, conversao: null };

  const falta = precoFinal - saldo;
  const cobranca = await pagamento.cobrarPix((falta + UNIDADES_POR_CENTAVO - 1n) / UNIDADES_POR_CENTAVO);
  if (!cobranca.aprovada) return { erro: "O PIX não foi aprovado." };
  let conversao: Hash;
  try {
    conversao = await enviarTransacao(
      { banco, cadeia },
      {
        perfilId,
        carteiraId: carteira.carteiraId,
        tipo: "revenda_liquidacao",
        dados: { etapa: "conversao", oferta: id.toString(), valor: falta.toString() },
      },
      () => cadeia.stable.write.emitirPara([carteira.carteira, falta]),
    );
  } catch (erro) {
    return { erro: `A conversão para stablecoin falhou: ${mensagemDeErro(erro)}` };
  }
  return { chamadas, conversao };
}

export async function registrarLiquidacao(
  { banco, cadeia }: Pick<Dependencias, "banco" | "cadeia">,
  perfilId: string,
  { txHash }: { txHash: Hash },
): Promise<Resultado<{ id: bigint; quantidade: bigint }>> {
  const carteira = await investidorComCarteira({ banco }, perfilId);
  if (!carteira) return NAO_HABILITADA;
  const registro = await registrarNaRevenda({ banco, cadeia }, carteira, perfilId, {
    txHash,
    tipo: "revenda_liquidacao",
    lerEvento: (recibo) =>
      parseEventLogs({
        abi: cadeia.controle.abi,
        eventName: "RevendaLiquidada",
        logs: eventosDoControle(cadeia, recibo),
        args: { comprador: carteira.carteira },
      })[0]?.args,
    dados: ({ id, quantidade, precoFinal }) => ({
      etapa: "liquidacao",
      oferta: id.toString(),
      quantidade: Number(quantidade),
      valor: precoFinal.toString(),
    }),
    naoAconteceu: "A liquidação não aconteceu: o contrato não entregou o lote.",
  });
  return "erro" in registro ? registro : { id: registro.id, quantidade: registro.quantidade };
}
