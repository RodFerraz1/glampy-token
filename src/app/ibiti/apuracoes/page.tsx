import type { Metadata } from "next";
import { formatarPeriodo, TOTAL_DE_PERIODOS } from "@/calendario-da-oferta";
import { Cartao } from "@/components/landing/base";
import { FormularioApuracao } from "@/components/plataforma/FormularioApuracao";
import { LinkDeVolta } from "@/components/plataforma/LinkDeVolta";
import { SeloDemonstracao } from "@/components/plataforma/SeloDemonstracao";
import { TabelaDeApuracoes } from "@/components/plataforma/TabelaDeApuracoes";
import { obterBanco } from "@/servidor/dependencias";
import { listarApuracoes, proximoPeriodo } from "@/servidor/operacoes/apuracoes";
import { exigirArea } from "@/servidor/sessao";

export const metadata: Metadata = { title: "Apurações · Ibiti Glamping" };

export default async function Apuracoes() {
  await exigirArea("administrador");
  const banco = obterBanco();
  const [apuracoes, proximo] = await Promise.all([listarApuracoes({ banco }), proximoPeriodo({ banco })]);

  return (
    <>
      <LinkDeVolta href="/ibiti">Painel IBITI</LinkDeVolta>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-[32px] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[40px]">Apurações</h1>
        <SeloDemonstracao />
      </div>
      <p className="mt-3 text-base leading-relaxed text-cinza">
        A distribuição on-chain só aceita apurações a partir de 2027, então os meses são simulados aqui e nenhum valor é
        depositado. {apuracoes.length} de {TOTAL_DE_PERIODOS} registradas.
      </p>

      <Cartao className="mt-8 p-6 sm:p-7">
        <h2 className="mb-4 text-xl font-semibold">Nova apuração</h2>
        {proximo ? (
          <FormularioApuracao periodo={proximo} rotulo={formatarPeriodo(proximo)} />
        ) : (
          <p className="text-[15px] text-cinza">As 48 apurações da vigência já foram registradas.</p>
        )}
      </Cartao>

      <h2 className="mt-12 text-xl font-semibold">Registradas</h2>
      <TabelaDeApuracoes apuracoes={apuracoes} />
    </>
  );
}
