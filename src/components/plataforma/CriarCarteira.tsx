"use client";

import { CircleCheck, KeyRound } from "lucide-react";
import { useState, useTransition } from "react";
import type { Address } from "viem";
import { createWebAuthnCredential } from "viem/account-abstraction";
import { registrarCarteira } from "@/app/investidor/cadastro/acoes";
import { Aviso } from "@/components/landing/base";

export function CriarCarteira({
  email,
  carteira,
  aoCriar,
}: {
  email: string;
  carteira: Address | null;
  aoCriar: (endereco: Address) => void;
}) {
  const [erro, setErro] = useState<string>();
  const [criando, iniciar] = useTransition();

  function criar() {
    setErro(undefined);
    iniciar(async () => {
      let credencial;
      try {
        credencial = await createWebAuthnCredential({
          name: email,
          rp: { id: window.location.hostname, name: "Ibiti Glamping" },
        });
      } catch {
        setErro("A confirmação foi cancelada ou este aparelho não cria passkeys. Tente de novo.");
        return;
      }
      const resultado = await registrarCarteira({ id: credencial.id, chavePublica: credencial.publicKey });
      if ("erro" in resultado) setErro(resultado.erro);
      else aoCriar(resultado.endereco);
    });
  }

  return (
    <fieldset className="rounded-lg border border-borda bg-creme p-4 sm:p-5">
      <legend className="px-1 text-[15px] font-semibold">Sua carteira</legend>
      <p className="text-[15px] leading-relaxed">
        A carteira guarda só o que é da plataforma, seus tokens Glampy e o crédito IbitiPass, e é aberta com a
        biometria ou o bloqueio de tela deste aparelho, sem seed phrase para anotar.
      </p>
      {carteira ? (
        <div role="status" className="mt-4 flex gap-3 rounded-lg bg-musgo px-4 py-4 text-[15px] leading-relaxed text-folha">
          <CircleCheck className="mt-0.5 size-5 shrink-0" strokeWidth={1.75} aria-hidden />
          <div className="min-w-0">
            <p className="font-medium">Carteira criada</p>
            <p className="mt-1 break-all font-mono text-sm">{carteira}</p>
          </div>
        </div>
      ) : (
        <>
          {erro && (
            <div role="alert" className="mt-4">
              <Aviso>{erro}</Aviso>
            </div>
          )}
          <button
            type="button"
            onClick={criar}
            disabled={criando}
            className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-folha bg-white text-base font-semibold text-folha transition-colors hover:bg-musgo disabled:opacity-60"
          >
            <KeyRound className="size-5" strokeWidth={1.75} aria-hidden />
            {criando ? "Criando a carteira…" : "Criar carteira"}
          </button>
        </>
      )}
    </fieldset>
  );
}
