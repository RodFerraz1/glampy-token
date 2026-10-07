import type { Hash } from "viem";
import type { Governanca, SafeDeGovernanca } from "@/servidor/adaptadores/governanca";
import { clientesLocais, contasLocais } from "../ambiente/rede-local";

const LIMIAR: Record<SafeDeGovernanca, { necessarias: number; donos: number }> = {
  tesouraria: { necessarias: 2, donos: 3 },
  crivo: { necessarias: 2, donos: 3 },
  reatribuicao: { necessarias: 3, donos: 5 },
};

/**
 * Na rede local cada Safe é uma conta comum, que assina sozinha pelo limiar
 * inteiro. Várias chamadas vão uma a uma, e o hash devolvido é o da última.
 */
export function criarGovernancaFalsa(): Governanca {
  const { leitor, escritor } = clientesLocais();

  return {
    async executar(safe, chamadas) {
      let hash: Hash | undefined;
      for (const { to, data, value } of chamadas) {
        hash = await escritor.sendTransaction({ account: contasLocais[safe], to, data, value });
        const recibo = await leitor.waitForTransactionReceipt({ hash });
        if (recibo.status !== "success") throw new Error(`decisão da ${safe} reverteu: ${hash}`);
      }
      if (!hash) throw new Error("nenhuma chamada para executar");
      const { necessarias, donos } = LIMIAR[safe];
      return { hash, assinaturas: necessarias, necessarias, donos };
    },
  };
}
