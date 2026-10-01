import {
  createPublicClient,
  createWalletClient,
  getContract,
  http,
  type Account,
  type Address,
  type Chain,
} from "viem";
import { bRLStableMockAbi } from "@/contratos/abis/BRLStableMock";
import { controleTransferenciaAbi } from "@/contratos/abis/ControleTransferencia";
import { distribuicaoAbi } from "@/contratos/abis/Distribuicao";
import { ibitiPassAbi } from "@/contratos/abis/IbitiPass";
import { ofertaAbi } from "@/contratos/abis/Oferta";
import { recolocacaoAbi } from "@/contratos/abis/Recolocacao";
import { registroHabilitadosAbi } from "@/contratos/abis/RegistroHabilitados";
import { regrasConformidadeAbi } from "@/contratos/abis/RegrasConformidade";
import { tokenRoyaltyAbi } from "@/contratos/abis/TokenRoyalty";
import type { enderecos } from "@/contratos/enderecos";

export type Enderecos = Record<keyof typeof enderecos, Address>;

export interface ConfiguracaoCadeia {
  chain: Chain;
  rpcUrl: string;
  /** Conta agente: habilita carteiras, publica o catálogo e emite a stablecoin mock. */
  agente: Account;
  enderecos: Enderecos;
  /** Primeiro bloco com eventos dos contratos: a leitura de eventos começa nele. */
  blocoInicial: bigint;
}

/** Os RPCs públicos recusam `eth_getLogs` com mais de 50 mil blocos. */
const JANELA_DE_BLOCOS = 40_000n;

export interface Janela {
  fromBlock: bigint;
  toBlock: bigint;
}

export function criarCadeia({ chain, rpcUrl, agente, enderecos, blocoInicial }: ConfiguracaoCadeia) {
  const transport = http(rpcUrl);
  const leitor = createPublicClient({ chain, transport });
  const escritor = createWalletClient({ chain, transport, account: agente });
  const client = { public: leitor, wallet: escritor };

  /** Faz a consulta de eventos do bloco inicial até o último, em janelas que o RPC aceita. */
  async function emJanelas<T>(consulta: (janela: Janela) => Promise<T[]>) {
    const ultimo = await leitor.getBlockNumber();
    const eventos: T[] = [];
    for (let de = blocoInicial; de <= ultimo; de += JANELA_DE_BLOCOS) {
      const ate = de + JANELA_DE_BLOCOS - 1n;
      eventos.push(...(await consulta({ fromBlock: de, toBlock: ate < ultimo ? ate : ultimo })));
    }
    return eventos;
  }

  return {
    leitor,
    agente: escritor,
    enderecos,
    emJanelas,
    registro: getContract({ address: enderecos.RegistroHabilitados, abi: registroHabilitadosAbi, client }),
    conformidade: getContract({ address: enderecos.RegrasConformidade, abi: regrasConformidadeAbi, client }),
    token: getContract({ address: enderecos.TokenRoyalty, abi: tokenRoyaltyAbi, client }),
    stable: getContract({ address: enderecos.BRLStableMock, abi: bRLStableMockAbi, client }),
    oferta: getContract({ address: enderecos.Oferta, abi: ofertaAbi, client }),
    recolocacao: getContract({ address: enderecos.Recolocacao, abi: recolocacaoAbi, client }),
    distribuicao: getContract({ address: enderecos.Distribuicao, abi: distribuicaoAbi, client }),
    controle: getContract({ address: enderecos.ControleTransferencia, abi: controleTransferenciaAbi, client }),
    ibitiPass: getContract({ address: enderecos.IbitiPass, abi: ibitiPassAbi, client }),
  };
}

export type Cadeia = ReturnType<typeof criarCadeia>;
