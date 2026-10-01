import { getAddress, type Hash } from "viem";
import { linkDoEndereco } from "@/explorador";
import type { Dependencias } from "@/servidor/adaptadores";
import { listarApuracoes } from "./apuracoes";
import { listarVersoes } from "./catalogo";
import { distribuicaoDosTokens } from "./circulacao";

export type TipoDeDecisao = "catalogo_publicado" | "comprador_aprovado" | "comprador_vetado" | "reatribuicao_anunciada";

export interface DecisaoEstrutural {
  tipo: TipoDeDecisao;
  /** O número on-chain: a versão do catálogo, a oferta de revenda ou a reatribuição. */
  referencia: bigint;
  em: Date;
  bloco: bigint;
  txHash: Hash;
}

const data = (segundos: bigint) => new Date(Number(segundos) * 1000);

/**
 * O registro público de decisões estruturais, montado dos eventos on-chain, o
 * mais recente primeiro. Não leva endereço nem motivo: quem avalia a oferta vê
 * o que foi decidido e quando, sem identificar ninguém.
 */
async function decisoesNaCadeia({ cadeia }: Pick<Dependencias, "cadeia">): Promise<DecisaoEstrutural[]> {
  const [catalogos, aprovados, vetados, reatribuicoes] = await Promise.all([
    cadeia.emJanelas((janela) => cadeia.ibitiPass.getEvents.CatalogoPublicado({}, janela)),
    cadeia.emJanelas((janela) => cadeia.controle.getEvents.CompradorAprovado({}, janela)),
    cadeia.emJanelas((janela) => cadeia.controle.getEvents.CompradorVetado({}, janela)),
    cadeia.emJanelas((janela) => cadeia.token.getEvents.ReatribuicaoAnunciada({}, janela)),
  ]);
  const esperaDaReatribuicao = await cadeia.token.read.ESPERA_REATRIBUICAO();

  return [
    ...catalogos.map(({ args, blockNumber, transactionHash }) => ({
      tipo: "catalogo_publicado" as const,
      referencia: BigInt(args.versao ?? 0),
      em: data(args.quando ?? 0n),
      bloco: blockNumber,
      txHash: transactionHash,
    })),
    ...aprovados.map(({ args, blockNumber, transactionHash }) => ({
      tipo: "comprador_aprovado" as const,
      referencia: args.id ?? 0n,
      em: data(args.quando ?? 0n),
      bloco: blockNumber,
      txHash: transactionHash,
    })),
    ...vetados.map(({ args, blockNumber, transactionHash }) => ({
      tipo: "comprador_vetado" as const,
      referencia: args.id ?? 0n,
      em: data(args.quando ?? 0n),
      bloco: blockNumber,
      txHash: transactionHash,
    })),
    ...reatribuicoes.map(({ args, blockNumber, transactionHash }) => ({
      tipo: "reatribuicao_anunciada" as const,
      referencia: args.id ?? 0n,
      // O evento traz quando pode ser executada; o anúncio foi sete dias antes.
      em: data((args.executavelApos ?? 0n) - esperaDaReatribuicao),
      bloco: blockNumber,
      txHash: transactionHash,
    })),
  ].sort((a, b) => b.em.getTime() - a.em.getTime() || (a.bloco === b.bloco ? 0 : a.bloco > b.bloco ? -1 : 1));
}

/**
 * A página pública: contratos, catálogo, apurações simuladas, quantos detêm o
 * token e quantos estão em circulação, e as decisões estruturais.
 */
export async function consultarTransparencia({ banco, cadeia }: Pick<Dependencias, "banco" | "cadeia">) {
  const [versoesDoCatalogo, apuracoes, detentores, tokens, decisoes] = await Promise.all([
    listarVersoes({ banco }),
    listarApuracoes({ banco }),
    cadeia.conformidade.read.totalDeDetentores(),
    distribuicaoDosTokens(cadeia),
    decisoesNaCadeia({ cadeia }),
  ]);
  return {
    contratos: Object.entries(cadeia.enderecos).map(([nome, endereco]) => ({
      nome,
      endereco: getAddress(endereco),
      link: linkDoEndereco(getAddress(endereco)),
    })),
    versoesDoCatalogo,
    apuracoes,
    detentores: Number(detentores),
    emissaoTotal: tokens.emissaoTotal,
    emCirculacao: tokens.comInvestidores,
    decisoes,
  };
}
