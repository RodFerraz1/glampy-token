"use client";

import { useActionState, useState } from "react";
import type { Address } from "viem";
import { enviarParaAnalise } from "@/app/investidor/cadastro/acoes";
import { Aviso, classeDeCampo } from "@/components/landing/base";
import { CriarCarteira } from "@/components/plataforma/CriarCarteira";

const classeDeRotulo = "mb-2 block text-[15px] font-medium";

export function FormularioCadastro({
  declaracao,
  email,
  carteira: carteiraInicial,
}: {
  declaracao: string[];
  email: string;
  carteira: Address | null;
}) {
  const [estado, acao, enviando] = useActionState(enviarParaAnalise, {});
  const [carteira, setCarteira] = useState(carteiraInicial);
  const valores = estado.valores;
  return (
    <form action={acao} className="space-y-5">
      <div>
        <label htmlFor="nomeCompleto" className={classeDeRotulo}>
          Nome completo
        </label>
        <input
          id="nomeCompleto"
          name="nomeCompleto"
          required
          autoComplete="name"
          defaultValue={valores?.nomeCompleto}
          className={classeDeCampo}
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="cpf" className={classeDeRotulo}>
            CPF
          </label>
          <input
            id="cpf"
            name="cpf"
            required
            inputMode="numeric"
            placeholder="000.000.000-00"
            defaultValue={valores?.cpf}
            className={classeDeCampo}
          />
        </div>
        <div>
          <label htmlFor="dataNascimento" className={classeDeRotulo}>
            Data de nascimento
          </label>
          <input
            id="dataNascimento"
            name="dataNascimento"
            type="date"
            required
            autoComplete="bday"
            defaultValue={valores?.dataNascimento}
            className={classeDeCampo}
          />
        </div>
      </div>
      <div>
        <label htmlFor="telefone" className={classeDeRotulo}>
          Telefone com DDD
        </label>
        <input
          id="telefone"
          name="telefone"
          type="tel"
          required
          autoComplete="tel-national"
          placeholder="(11) 98765-4321"
          defaultValue={valores?.telefone}
          className={classeDeCampo}
        />
      </div>

      <fieldset className="rounded-lg border border-borda bg-creme p-4 sm:p-5">
        <legend className="px-1 text-[15px] font-semibold">Declaração de investidor profissional</legend>
        <p className="text-sm text-cinza">A oferta é restrita a investidores profissionais, nos termos da Resolução CVM 30.</p>
        <div className="mt-3 space-y-2 text-[15px] leading-relaxed">
          {declaracao.map((paragrafo) => (
            <p key={paragrafo}>{paragrafo}</p>
          ))}
        </div>
        <label className="mt-4 flex cursor-pointer items-start gap-3 text-[15px] font-medium">
          <input
            type="checkbox"
            name="declaracao"
            value="aceita"
            required
            defaultChecked={valores?.declaracaoAceita}
            className="mt-1 size-4 shrink-0 accent-folha"
          />
          Li e declaro que sou investidor profissional.
        </label>
      </fieldset>

      <CriarCarteira email={email} carteira={carteira} aoCriar={setCarteira} />

      {estado.erro && (
        <div role="alert">
          <Aviso>{estado.erro}</Aviso>
        </div>
      )}
      <button
        type="submit"
        disabled={enviando || !carteira}
        className="h-[52px] w-full rounded-lg bg-folha text-base font-semibold text-white transition-colors hover:bg-mata disabled:opacity-60"
      >
        {enviando ? "Enviando…" : "Enviar para análise"}
      </button>
    </form>
  );
}
