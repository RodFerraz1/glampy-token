import { createSmartAccountClient } from "permissionless";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { BaseError, createPublicClient, http, type Address, type Hash } from "viem";
import { sepolia } from "viem/chains";
import type { Chamada } from "@/servidor/adaptadores/conta-inteligente";
import { contaSafe, ENTRY_POINT, type Passkey } from "./safe";

/** A operação foi aceita pelo bundler, mas o recibo não veio: ela pode ainda ser incluída. */
export class OperacaoSemRecibo extends Error {
  constructor(
    readonly operacao: Hash,
    options?: ErrorOptions,
  ) {
    super("A operação foi enviada, mas a confirmação da rede demorou.", options);
  }
}

const rotaDaPimlico = () => http(`${window.location.origin}/api/pimlico`);
const clienteDaPimlico = () => createPimlicoClient({ transport: rotaDaPimlico(), entryPoint: ENTRY_POINT });

/** Espera o recibo de uma operação já enviada, sem assinar nem enviar de novo. */
export async function aguardarOperacao(operacao: Hash): Promise<{ txHash: Hash; sucesso: boolean }> {
  try {
    const { success, receipt } = await clienteDaPimlico().waitForUserOperationReceipt({ hash: operacao });
    return { txHash: receipt.transactionHash, sucesso: success };
  } catch (causa) {
    throw new OperacaoSemRecibo(operacao, { cause: causa });
  }
}

/**
 * Executa as chamadas numa única operação da Safe, assinada uma vez com a
 * passkey. Só roda no navegador: o bundler e o paymaster são alcançados por
 * `/api/pimlico`, que guarda a API key e filtra o patrocínio.
 */
export async function executarNaSafe({
  passkey,
  carteira,
  chamadas,
}: {
  passkey: Passkey;
  carteira: Address;
  chamadas: Chamada[];
}): Promise<{ txHash: Hash; sucesso: boolean }> {
  const leitor = createPublicClient({ chain: sepolia, transport: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL) });
  const pimlico = clienteDaPimlico();
  const cliente = createSmartAccountClient({
    account: await contaSafe(leitor, passkey, carteira),
    chain: sepolia,
    bundlerTransport: rotaDaPimlico(),
    paymaster: pimlico,
    userOperation: { estimateFeesPerGas: async () => (await pimlico.getUserOperationGasPrice()).fast },
  });

  const operacao = await cliente.sendUserOperation({ calls: chamadas });
  return aguardarOperacao(operacao);
}

/** A falha da operação da Safe como o investidor entende, com o cancelamento da biometria à parte. */
export function mensagemDaCarteira(erro: unknown) {
  if (erro instanceof OperacaoSemRecibo) return `${erro.message} Tente de novo para acompanhar, sem repetir a operação.`;
  const texto = erro instanceof BaseError ? erro.shortMessage : erro instanceof Error ? erro.message : String(erro);
  if (/NotAllowedError|not allowed|cancel/i.test(texto)) return "A confirmação foi cancelada ou não foi concluída.";
  return `A operação da carteira falhou: ${texto}`;
}
