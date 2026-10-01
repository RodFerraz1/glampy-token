import type { Metadata } from "next";
import { TOTAL_DE_PERIODOS } from "@/calendario-da-oferta";
import Link from "next/link";
import { Cartao } from "@/components/landing/base";
import { Indicador } from "@/components/plataforma/Indicador";
import { LinkDeVolta } from "@/components/plataforma/LinkDeVolta";
import { SeloDemonstracao } from "@/components/plataforma/SeloDemonstracao";
import { formatarCredito, formatarData, formatarReais, formatarTokens } from "@/formatacao";
import { obterDependencias } from "@/servidor/dependencias";
import { consultarPainel } from "@/servidor/operacoes/painel";
import { exigirArea } from "@/servidor/sessao";

export const metadata: Metadata = { title: "Painel · Ibiti Glamping" };

export default async function Painel() {
  const usuario = await exigirArea("administrador");
  const painel = await consultarPainel(obterDependencias(), usuario.id);
  const { creditoDoCiclo, cicloDeBeneficios } = painel;

  return (
    <>
      <LinkDeVolta href="/ibiti">Painel IBITI</LinkDeVolta>
      <h1 className="mt-4 text-[32px] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[40px]">Painel</h1>
      <p className="mt-3 text-base leading-relaxed text-cinza">Números lidos dos contratos na Sepolia, sem identificar ninguém.</p>

      <Cartao className="mt-8 p-6 sm:p-7">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-xl font-semibold">Detentores e captação</h2>
          <Link href="/ibiti/detentores" className="text-[15px] font-medium text-folha underline-offset-2 hover:underline">
            Ver a lista nominal
          </Link>
        </div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-3">
          <Indicador rotulo="Detentores" nota="Endereços com saldo, incluindo tesouraria, oferta e recolocação">
            {painel.detentores}
          </Indicador>
          <Indicador rotulo="Com investidores" nota={`De ${painel.emissaoTotal} emitidos`}>
            {formatarTokens(painel.comInvestidores)}
          </Indicador>
          <Indicador rotulo="Na tesouraria">{formatarTokens(painel.naTesouraria)}</Indicador>
          <Indicador rotulo="Vendidos na oferta" nota={`${formatarTokens(painel.disponivelNaOferta)} ainda à venda`}>
            {formatarTokens(painel.vendidosNaOferta)}
          </Indicador>
          <Indicador rotulo="Vendidos na recolocação" nota={`${formatarTokens(painel.disponivelNaRecolocacao)} no lote agora`}>
            {formatarTokens(painel.vendidosNaRecolocacao)}
          </Indicador>
        </dl>
      </Cartao>

      <Cartao className="mt-6 p-6 sm:p-7">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold">Apurações</h2>
          <SeloDemonstracao />
        </div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-3">
          <Indicador rotulo="Total apurado e distribuído" nota="Simulado: nenhum valor foi depositado">
            {formatarReais(painel.apuracoes.royaltyCentavos)}
          </Indicador>
          <Indicador rotulo="Registradas" nota={`De ${TOTAL_DE_PERIODOS} na vigência`}>
            {painel.apuracoes.registradas}
          </Indicador>
          <Indicador rotulo="Faltam">{painel.apuracoes.faltam}</Indicador>
        </dl>
      </Cartao>

      <Cartao className="mt-6 p-6 sm:p-7">
        <h2 className="text-xl font-semibold">Benefícios</h2>
        <p className="mt-2 text-[15px] text-cinza">
          {cicloDeBeneficios.atual && cicloDeBeneficios.fim
            ? `Ciclo ${cicloDeBeneficios.atual} de 4, até ${formatarData(cicloDeBeneficios.fim)}.`
            : "O programa de benefícios não está em um ciclo agora."}
        </p>
        <dl className="mt-5 grid gap-4 sm:grid-cols-3">
          <Indicador rotulo="Crédito do ciclo" nota="Direito somado dos detentores">
            {formatarCredito(creditoDoCiclo.direito)}
          </Indicador>
          <Indicador rotulo="Já consumido" nota="Em resgates confirmados on-chain">
            {formatarCredito(creditoDoCiclo.consumido)}
          </Indicador>
          <Indicador rotulo="Catálogo" nota={`${painel.beneficios.inativos} inativos`}>
            {painel.beneficios.ativos} ativos
          </Indicador>
        </dl>
      </Cartao>
    </>
  );
}
