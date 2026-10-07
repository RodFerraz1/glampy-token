"use client";

import { ExternalLink } from "lucide-react";
import { useActionState } from "react";
import { aceitarDocumentos } from "@/app/investidor/acoes";
import { Aviso } from "@/components/landing/base";
import { MEMORANDO_DE_OFERTA, TERMO_DE_RISCOS } from "@/documentos-do-aceite";

const classeDoFieldset = "rounded-lg border border-borda bg-creme p-4 sm:p-5";
const classeDaMarcacao = "mt-4 flex cursor-pointer items-start gap-3 text-[15px] font-medium";
const classeDaCaixa = "mt-1 size-4 shrink-0 accent-folha";

export function LinkDoMemorando() {
  return (
    <a
      href={MEMORANDO_DE_OFERTA.arquivo}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 text-[15px] font-medium text-folha underline underline-offset-2 hover:text-mata"
    >
      Abrir o {MEMORANDO_DE_OFERTA.titulo} (PDF)
      <ExternalLink className="size-4" strokeWidth={2} aria-hidden />
    </a>
  );
}

export function AceiteDaOferta() {
  const [estado, acao, enviando] = useActionState(aceitarDocumentos, {});
  return (
    <form action={acao} className="space-y-5">
      <fieldset className={classeDoFieldset}>
        <legend className="px-1 text-[15px] font-semibold">{MEMORANDO_DE_OFERTA.titulo}</legend>
        <p className="text-[15px] leading-relaxed">
          O memorando descreve o ativo, como o preço foi construído, o que você recebe e as regras de revenda.
        </p>
        <div className="mt-3">
          <LinkDoMemorando />
        </div>
        <label className={classeDaMarcacao}>
          <input type="checkbox" name="memorando" value="aceito" required className={classeDaCaixa} />
          Li e aceito o {MEMORANDO_DE_OFERTA.titulo}.
        </label>
      </fieldset>

      <fieldset className={classeDoFieldset}>
        <legend className="px-1 text-[15px] font-semibold">{TERMO_DE_RISCOS.titulo}</legend>
        <ul className="list-disc space-y-2 pl-5 text-[15px] leading-relaxed">
          {TERMO_DE_RISCOS.texto.map((risco) => (
            <li key={risco}>{risco}</li>
          ))}
        </ul>
        <label className={classeDaMarcacao}>
          <input type="checkbox" name="riscos" value="aceito" required className={classeDaCaixa} />
          Li e estou ciente destes riscos.
        </label>
      </fieldset>

      {estado.erro && (
        <div role="alert">
          <Aviso>{estado.erro}</Aviso>
        </div>
      )}
      <button
        type="submit"
        disabled={enviando}
        className="h-[52px] w-full rounded-lg bg-folha text-base font-semibold text-white transition-colors hover:bg-mata disabled:opacity-60"
      >
        {enviando ? "Registrando…" : "Registrar aceite"}
      </button>
    </form>
  );
}
