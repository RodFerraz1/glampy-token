import { isAddress, isAddressEqual, isHex } from "viem";
import { chamadasDaOperacao } from "@/carteira/safe";
import type { Dependencias } from "@/servidor/adaptadores";
import { exigirPapel } from "@/servidor/autorizacao";
import { consultarCarteira } from "@/servidor/operacoes/carteira";

export interface RequisicaoJsonRpc {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: unknown[];
}

const CONSULTAS_DO_BUNDLER = new Set([
  "eth_chainId",
  "eth_supportedEntryPoints",
  "eth_getUserOperationByHash",
  "eth_getUserOperationReceipt",
  "pimlico_getUserOperationGasPrice",
  "pimlico_getUserOperationStatus",
]);
const ENVIOS_AO_BUNDLER = new Set(["eth_estimateUserOperationGas", "eth_sendUserOperation"]);
const PATROCINIO = new Set(["pm_getPaymasterStubData", "pm_getPaymasterData", "pm_sponsorUserOperation"]);

/**
 * Filtro da rota que leva o navegador ao bundler e ao paymaster da Pimlico,
 * já que a API key fica no servidor. Operações só da carteira do próprio
 * investidor, e patrocínio só para chamadas aos contratos da plataforma: a
 * política de patrocínio da Pimlico não restringe contratos, então é aqui.
 */
export async function autorizarRequisicaoAoPimlico(
  { banco, cadeia }: Pick<Dependencias, "banco" | "cadeia">,
  perfilId: string,
  { method, params = [] }: RequisicaoJsonRpc,
): Promise<{ autorizada: true } | { erro: string }> {
  await exigirPapel(banco, perfilId, "investidor");
  if (CONSULTAS_DO_BUNDLER.has(method)) return { autorizada: true };
  if (!ENVIOS_AO_BUNDLER.has(method) && !PATROCINIO.has(method)) return { erro: `O método ${method} não é permitido.` };

  const { sender, callData } = (params[0] ?? {}) as { sender?: unknown; callData?: unknown };
  const carteira = await consultarCarteira({ banco }, perfilId);
  if (!carteira || typeof sender !== "string" || !isAddress(sender) || !isAddressEqual(sender, carteira.endereco)) {
    return { erro: "A operação não é da sua carteira." };
  }
  if (!PATROCINIO.has(method)) return { autorizada: true };
  if (carteira.status === "desabilitada") return { erro: "Sua carteira está desabilitada. Fale com o Ibiti." };

  const chamadas = isHex(callData) ? chamadasDaOperacao(callData) : null;
  const daPlataforma = Object.values(cadeia.enderecos);
  if (!chamadas || chamadas.some(({ to }) => !daPlataforma.some((endereco) => isAddressEqual(endereco, to)))) {
    return { erro: "O patrocínio de gas só cobre os contratos da plataforma." };
  }
  return { autorizada: true };
}
