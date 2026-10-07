"use client";

import { useActionState } from "react";
import { analisar, anunciar, cancelarNaCadeia, executar } from "@/app/ibiti/reatribuicoes/acoes";
import { classeDoPrimario, classeDoSecundario, classeDoTexto, Erro } from "@/components/plataforma/formulario";
import type { StatusDaReatribuicao } from "@/servidor/operacoes/reatribuicao";
import { SAFES } from "@/governanca";

const colhendo = `Colhendo ${SAFES.reatribuicao.necessarias} de ${SAFES.reatribuicao.diretores} assinaturas…`;

function Encerrar({ id }: { id: string }) {
  const [recusa, recusar, recusando] = useActionState(analisar.bind(null, id, "recusada"), {});
  const [cancelamento, cancelar, cancelando] = useActionState(analisar.bind(null, id, "cancelada"), {});
  const campo = `parecer-${id}`;
  const ocupado = recusando || cancelando;
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-[15px] font-medium text-folha">Recusar ou cancelar</summary>
      <form className="mt-3 space-y-3">
        <label htmlFor={campo} className="block text-[15px] font-medium">
          Parecer
        </label>
        <p className="text-sm text-cinza">Quem abriu o pedido vê este texto.</p>
        <textarea
          id={campo}
          name="parecer"
          required
          rows={2}
          defaultValue={recusa.parecer ?? cancelamento.parecer}
          className={classeDoTexto}
        />
        <Erro>{recusa.erro ?? cancelamento.erro}</Erro>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="submit" formAction={recusar} disabled={ocupado} className={classeDoSecundario}>
            {recusando ? "Recusando…" : "Recusar o pedido"}
          </button>
          <button type="submit" formAction={cancelar} disabled={ocupado} className={classeDoSecundario}>
            {cancelando ? "Cancelando…" : "Cancelar o pedido"}
          </button>
        </div>
      </form>
    </details>
  );
}

function CancelarAnunciada({ id }: { id: string }) {
  const [estado, acao, cancelando] = useActionState(cancelarNaCadeia.bind(null, id), {});
  const campo = `parecer-anunciada-${id}`;
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-[15px] font-medium text-folha">Cancelar a reatribuição anunciada</summary>
      <form action={acao} className="mt-3 space-y-3">
        <label htmlFor={campo} className="block text-[15px] font-medium">
          Parecer
        </label>
        <p className="text-sm text-cinza">
          O cancelamento vai on-chain pela {SAFES.reatribuicao.nome}. Quem abriu o pedido vê o parecer.
        </p>
        <textarea id={campo} name="parecer" required rows={2} defaultValue={estado.parecer} className={classeDoTexto} />
        <Erro>{estado.erro}</Erro>
        <button type="submit" disabled={cancelando} className={`w-full sm:w-auto ${classeDoSecundario}`}>
          {cancelando ? colhendo : "Cancelar on-chain"}
        </button>
      </form>
    </details>
  );
}

export function AcoesDaReatribuicao({ id, status, podeExecutar }: { id: string; status: StatusDaReatribuicao; podeExecutar: boolean }) {
  const [analise, porEmAnalise, pondo] = useActionState(analisar.bind(null, id, "em_analise"), {});
  const [anuncio, anunciarAgora, anunciando] = useActionState(anunciar.bind(null, id), {});
  const [execucao, executarAgora, executando] = useActionState(executar.bind(null, id), {});

  return (
    <div className="mt-4 space-y-3">
      {status === "aberta" && (
        <form action={porEmAnalise} className="space-y-3">
          <Erro>{analise.erro}</Erro>
          <button type="submit" disabled={pondo} className={`w-full sm:w-auto ${classeDoPrimario}`}>
            {pondo ? "Salvando…" : "Pôr em análise"}
          </button>
        </form>
      )}
      {status === "em_analise" && (
        <form action={anunciarAgora} className="space-y-3">
          <p className="text-sm text-cinza">
            Anunciar grava o caso on-chain pela {SAFES.reatribuicao.nome}, com {SAFES.reatribuicao.necessarias} de{" "}
            {SAFES.reatribuicao.diretores} assinaturas, e abre a espera pública de 7 dias.
          </p>
          <Erro>{anuncio.erro}</Erro>
          <button type="submit" disabled={anunciando} className={`w-full sm:w-auto ${classeDoPrimario}`}>
            {anunciando ? colhendo : "Anunciar on-chain"}
          </button>
        </form>
      )}
      {status === "anunciada" && (
        <form action={executarAgora} className="space-y-3">
          <Erro>{execucao.erro}</Erro>
          <button type="submit" disabled={executando || !podeExecutar} className={`w-full sm:w-auto ${classeDoPrimario}`}>
            {executando ? colhendo : "Executar a reatribuição"}
          </button>
        </form>
      )}
      {(status === "aberta" || status === "em_analise") && <Encerrar id={id} />}
      {status === "anunciada" && <CancelarAnunciada id={id} />}
    </div>
  );
}
