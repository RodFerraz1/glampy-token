import { createPublicClient, http, type Address, type Chain, type Hash, type Hex } from "viem";
import { contaSafe, type Passkey } from "@/carteira/safe";

export interface Chamada {
  to: Address;
  data: Hex;
  value?: bigint;
}

/**
 * Carteira do investidor: uma Safe com passkey como dona, com gas patrocinado
 * pelo paymaster. As chamadas vão numa única operação, confirmada uma vez só.
 */
export interface ContaInteligente {
  /** Endereço contrafactual da Safe da passkey. A Safe só é implantada na primeira operação patrocinada. */
  enderecoDaCarteira(passkey: Passkey): Promise<Address>;
  executar(carteira: Address, chamadas: Chamada[]): Promise<Hash>;
}

export interface ConfiguracaoContaInteligenteSafe {
  chain: Chain;
  rpcUrl: string;
}

/** Safe com passkey via permissionless.js, bundler e paymaster da Pimlico. */
export function criarContaInteligenteSafe({ chain, rpcUrl }: ConfiguracaoContaInteligenteSafe): ContaInteligente {
  const leitor = createPublicClient({ chain, transport: http(rpcUrl) });
  return {
    async enderecoDaCarteira(passkey) {
      const conta = await contaSafe(leitor, passkey);
      return conta.getAddress();
    },

    async executar() {
      throw new Error("a Safe só executa com a passkey do investidor, no navegador");
    },
  };
}
