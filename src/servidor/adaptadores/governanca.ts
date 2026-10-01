import {
  concat,
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  zeroAddress,
  type Account,
  type Address,
  type Chain,
  type Hash,
  type Hex,
} from "viem";
import { empacotarChamadas } from "@/carteira/safe";
import type { Chamada } from "./conta-inteligente";

export type SafeDeGovernanca = "tesouraria" | "crivo" | "reatribuicao";

export interface ExecucaoDeGovernanca {
  hash: Hash;
  /** Colhidas, das `donos` possíveis; a Safe exige `necessarias`. */
  assinaturas: number;
  necessarias: number;
  donos: number;
}

/**
 * Decisões que exigem as assinaturas dos diretores: tesouraria e crivo 2 de 3,
 * reatribuição 3 de 5. Várias chamadas vão numa transação só da Safe.
 */
export interface Governanca {
  executar(safe: SafeDeGovernanca, chamadas: Chamada[]): Promise<ExecucaoDeGovernanca>;
}

const abiSafe = parseAbi([
  "function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) payable returns (bool)",
  "function getTransactionHash(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, uint256 _nonce) view returns (bytes32)",
  "function nonce() view returns (uint256)",
  "function getOwners() view returns (address[])",
  "function getThreshold() view returns (uint256)",
]);

export interface ConfiguracaoGovernancaSafe {
  chain: Chain;
  rpcUrl: string;
  /** Quem submete `execTransaction` e paga o gas. */
  executor: Account;
  safes: Record<SafeDeGovernanca, Address>;
  /** Chaves de demonstração dos diretores, as mesmas da Sprint 04. */
  diretores: Account[];
}

/** Colhe as assinaturas como `scripts/concluir-genese.mjs` da Sprint 04 e executa pela Safe. */
export function criarGovernancaSafe({
  chain,
  rpcUrl,
  executor,
  safes,
  diretores,
}: ConfiguracaoGovernancaSafe): Governanca {
  const transport = http(rpcUrl);
  const leitor = createPublicClient({ chain, transport });
  const escritor = createWalletClient({ chain, transport, account: executor });

  return {
    async executar(qual, chamadas) {
      const { to, value, data, operacao } = empacotarChamadas(
        chamadas.map(({ to, data, value = 0n }) => ({ to, data, value })),
      );
      const safe = safes[qual];
      const [donos, limiar, nonce] = await Promise.all([
        leitor.readContract({ address: safe, abi: abiSafe, functionName: "getOwners" }),
        leitor.readContract({ address: safe, abi: abiSafe, functionName: "getThreshold" }),
        leitor.readContract({ address: safe, abi: abiSafe, functionName: "nonce" }),
      ]);
      const pacote = await leitor.readContract({
        address: safe,
        abi: abiSafe,
        functionName: "getTransactionHash",
        args: [to, value, data, operacao, 0n, 0n, 0n, zeroAddress, zeroAddress, nonce],
      });

      // A Safe exige as assinaturas em ordem crescente de endereço do signatário.
      const signatarios = diretores
        .filter((d) => donos.some((dono) => dono.toLowerCase() === d.address.toLowerCase()))
        .sort((a, b) => (BigInt(a.address) < BigInt(b.address) ? -1 : 1))
        .slice(0, Number(limiar));
      if (BigInt(signatarios.length) < limiar) {
        throw new Error(`a Safe ${qual} exige ${limiar} assinaturas e há ${signatarios.length} diretores donos`);
      }

      const assinaturas: Hex[] = [];
      for (const diretor of signatarios) {
        if (!diretor.sign) throw new Error(`o diretor ${diretor.address} não assina hashes`);
        assinaturas.push(await diretor.sign({ hash: pacote }));
      }

      const hash = await escritor.writeContract({
        address: safe,
        abi: abiSafe,
        functionName: "execTransaction",
        args: [to, value, data, operacao, 0n, 0n, 0n, zeroAddress, zeroAddress, concat(assinaturas)],
      });
      const recibo = await leitor.waitForTransactionReceipt({ hash });
      if (recibo.status !== "success") throw new Error(`execTransaction da Safe ${qual} reverteu: ${hash}`);

      return { hash, assinaturas: signatarios.length, necessarias: Number(limiar), donos: donos.length };
    },
  };
}
