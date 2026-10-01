import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Cartao } from "@/components/landing/base";
import { DecisaoDoCadastro, DesabilitarCarteira, TentarHabilitarDeNovo } from "@/components/plataforma/AcoesDaAnalise";
import { LinkDaTransacao } from "@/components/plataforma/LinkDaTransacao";
import { LinkDeVolta } from "@/components/plataforma/LinkDeVolta";
import { TEXTO_DA_DECLARACAO, VERSAO_DA_DECLARACAO } from "@/declaracao-investidor-profissional";
import { formatarCpf, formatarData, formatarDataHora } from "@/formatacao";
import { obterBanco } from "@/servidor/dependencias";
import { detalharCadastro } from "@/servidor/operacoes/analise-de-cadastro";
import { exigirArea } from "@/servidor/sessao";
import { seloDaSituacao } from "../situacao";

export const metadata: Metadata = { title: "Cadastro · Ibiti Glamping" };

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-cinza">{rotulo}</dt>
      <dd className="mt-1 break-words text-base">{children}</dd>
    </div>
  );
}

export default async function DetalheDoCadastro({ params }: PageProps<"/ibiti/cadastros/[id]">) {
  const usuario = await exigirArea("administrador");
  const { id } = await params;
  const cadastro = await detalharCadastro({ banco: obterBanco() }, usuario.id, id);
  if (!cadastro) notFound();
  const { carteira } = cadastro;
  const selo = seloDaSituacao(cadastro.status, carteira.status, !!carteira.erroHabilitacao);

  return (
    <div className="mx-auto max-w-[720px]">
      <LinkDeVolta href="/ibiti/cadastros">Cadastros</LinkDeVolta>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="min-w-0 text-[32px] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[40px]">{cadastro.nomeCompleto}</h1>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${selo.classe}`}>{selo.texto}</span>
      </div>

      <Cartao className="mt-8 p-6 sm:p-7">
        <h2 className="text-xl font-semibold">Dados do cadastro</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Campo rotulo="E-mail">{cadastro.email}</Campo>
          <Campo rotulo="CPF">{formatarCpf(cadastro.cpf)}</Campo>
          <Campo rotulo="Data de nascimento">{formatarData(cadastro.dataNascimento)}</Campo>
          <Campo rotulo="Telefone">{cadastro.telefone ?? "Não informado"}</Campo>
          <Campo rotulo="Enviado em">{formatarDataHora(cadastro.enviadoEm)}</Campo>
          {cadastro.analisadoEm && <Campo rotulo="Analisado em">{formatarDataHora(cadastro.analisadoEm)}</Campo>}
        </dl>
      </Cartao>

      <Cartao className="mt-6 p-6 sm:p-7">
        <h2 className="text-xl font-semibold">Declaração de investidor profissional</h2>
        {cadastro.declaracao.aceitaEm ? (
          <>
            <p className="mt-2 text-sm text-cinza">
              Aceita em {formatarDataHora(cadastro.declaracao.aceitaEm)} · versão {cadastro.declaracao.versao}
            </p>
            {cadastro.declaracao.versao === VERSAO_DA_DECLARACAO && (
              <div className="mt-4 space-y-3 rounded-lg bg-creme p-4 text-[15px] leading-relaxed">
                {TEXTO_DA_DECLARACAO.map((paragrafo) => (
                  <p key={paragrafo}>{paragrafo}</p>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="mt-2 text-base text-cinza">Não aceita.</p>
        )}
      </Cartao>

      <Cartao className="mt-6 p-6 sm:p-7">
        <h2 className="text-xl font-semibold">Carteira</h2>
        <p className="mt-3 break-all font-mono text-sm">{carteira.endereco}</p>
        {carteira.txHabilitacao && (
          <LinkDaTransacao hash={carteira.txHabilitacao} className="mt-3">
            Habilitação
          </LinkDaTransacao>
        )}
        {cadastro.status === "aprovado" && carteira.status === "pendente" && (
          <div className="mt-5">
            <TentarHabilitarDeNovo titularId={cadastro.id} erro={carteira.erroHabilitacao} />
          </div>
        )}
        {carteira.status === "habilitada" && (
          <div className="mt-6 border-t border-borda pt-6">
            <DesabilitarCarteira titularId={cadastro.id} />
          </div>
        )}
      </Cartao>

      {cadastro.status === "em_analise" && (
        <Cartao className="mt-6 p-6 sm:p-7">
          <h2 className="mb-4 text-xl font-semibold">Decisão</h2>
          <DecisaoDoCadastro titularId={cadastro.id} />
        </Cartao>
      )}
      {cadastro.status === "reprovado" && (
        <Cartao className="mt-6 p-6 sm:p-7">
          <h2 className="text-xl font-semibold">Reprovado</h2>
          <p className="mt-3 text-base leading-relaxed">Motivo: {cadastro.motivoReprovacao}</p>
        </Cartao>
      )}
    </div>
  );
}
