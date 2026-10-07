"use client";

import { X } from "lucide-react";
import { useId } from "react";
import { createPortal } from "react-dom";

export function Dialogo({
  aberto,
  aoFechar,
  titulo,
  children,
  rotuloDoBotao = "Fechar",
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  children: React.ReactNode;
  rotuloDoBotao?: string;
}) {
  const idDoTitulo = useId();

  if (!aberto) return null;

  const fechar = (evento: React.MouseEvent<HTMLButtonElement>) => evento.currentTarget.closest("dialog")?.close();

  return createPortal(
    <dialog
      ref={(dialogo) => {
        if (dialogo && !dialogo.open) dialogo.showModal();
      }}
      aria-labelledby={idDoTitulo}
      onClose={aoFechar}
      onClick={(evento) => {
        if (evento.target === evento.currentTarget) evento.currentTarget.close();
      }}
      className="m-auto w-[calc(100%-32px)] max-w-[520px] rounded-[20px] bg-white p-0 text-tinta backdrop:bg-tinta/40"
    >
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <h2 id={idDoTitulo} className="text-2xl font-medium leading-tight">
            {titulo}
          </h2>
          <button
            type="button"
            onClick={fechar}
            aria-label="Fechar"
            className="-mt-1 -mr-2 flex size-10 shrink-0 items-center justify-center rounded-lg text-cinza transition-colors hover:bg-musgo hover:text-folha"
          >
            <X className="size-5" strokeWidth={1.75} aria-hidden />
          </button>
        </div>
        <div className="mt-4 text-[17px] leading-[1.55] text-cinza">{children}</div>
        <button
          type="button"
          onClick={fechar}
          className="mt-7 h-[52px] w-full rounded-lg bg-folha text-base font-semibold text-white transition-colors hover:bg-mata"
        >
          {rotuloDoBotao}
        </button>
      </div>
    </dialog>,
    document.body,
  );
}
