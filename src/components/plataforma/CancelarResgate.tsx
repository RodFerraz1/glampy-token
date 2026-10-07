"use client";

import { useActionState } from "react";
import { cancelar } from "@/app/ibiti/beneficios/resgates/acoes";
import { classeDoSecundario, classeDoTexto, Erro } from "@/components/plataforma/formulario";

export function CancelarResgate({ resgateId }: { resgateId: string }) {
  const [estado, acao, cancelando] = useActionState(cancelar.bind(null, resgateId), {});
  const campo = `motivo-${resgateId}`;
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-[15px] font-medium text-folha">Cancelar este resgate</summary>
      <form action={acao} className="mt-3 space-y-3">
        <label htmlFor={campo} className="block text-[15px] font-medium">
          Motivo do cancelamento
        </label>
        <p className="text-sm text-cinza">O crédito já consumido on-chain não volta ao investidor.</p>
        <textarea id={campo} name="motivo" required rows={2} defaultValue={estado.motivo} className={classeDoTexto} />
        <Erro>{estado.erro}</Erro>
        <button type="submit" disabled={cancelando} className={`w-full sm:w-auto ${classeDoSecundario}`}>
          {cancelando ? "Cancelando…" : "Confirmar cancelamento"}
        </button>
      </form>
    </details>
  );
}
