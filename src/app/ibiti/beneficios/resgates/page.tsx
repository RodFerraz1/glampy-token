import type { Metadata } from "next";
import Link from "next/link";
import { CancelarResgate } from "@/components/plataforma/CancelarResgate";
import { LinkDaTransacao } from "@/components/plataforma/LinkDaTransacao";
import { SeloDoResgate, STATUS_DO_RESGATE } from "@/components/plataforma/SeloDoResgate";
import { formatarCredito, formatarDataHora } from "@/formatacao";
import { obterBanco } from "@/servidor/dependencias";
import { listarResgates } from "@/servidor/operacoes/gestao-de-resgates";
import type { StatusDoResgate } from "@/servidor/operacoes/loja";
import { exigirArea } from "@/servidor/sessao";

export const metadata: Metadata = { title: "Resgates · Passaporte Ibiti · Ibiti Glamping" };

const FILTROS: StatusDoResgate[] = ["submetido", "confirmado", "falhou", "entregue", "cancelado"];

export default async function Resgates({ searchParams }: PageProps<"/ibiti/beneficios/resgates">) {
  const usuario = await exigirArea("administrador");
  const { status } = await searchParams;
  const filtro = FILTROS.find((opcao) => opcao === status);
  const resgates = await listarResgates({ banco: obterBanco() }, usuario.id, { status: filtro });

  return (
    <>
      <p className="text-base leading-relaxed text-cinza">
        Os resgates do programa de benefícios. A entrega é registrada pelo operador do território ao ler o voucher.
      </p>

      <nav aria-label="Filtrar por status" className="mt-8 flex flex-wrap gap-2">
        {[undefined, ...FILTROS].map((opcao) => (
          <Link
            key={opcao ?? "todos"}
            href={opcao ? `/ibiti/beneficios/resgates?status=${opcao}` : "/ibiti/beneficios/resgates"}
            aria-current={filtro === opcao ? "page" : undefined}
            className={`rounded-full border px-4 py-2 text-[15px] font-medium transition-colors ${
              filtro === opcao ? "border-folha bg-folha text-white" : "border-borda bg-white text-tinta hover:border-folha"
            }`}
          >
            {opcao ? STATUS_DO_RESGATE[opcao].texto : "Todos"}
          </Link>
        ))}
      </nav>

      {resgates.length === 0 ? (
        <p className="mt-6 text-base text-cinza">Nenhum resgate{filtro ? " com este status" : ""}.</p>
      ) : (
        <ul className="mt-6 divide-y divide-borda rounded-[20px] border border-borda bg-white">
          {resgates.map((resgate) => (
            <li key={resgate.id} className="px-5 py-4 sm:px-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-medium">{resgate.beneficio}</p>
                  <p className="mt-1 text-sm text-cinza">
                    {resgate.investidor} · {formatarDataHora(resgate.criadoEm)} · {formatarCredito(resgate.custo)} IbitiPass
                  </p>
                </div>
                <SeloDoResgate status={resgate.status} />
              </div>
              {resgate.erro && <p className="mt-2 text-[15px] leading-relaxed text-aviso-texto">{resgate.erro}</p>}
              {resgate.entregueEm && (
                <p className="mt-2 text-sm text-cinza">Entregue em {formatarDataHora(resgate.entregueEm)}</p>
              )}
              {resgate.motivoCancelamento && (
                <p className="mt-2 text-sm text-cinza">
                  Cancelado{resgate.canceladoEm ? ` em ${formatarDataHora(resgate.canceladoEm)}` : ""}: {resgate.motivoCancelamento}
                </p>
              )}
              {resgate.txHash && (
                <LinkDaTransacao hash={resgate.txHash} className="mt-2">
                  Transação
                </LinkDaTransacao>
              )}
              {resgate.status === "confirmado" && <CancelarResgate resgateId={resgate.id} />}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
