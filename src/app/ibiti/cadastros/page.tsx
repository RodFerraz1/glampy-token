import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LinkDeVolta } from "@/components/plataforma/LinkDeVolta";
import { formatarDataHora } from "@/formatacao";
import { obterBanco } from "@/servidor/dependencias";
import { listarCadastros } from "@/servidor/operacoes/analise-de-cadastro";
import { exigirArea } from "@/servidor/sessao";
import { seloDaSituacao } from "./situacao";

export const metadata: Metadata = { title: "Cadastros · Ibiti Glamping" };

type Cadastro = Awaited<ReturnType<typeof listarCadastros>>[number];

function Lista({ cadastros, vazio }: { cadastros: Cadastro[]; vazio: string }) {
  if (cadastros.length === 0) return <p className="mt-4 text-base text-cinza">{vazio}</p>;
  return (
    <ul className="mt-4 divide-y divide-borda rounded-[20px] border border-borda bg-white">
      {cadastros.map((cadastro) => {
        const selo = seloDaSituacao(cadastro.status, cadastro.carteira, cadastro.habilitacaoFalhou);
        return (
          <li key={cadastro.id}>
            <Link
              href={`/ibiti/cadastros/${cadastro.id}`}
              className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-creme sm:px-7"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-base font-medium">{cadastro.nomeCompleto}</p>
                  <p className="mt-1 text-sm text-cinza">Enviado em {formatarDataHora(cadastro.enviadoEm)}</p>
                </div>
                <span className={`w-fit shrink-0 rounded-full px-3 py-1 text-sm font-medium ${selo.classe}`}>{selo.texto}</span>
              </div>
              <ChevronRight className="size-5 shrink-0 text-cinza" strokeWidth={2} aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default async function Cadastros() {
  const usuario = await exigirArea("administrador");
  const cadastros = await listarCadastros({ banco: obterBanco() }, usuario.id);
  const emAnalise = cadastros.filter(({ status }) => status === "em_analise");
  const semHabilitacao = cadastros.filter(({ status, carteira }) => status === "aprovado" && carteira === "pendente");
  const analisados = cadastros
    .filter((cadastro) => cadastro.status !== "em_analise" && !semHabilitacao.includes(cadastro))
    .reverse();

  return (
    <>
      <LinkDeVolta href="/ibiti">Painel IBITI</LinkDeVolta>
      <h1 className="mt-4 text-[32px] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[40px]">Cadastros</h1>
      <p className="mt-3 text-base leading-relaxed text-cinza">
        Confira os dados e a declaração de investidor profissional. Aprovar habilita a carteira on-chain.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Aguardando análise ({emAnalise.length})</h2>
      <Lista cadastros={emAnalise} vazio="Nenhum cadastro aguardando análise." />

      {semHabilitacao.length > 0 && (
        <>
          <h2 className="mt-12 text-xl font-semibold">Aprovados sem carteira habilitada ({semHabilitacao.length})</h2>
          <p className="mt-2 text-[15px] text-cinza">Estes investidores ainda não conseguem comprar. Abra o cadastro para tentar de novo.</p>
          <Lista cadastros={semHabilitacao} vazio="" />
        </>
      )}

      <h2 className="mt-12 text-xl font-semibold">Analisados</h2>
      <Lista cadastros={analisados} vazio="Nenhum cadastro analisado ainda." />
    </>
  );
}
