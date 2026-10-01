"use client";

import { useActionState } from "react";
import { aprovar, desabilitar, reprovar, tentarDeNovo } from "@/app/ibiti/cadastros/[id]/acoes";
import { classeDoPrimario, classeDoSecundario, classeDoTexto, Erro } from "@/components/plataforma/formulario";

export function DecisaoDoCadastro({ titularId }: { titularId: string }) {
  const [aprovacao, aprovarCadastro, aprovando] = useActionState(aprovar.bind(null, titularId), {});
  const [reprovacao, reprovarCadastro, reprovando] = useActionState(reprovar.bind(null, titularId), {});
  const ocupado = aprovando || reprovando;

  return (
    <div className="space-y-6">
      <form action={aprovarCadastro} className="space-y-3">
        <p className="text-[15px] leading-relaxed text-cinza">
          Aprovar habilita a carteira on-chain no registro de habilitados, com a conta agente do Ibiti.
        </p>
        <Erro>{aprovacao.erro}</Erro>
        <button type="submit" disabled={ocupado} className={`w-full sm:w-auto ${classeDoPrimario}`}>
          {aprovando ? "Aprovando e habilitando…" : "Aprovar e habilitar carteira"}
        </button>
      </form>

      <form action={reprovarCadastro} className="space-y-3 border-t border-borda pt-6">
        <label htmlFor="motivo-reprovacao" className="block text-[15px] font-medium">
          Motivo da reprovação
        </label>
        <p className="text-sm text-cinza">O investidor vê este texto na área dele.</p>
        <textarea
          id="motivo-reprovacao"
          name="motivo"
          required
          rows={3}
          defaultValue={reprovacao.motivo}
          className={classeDoTexto}
        />
        <Erro>{reprovacao.erro}</Erro>
        <button type="submit" disabled={ocupado} className={`w-full sm:w-auto ${classeDoSecundario}`}>
          {reprovando ? "Reprovando…" : "Reprovar cadastro"}
        </button>
      </form>
    </div>
  );
}

export function TentarHabilitarDeNovo({ titularId, erro }: { titularId: string; erro: string | null }) {
  const [estado, acao, tentando] = useActionState(tentarDeNovo.bind(null, titularId), {});
  return (
    <form action={acao} className="space-y-3">
      <Erro>{estado.erro ?? erro ?? "A habilitação ainda não foi confirmada."}</Erro>
      <p className="text-[15px] leading-relaxed text-cinza">
        O cadastro está aprovado, mas o investidor só consegue comprar depois que a carteira for habilitada on-chain.
      </p>
      <button type="submit" disabled={tentando} className={`w-full sm:w-auto ${classeDoPrimario}`}>
        {tentando ? "Habilitando…" : "Tentar de novo"}
      </button>
    </form>
  );
}

export function DesabilitarCarteira({ titularId }: { titularId: string }) {
  const [estado, acao, desabilitando] = useActionState(desabilitar.bind(null, titularId), {});
  return (
    <form action={acao} className="space-y-3">
      <label htmlFor="motivo-desabilitacao" className="block text-[15px] font-medium">
        Motivo da desabilitação
      </label>
      <p className="text-sm text-cinza">
        Retira a carteira do registro de habilitados. O contrato só aceita carteira sem tokens. O texto fica na auditoria,
        e on-chain vai só o hash dele.
      </p>
      <textarea
        id="motivo-desabilitacao"
        name="motivo"
        required
        rows={3}
        defaultValue={estado.motivo}
        className={classeDoTexto}
      />
      <Erro>{estado.erro}</Erro>
      <button type="submit" disabled={desabilitando} className={`w-full sm:w-auto ${classeDoSecundario}`}>
        {desabilitando ? "Desabilitando…" : "Desabilitar carteira"}
      </button>
    </form>
  );
}
