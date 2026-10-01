import type { Address, Hash } from "viem";
import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import type { ContaInteligente } from "@/servidor/adaptadores/conta-inteligente";
import { clientesLocais } from "../ambiente/rede-local";

/**
 * No lugar da Safe com passkey e do paymaster, uma conta comum financiada na
 * rede local. As chamadas vão uma a uma, e o hash devolvido é o da última.
 */
export function criarContaInteligenteFalsa() {
  const { leitor, escritor, teste } = clientesLocais();
  const contas = new Map<Address, PrivateKeyAccount>();

  const conta: ContaInteligente & { criarCarteira(): Promise<Address> } = {
    /** Ignora a passkey: cada carteira é uma conta nova, financiada com 1 ETH. */
    async enderecoDaCarteira() {
      return conta.criarCarteira();
    },

    async criarCarteira() {
      const nova = privateKeyToAccount(generatePrivateKey());
      await teste.setBalance({ address: nova.address, value: 10n ** 18n });
      contas.set(nova.address, nova);
      return nova.address;
    },

    async executar(carteira, chamadas) {
      const dona = contas.get(carteira);
      if (!dona) throw new Error(`carteira ${carteira} não foi criada por este adaptador`);
      if (chamadas.length === 0) throw new Error("nenhuma chamada para executar");

      let hash: Hash | undefined;
      for (const { to, data, value } of chamadas) {
        hash = await escritor.sendTransaction({ account: dona, to, data, value });
        const recibo = await leitor.waitForTransactionReceipt({ hash });
        if (recibo.status !== "success") throw new Error(`chamada a ${to} reverteu: ${hash}`);
      }
      return hash!;
    },
  };
  return conta;
}
