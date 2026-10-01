"use client";

import { useActionState } from "react";
import { crivo, preferencia } from "@/app/ibiti/revendas/acoes";
import { classeDoPrimario, classeDoSecundario, classeDoTexto, Erro } from "@/components/plataforma/formulario";
import { SAFES } from "@/governanca";

const colhendo = (safe: keyof typeof SAFES) =>
  `Colhendo ${SAFES[safe].necessarias} de ${SAFES[safe].diretores} assinaturas…`;

export function DecisaoDaPreferencia({ id, preco }: { id: string; preco: string }) {
  const [exercicio, exercer, exercendo] = useActionState(preferencia.bind(null, id, "exercer"), {});
  const [recusa, recusar, recusando] = useActionState(preferencia.bind(null, id, "recusar"), {});
  const ocupado = exercendo || recusando;
  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm text-cinza">
        Decisão da {SAFES.tesouraria.nome}: exige {SAFES.tesouraria.necessarias} de {SAFES.tesouraria.diretores} assinaturas dos
        diretores.
      </p>
      <Erro>{exercicio.erro ?? recusa.erro}</Erro>
      <div className="flex flex-col gap-3 sm:flex-row">
        <form action={exercer}>
          <button type="submit" disabled={ocupado} className={`w-full sm:w-auto ${classeDoPrimario}`}>
            {exercendo ? colhendo("tesouraria") : `Exercer e recomprar por ${preco}`}
          </button>
        </form>
        <form action={recusar}>
          <button type="submit" disabled={ocupado} className={`w-full sm:w-auto ${classeDoSecundario}`}>
            {recusando ? colhendo("tesouraria") : "Recusar a preferência"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function DecisaoDoCrivo({ id }: { id: string }) {
  const [aprovacao, aprovar, aprovando] = useActionState(crivo.bind(null, id, "aprovar"), {});
  const [veto, vetar, vetando] = useActionState(crivo.bind(null, id, "vetar"), {});
  const ocupado = aprovando || vetando;
  const campo = `motivo-do-veto-${id}`;
  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm text-cinza">
        Decisão da {SAFES.crivo.nome}: exige {SAFES.crivo.necessarias} de {SAFES.crivo.diretores} assinaturas dos diretores.
      </p>
      <form action={aprovar} className="space-y-3">
        <Erro>{aprovacao.erro}</Erro>
        <button type="submit" disabled={ocupado} className={`w-full sm:w-auto ${classeDoPrimario}`}>
          {aprovando ? colhendo("crivo") : "Aprovar o comprador"}
        </button>
      </form>
      <form action={vetar} className="space-y-3 border-t border-borda pt-4">
        <label htmlFor={campo} className="block text-[15px] font-medium">
          Motivo do veto
        </label>
        <p className="text-sm text-cinza">Fica na auditoria. On-chain vai só o hash do texto.</p>
        <textarea id={campo} name="motivo" required rows={2} defaultValue={veto.motivo} className={classeDoTexto} />
        <Erro>{veto.erro}</Erro>
        <button type="submit" disabled={ocupado} className={`w-full sm:w-auto ${classeDoSecundario}`}>
          {vetando ? colhendo("crivo") : "Vetar o comprador"}
        </button>
      </form>
    </div>
  );
}
