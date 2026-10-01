"use client";

import { useRef, useState } from "react";
import type { Address, Hash } from "viem";
import type { Chamada } from "@/servidor/adaptadores/conta-inteligente";
import { aguardarOperacao, executarNaSafe, mensagemDaCarteira, OperacaoSemRecibo } from "./executar-na-safe";
import type { Passkey } from "./safe";

/** Uma recusa `repetivel` pode ser tentada de novo com o mesmo hash. */
type Recusa = { erro: string; repetivel?: boolean };
const SEM_SERVIDOR: Recusa = { erro: "Não foi possível falar com o servidor.", repetivel: true };

/** O que já aconteceu on-chain e não pode ser refeito: a operação enviada ao bundler ou a transação incluída. */
type JaEnviada = { operacao: Hash } | { transacao: Hash };

/**
 * Prepara no servidor, executa na Safe com a passkey e registra no servidor.
 * Depois que a operação saiu do navegador, uma nova tentativa só acompanha e
 * registra o que já foi enviado: executar de novo repetiria a operação
 * on-chain. Uma recusa definitiva do registro já ficou gravada e libera uma
 * operação nova.
 */
export function useOperacaoNaSafe<T>({
  passkey,
  carteira,
  preparar,
  registrar,
  aoConcluir,
}: {
  passkey: Passkey;
  carteira: Address;
  preparar: () => Promise<{ chamadas: Chamada[] } | Recusa>;
  registrar: (txHash: Hash) => Promise<T | Recusa>;
  aoConcluir: (resultado: Exclude<T, Recusa>) => void;
}) {
  const [executando, setExecutando] = useState(false);
  const [erro, setErro] = useState<string>();
  const [jaEnviada, setJaEnviada] = useState<JaEnviada>();
  const emAndamento = useRef(false);

  async function transacaoDaOperacao(): Promise<Hash | Recusa> {
    try {
      if (jaEnviada && "transacao" in jaEnviada) return jaEnviada.transacao;
      if (jaEnviada) return (await aguardarOperacao(jaEnviada.operacao)).txHash;
      const preparo = await preparar().catch(() => SEM_SERVIDOR);
      if ("erro" in preparo) return preparo;
      return (await executarNaSafe({ passkey, carteira, chamadas: preparo.chamadas })).txHash;
    } catch (falha) {
      if (falha instanceof OperacaoSemRecibo) setJaEnviada({ operacao: falha.operacao });
      return { erro: mensagemDaCarteira(falha) };
    }
  }

  async function executar() {
    if (emAndamento.current) return;
    emAndamento.current = true;
    setExecutando(true);
    setErro(undefined);

    const txHash = await transacaoDaOperacao();
    const registro = typeof txHash === "string" ? await registrar(txHash).catch(() => SEM_SERVIDOR) : txHash;
    if (typeof txHash === "string") {
      const repetir = registro && typeof registro === "object" && "erro" in registro && registro.repetivel;
      setJaEnviada(repetir ? { transacao: txHash } : undefined);
    }

    emAndamento.current = false;
    setExecutando(false);
    if (registro && typeof registro === "object" && "erro" in registro) return setErro(registro.erro);
    aoConcluir(registro as Exclude<T, Recusa>);
  }

  return { executar, executando, erro, executada: !!jaEnviada };
}
