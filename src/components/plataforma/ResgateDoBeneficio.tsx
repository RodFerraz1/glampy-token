"use client";

import { Fingerprint } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Address } from "viem";
import { preparar, registrar } from "@/app/investidor/loja/acoes";
import type { Passkey } from "@/carteira/safe";
import { useOperacaoNaSafe } from "@/carteira/use-operacao-na-safe";
import { AVISO_DO_RESGATE } from "@/catalogo/resgate";
import { Aviso } from "@/components/landing/base";
import { classeDoPrimario, classeDoSecundario, Erro } from "@/components/plataforma/formulario";

export function ResgateDoBeneficio({
  beneficioId,
  nome,
  carteira,
  passkey,
}: {
  beneficioId: string;
  nome: string;
  carteira: Address;
  passkey: Passkey;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const { executar, executando, erro, executada } = useOperacaoNaSafe({
    passkey,
    carteira,
    preparar: () => preparar(beneficioId),
    registrar: (txHash) => registrar(txHash, beneficioId),
    aoConcluir: ({ resgateId }) => router.push(`/investidor/resgates/${resgateId}`),
  });

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className={`w-full ${classeDoPrimario}`}>
        Resgatar
      </button>
    );
  }

  return (
    <div className="space-y-4" role="group" aria-label={`Confirmar o resgate de ${nome}`}>
      <Aviso>{AVISO_DO_RESGATE}</Aviso>
      <Erro>{erro}</Erro>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={executar}
          disabled={executando}
          className={`inline-flex items-center justify-center gap-2 ${classeDoPrimario}`}
        >
          <Fingerprint className="size-5" strokeWidth={1.75} aria-hidden />
          {executando ? "Resgatando…" : executada ? "Registrar de novo" : "Confirmar com biometria"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          disabled={executando || executada}
          className={classeDoSecundario}
        >
          Voltar
        </button>
      </div>
      <p className="text-sm text-cinza">Sem custo de gas: a plataforma paga a taxa da rede.</p>
    </div>
  );
}
