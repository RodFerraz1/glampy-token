"use client";

import { useActionState } from "react";
import { entregar } from "@/app/operador/acoes";
import { classeDoPrimario, Erro } from "@/components/plataforma/formulario";

export function MarcarEntrega({ codigo }: { codigo: string }) {
  const [estado, acao, entregando] = useActionState(entregar.bind(null, codigo), {});
  return (
    <form action={acao} className="space-y-3">
      <Erro>{estado.erro}</Erro>
      <button type="submit" disabled={entregando} className={`w-full ${classeDoPrimario}`}>
        {entregando ? "Registrando…" : "Marcar como entregue"}
      </button>
    </form>
  );
}
