import type { Hash } from "viem";
import { formatarPeriodo } from "@/calendario-da-oferta";
import { ConferirRelatorio } from "@/components/plataforma/ConferirRelatorio";
import { formatarReais } from "@/formatacao";

export interface ApuracaoNaTabela {
  periodo: number;
  faturamentoCentavos: number;
  royaltyCentavos: number;
  valorPorTokenCentavos: number;
  hashRelatorio: Hash;
  relatorioUrl: string | null;
  /** O que o investidor recebeu no mês, quando a tabela é a dele. */
  recebidoCentavos?: number;
}

/** `tokens` é a posição do investidor, quando a tabela é a dele: abre a conta do que ele recebeu. */
export function TabelaDeApuracoes({ apuracoes, tokens }: { apuracoes: ApuracaoNaTabela[]; tokens?: bigint }) {
  if (apuracoes.length === 0) return <p className="mt-4 text-base text-cinza">Nenhuma apuração registrada ainda.</p>;
  return (
    <ul className="mt-4 divide-y divide-borda rounded-[20px] border border-borda bg-white">
      {apuracoes.map((apuracao) => (
        <li key={apuracao.periodo} className="px-5 py-4 sm:px-7">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-base font-medium first-letter:uppercase">{formatarPeriodo(apuracao.periodo)}</p>
            {apuracao.recebidoCentavos !== undefined && (
              <p className="text-lg font-semibold">{formatarReais(apuracao.recebidoCentavos)}</p>
            )}
          </div>
          <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
            <div>
              <dt className="inline text-cinza">Faturamento </dt>
              <dd className="inline font-medium">{formatarReais(apuracao.faturamentoCentavos)}</dd>
            </div>
            <div>
              <dt className="inline text-cinza">Royalty (15%) </dt>
              <dd className="inline font-medium">{formatarReais(apuracao.royaltyCentavos)}</dd>
            </div>
            <div>
              <dt className="inline text-cinza">Por token (÷ 300) </dt>
              <dd className="inline font-medium">{formatarReais(apuracao.valorPorTokenCentavos)}</dd>
            </div>
          </dl>
          {tokens !== undefined && apuracao.recebidoCentavos !== undefined && (
            <p className="mt-1 text-sm text-cinza">
              Você: {formatarReais(apuracao.valorPorTokenCentavos)} × {tokens === 1n ? "1 token" : `${tokens} tokens`} ={" "}
              <span className="font-medium text-tinta">{formatarReais(apuracao.recebidoCentavos)}</span>
            </p>
          )}
          <p className="mt-3 text-sm text-cinza">Hash do relatório de apuração</p>
          <p className="break-all font-mono text-sm text-cinza">{apuracao.hashRelatorio}</p>
          {apuracao.relatorioUrl ? (
            <ConferirRelatorio url={apuracao.relatorioUrl} hash={apuracao.hashRelatorio} />
          ) : (
            <p className="mt-1 text-sm text-cinza">Registrada sem o relatório anexado.</p>
          )}
        </li>
      ))}
    </ul>
  );
}
