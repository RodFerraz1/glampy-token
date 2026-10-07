"use client";

import { Fingerprint } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Address } from "viem";
import { preparar, registrar } from "@/app/investidor/rendimentos/acoes";
import type { Passkey } from "@/carteira/safe";
import { useOperacaoNaSafe } from "@/carteira/use-operacao-na-safe";
import { classeDoPrimario, Erro } from "@/components/plataforma/formulario";

export function SaqueDoCreditoPendente({
  podeSacar,
  carteira,
  passkey,
}: {
  podeSacar: boolean;
  carteira: Address;
  passkey: Passkey;
}) {
  const router = useRouter();
  const { executar, executando, erro, executada } = useOperacaoNaSafe({
    passkey,
    carteira,
    preparar,
    registrar,
    aoConcluir: () => router.refresh(),
  });

  return (
    <div className="space-y-3">
      <Erro>{erro}</Erro>
      <button
        type="button"
        onClick={executar}
        disabled={!podeSacar || executando}
        className={`inline-flex w-full items-center justify-center gap-2 sm:w-auto ${classeDoPrimario}`}
      >
        <Fingerprint className="size-5" strokeWidth={1.75} aria-hidden />
        {executando ? "Sacando…" : executada ? "Registrar de novo" : "Sacar com biometria"}
      </button>
    </div>
  );
}
