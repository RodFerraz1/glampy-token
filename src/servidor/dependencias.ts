import "server-only";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { BLOCO_DA_PUBLICACAO, enderecos } from "@/contratos/enderecos";
import type { Dependencias } from "./adaptadores";
import { criarBanco, type Banco } from "./adaptadores/banco";
import { criarCadeia } from "./adaptadores/cadeia";
import { criarContaInteligenteSafe } from "./adaptadores/conta-inteligente";
import { criarGovernancaSafe } from "./adaptadores/governanca";
import { criarPagamentoSimulado } from "./adaptadores/pagamento";

const SAFES_SEPOLIA = {
  tesouraria: "0x35E28D51BE3874c968771b4174e02E77f3F823B4",
  crivo: "0x114Ee730D3B683a013FE239Bcd3b18d8dc7825a7",
  reatribuicao: "0x84e64bdB9D3D383c8aDE10D18341FaFD3E309Bc6",
} as const;

function exigir(variavel: string) {
  const valor = process.env[variavel];
  if (!valor) throw new Error(`variável de ambiente ${variavel} ausente`);
  return valor;
}

/** O RPC público descarta logs com mais de alguns dias; este serve os eventos desde a publicação. */
const RPC_DE_EVENTOS = "https://sepolia.gateway.tenderly.co";

const chave = (valor: string) => (valor.startsWith("0x") ? valor : `0x${valor}`) as `0x${string}`;

function montar(): Dependencias {
  const rpcUrl = exigir("NEXT_PUBLIC_SEPOLIA_RPC_URL");
  const agente = privateKeyToAccount(chave(exigir("AGENTE_PRIVATE_KEY")));
  const diretores = [1, 2, 3, 4, 5]
    .map((n) => process.env[`DIRETOR_${n}_PRIVATE_KEY`])
    .filter((valor): valor is string => !!valor)
    .map((valor) => privateKeyToAccount(chave(valor)));

  return {
    banco: obterBanco(),
    cadeia: criarCadeia({
      chain: sepolia,
      rpcUrl,
      rpcDeEventos: process.env.SEPOLIA_RPC_DE_EVENTOS || RPC_DE_EVENTOS,
      agente,
      enderecos,
      blocoInicial: BLOCO_DA_PUBLICACAO,
    }),
    contaInteligente: criarContaInteligenteSafe({ chain: sepolia, rpcUrl }),
    pagamento: criarPagamentoSimulado(),
    governanca: criarGovernancaSafe({ chain: sepolia, rpcUrl, executor: agente, safes: SAFES_SEPOLIA, diretores }),
  };
}

let banco: Banco | undefined;

/** Só o banco, para operações que não tocam a cadeia e não devem exigir as chaves dela. */
export function obterBanco() {
  return (banco ??= criarBanco({
    url: exigir("NEXT_PUBLIC_SUPABASE_URL"),
    chaveSecreta: exigir("SUPABASE_SECRET_KEY"),
  }));
}

let dependencias: Dependencias | undefined;

/** Adaptadores reais, montados das variáveis de ambiente do servidor. */
export function obterDependencias() {
  return (dependencias ??= montar());
}

/** Bundler e paymaster da Pimlico na Sepolia. Leva a API key: só o servidor chama. */
export function urlDaPimlico() {
  return `https://api.pimlico.io/v2/${sepolia.id}/rpc?apikey=${exigir("NEXT_PIMLICO_API_KEY")}`;
}
