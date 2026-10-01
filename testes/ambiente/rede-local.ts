import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createPublicClient,
  createTestClient,
  createWalletClient,
  http,
  keccak256,
  toBytes,
  type Abi,
  type Address,
  type Hex,
} from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";
import type { Enderecos } from "@/servidor/adaptadores/cadeia";

/**
 * Publicação dos contratos v2 numa rede Hardhat local, a mesma sequência de
 * `publicarSistema` e `publicarBeneficios` em `apoio/ambiente.ts` da Sprint 04,
 * lendo o bytecode dos artefatos compilados daquela sprint.
 *
 * Diferença deliberada: tesouraria, crivo e reatribuição são contas distintas,
 * para que o adaptador falso de governança assine por cada uma delas como a
 * Safe correspondente assinaria.
 */

export const PASTA_SPRINT_04 = join(
  process.cwd(),
  "..",
  "..",
  "Sprint 04",
  "Implementação do Contrato Inteligente ERC-20 - versão 2",
);

export const RPC_LOCAL = process.env.RPC_LOCAL ?? "http://127.0.0.1:8546";

const MNEMONICO_HARDHAT = "test test test test test test test test test test test junk";

export const contasLocais = {
  agente: mnemonicToAccount(MNEMONICO_HARDHAT, { addressIndex: 0 }),
  tesouraria: mnemonicToAccount(MNEMONICO_HARDHAT, { addressIndex: 1 }),
  crivo: mnemonicToAccount(MNEMONICO_HARDHAT, { addressIndex: 2 }),
  reatribuicao: mnemonicToAccount(MNEMONICO_HARDHAT, { addressIndex: 3 }),
};

/** R$ 32.641,78 por token, com as 6 casas do BRLStableMock (WP §3.4). */
export const PRECO_UNITARIO = 32_641_780_000n;

const FLOAT = 200n;

const papel = (nome: string) => keccak256(toBytes(nome));

function artefato(nome: string, pasta = "") {
  const caminho = join(PASTA_SPRINT_04, "artifacts", "contracts", pasta, `${nome}.sol`, `${nome}.json`);
  const { abi, bytecode } = JSON.parse(readFileSync(caminho, "utf8"));
  return { abi: abi as Abi, bytecode: bytecode as Hex };
}

export function clientesLocais() {
  const transport = http(RPC_LOCAL);
  return {
    leitor: createPublicClient({ chain: hardhat, transport }),
    escritor: createWalletClient({ chain: hardhat, transport }),
    teste: createTestClient({ chain: hardhat, mode: "hardhat", transport }),
  };
}

export async function publicarSistemaLocal(): Promise<Enderecos> {
  const { leitor, escritor } = clientesLocais();
  const { agente, tesouraria, crivo, reatribuicao } = contasLocais;

  async function publicar(nome: string, args: unknown[], pasta?: string) {
    const { abi, bytecode } = artefato(nome, pasta);
    const hash = await escritor.deployContract({ abi, bytecode, args, account: agente });
    const recibo = await leitor.waitForTransactionReceipt({ hash });
    if (!recibo.contractAddress) throw new Error(`${nome} não foi publicado: ${hash}`);
    return recibo.contractAddress;
  }

  async function chamar(
    endereco: Address,
    nome: string,
    funcao: string,
    args: unknown[],
    conta = agente,
  ) {
    const hash = await escritor.writeContract({
      address: endereco,
      abi: artefato(nome).abi,
      functionName: funcao,
      args,
      account: conta,
    });
    const recibo = await leitor.waitForTransactionReceipt({ hash });
    if (recibo.status !== "success") throw new Error(`${nome}.${funcao} reverteu: ${hash}`);
  }

  const registro = await publicar("RegistroHabilitados", [agente.address, tesouraria.address]);
  const conformidade = await publicar("RegrasConformidade", [agente.address, registro]);
  const token = await publicar("TokenRoyalty", [tesouraria.address, conformidade, reatribuicao.address]);
  const stable = await publicar("BRLStableMock", [6], "mocks");
  const oferta = await publicar("Oferta", [token, stable, tesouraria.address, PRECO_UNITARIO]);
  const recolocacao = await publicar("Recolocacao", [token, stable, tesouraria.address, PRECO_UNITARIO]);
  const distribuicao = await publicar("Distribuicao", [
    agente.address, token, stable, conformidade, oferta, tesouraria.address,
  ]);
  const controle = await publicar("ControleTransferencia", [
    agente.address, token, conformidade, stable, tesouraria.address,
  ]);

  await chamar(registro, "RegistroHabilitados", "grantRole", [papel("AGENTE_REGISTRO"), agente.address]);
  await chamar(registro, "RegistroHabilitados", "grantRole", [papel("CURADOR_ISENCAO"), agente.address]);
  await chamar(conformidade, "RegrasConformidade", "grantRole", [papel("CURADOR_ORIGENS"), agente.address]);
  await chamar(conformidade, "RegrasConformidade", "grantRole", [papel("CONTROLE_TRANSFERENCIA"), controle]);
  await chamar(distribuicao, "Distribuicao", "grantRole", [papel("TESOURARIA"), tesouraria.address]);
  await chamar(controle, "ControleTransferencia", "grantRole", [papel("TESOURARIA"), tesouraria.address]);
  await chamar(controle, "ControleTransferencia", "grantRole", [papel("CRIVO"), crivo.address]);

  // Isenções antes de `definirToken`, que fecha o conjunto.
  await chamar(registro, "RegistroHabilitados", "definirIsencao", [tesouraria.address, true]);
  await chamar(registro, "RegistroHabilitados", "definirIsencao", [oferta, true]);
  await chamar(registro, "RegistroHabilitados", "definirIsencao", [recolocacao, true]);

  await chamar(registro, "RegistroHabilitados", "definirToken", [token]);
  await chamar(conformidade, "RegrasConformidade", "definirToken", [token, tesouraria.address]);

  for (const origem of [tesouraria.address, oferta, recolocacao, controle, reatribuicao.address]) {
    await chamar(conformidade, "RegrasConformidade", "definirOrigemAutorizada", [origem, true]);
  }

  // Gênese, que na Sepolia a Safe da tesouraria assina em `concluir-genese.mjs`.
  await chamar(token, "TokenRoyalty", "definirControleTransferencia", [controle], tesouraria);
  await chamar(token, "TokenRoyalty", "definirDistribuicao", [distribuicao], tesouraria);
  await chamar(token, "TokenRoyalty", "transfer", [oferta, FLOAT], tesouraria);

  // Como na Sepolia, o primeiro ciclo de benefícios abre na publicação.
  const { timestamp } = await leitor.getBlock();
  const ibitiPass = await publicar("IbitiPass", [
    agente.address, token, tesouraria.address, registro, timestamp,
  ]);
  await chamar(ibitiPass, "IbitiPass", "grantRole", [papel("OBSERVADOR_POSICAO"), conformidade]);
  await chamar(ibitiPass, "IbitiPass", "grantRole", [papel("OPERADOR_RESGATE"), agente.address]);
  await chamar(ibitiPass, "IbitiPass", "grantRole", [papel("CURADOR_CATALOGO"), agente.address]);
  await chamar(conformidade, "RegrasConformidade", "grantRole", [papel("CURADOR_BENEFICIOS"), agente.address]);
  await chamar(conformidade, "RegrasConformidade", "definirBeneficios", [ibitiPass]);

  return {
    RegistroHabilitados: registro,
    RegrasConformidade: conformidade,
    TokenRoyalty: token,
    BRLStableMock: stable,
    Oferta: oferta,
    Recolocacao: recolocacao,
    Distribuicao: distribuicao,
    ControleTransferencia: controle,
    IbitiPass: ibitiPass,
  };
}

/**
 * Avança o relógio da rede local só durante `corpo`: o nó é compartilhado
 * pelas suítes, e o tempo avançado não pode vazar para as outras.
 */
export async function comRelogioAdiantado<T>(segundos: number, corpo: () => Promise<T>) {
  const { teste } = clientesLocais();
  const retrato = await teste.snapshot();
  try {
    await teste.increaseTime({ seconds: segundos });
    await teste.mine({ blocks: 1 });
    return await corpo();
  } finally {
    await teste.revert({ id: retrato });
  }
}
