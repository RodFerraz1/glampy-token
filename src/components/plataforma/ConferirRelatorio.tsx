"use client";

import { FileDown, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { Hash } from "viem";
import { hashDoRelatorio } from "@/relatorio-de-apuracao";

type Conferencia = "conferindo" | "confere" | "diverge" | "falhou";

const RESULTADO: Record<Exclude<Conferencia, "conferindo">, { texto: string; classe: string }> = {
  confere: { texto: "O relatório confere com o hash registrado", classe: "bg-musgo text-folha" },
  diverge: { texto: "O relatório não confere com o hash registrado", classe: "bg-aviso text-aviso-texto" },
  falhou: { texto: "Não foi possível baixar o relatório agora", classe: "bg-aviso text-aviso-texto" },
};

const classeDoBotao =
  "inline-flex h-10 items-center gap-2 rounded-lg border-[1.5px] border-folha px-3 text-[15px] font-semibold text-folha transition-colors hover:bg-folha hover:text-white disabled:opacity-60";

/** Baixa o relatório e calcula o hash no navegador de quem confere, sem depender do servidor. */
export function ConferirRelatorio({ url, hash }: { url: string; hash: Hash }) {
  const [conferencia, setConferencia] = useState<Conferencia | null>(null);

  async function conferir() {
    setConferencia("conferindo");
    try {
      const resposta = await fetch(url, { cache: "no-store" });
      if (!resposta.ok) return setConferencia("falhou");
      const calculado = hashDoRelatorio(new Uint8Array(await resposta.arrayBuffer()));
      setConferencia(calculado === hash ? "confere" : "diverge");
    } catch {
      setConferencia("falhou");
    }
  }

  const resultado = conferencia && conferencia !== "conferindo" ? RESULTADO[conferencia] : null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <a href={url} target="_blank" rel="noreferrer" className={classeDoBotao}>
        <FileDown className="size-4" strokeWidth={2} aria-hidden />
        Baixar relatório
      </a>
      <button type="button" onClick={conferir} disabled={conferencia === "conferindo"} className={classeDoBotao}>
        <ShieldCheck className="size-4" strokeWidth={2} aria-hidden />
        {conferencia === "conferindo" ? "Conferindo…" : "Conferir hash"}
      </button>
      {resultado && (
        <span role="status" className={`rounded-full px-3 py-1 text-sm font-medium ${resultado.classe}`}>
          {resultado.texto}
        </span>
      )}
    </div>
  );
}
