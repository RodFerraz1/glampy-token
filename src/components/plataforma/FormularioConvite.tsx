"use client";

import { Check, Copy } from "lucide-react";
import { useActionState, useState } from "react";
import { convidarInvestidor } from "@/app/ibiti/convites/acoes";
import { Aviso, classeDeCampo } from "@/components/landing/base";

export function FormularioConvite({ validadeEmDias }: { validadeEmDias: number }) {
  const [estado, acao, enviando] = useActionState(convidarInvestidor, {});
  return (
    <>
      <form action={acao} className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="email" className="sr-only">
          E-mail do investidor
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="investidor@email.com"
          defaultValue={estado.email}
          className={classeDeCampo}
        />
        <button
          type="submit"
          disabled={enviando}
          className="h-12 shrink-0 rounded-lg bg-folha px-6 text-base font-semibold text-white transition-colors hover:bg-mata disabled:opacity-60"
        >
          {enviando ? "Criando…" : "Criar convite"}
        </button>
      </form>
      {estado.erro && (
        <div role="alert" className="mt-4">
          <Aviso>{estado.erro}</Aviso>
        </div>
      )}
      {estado.link && <LinkDoConvite key={estado.link} link={estado.link} validadeEmDias={validadeEmDias} />}
    </>
  );
}

function LinkDoConvite({ link, validadeEmDias }: { link: string; validadeEmDias: number }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    await navigator.clipboard.writeText(link);
    setCopiado(true);
  }

  return (
    <div className="mt-5 rounded-lg bg-musgo p-4">
      <p className="text-[15px] font-medium">Convite criado. Copie o link e envie ao investidor:</p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <code className="min-w-0 flex-1 break-all rounded-lg border border-borda bg-white px-4 py-3 text-sm">{link}</code>
        <button
          type="button"
          onClick={copiar}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg border-[1.5px] border-folha px-5 text-[15px] font-semibold text-folha transition-colors hover:bg-folha hover:text-white"
        >
          {copiado ? <Check className="size-4" strokeWidth={2} aria-hidden /> : <Copy className="size-4" strokeWidth={2} aria-hidden />}
          {copiado ? "Copiado" : "Copiar link"}
        </button>
      </div>
      <p className="mt-3 text-sm text-cinza">O link não aparece de novo depois que você sair desta tela. Ele vale por {validadeEmDias} dias.</p>
    </div>
  );
}
