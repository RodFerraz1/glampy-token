import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Cartao, Container } from "@/components/landing/base";
import { Indicador } from "@/components/plataforma/Indicador";
import { LinkDaTransacao } from "@/components/plataforma/LinkDaTransacao";
import { LinkDeVolta } from "@/components/plataforma/LinkDeVolta";
import { SeloDemonstracao } from "@/components/plataforma/SeloDemonstracao";
import { TabelaDeApuracoes } from "@/components/plataforma/TabelaDeApuracoes";
import { formatarDataHora, formatarTokens } from "@/formatacao";
import { obterDependencias } from "@/servidor/dependencias";
import { consultarTransparencia, type TipoDeDecisao } from "@/servidor/operacoes/transparencia";

export const metadata: Metadata = {
  title: "Transparência · Ibiti Glamping",
  description: "Contratos, catálogo de benefícios, apurações e decisões estruturais do token de royalty do Ibiti Glamping.",
};

const CONTRATOS: Record<string, string> = {
  TokenRoyalty: "Token de royalty (Glampy)",
  RegistroHabilitados: "Registro das carteiras habilitadas",
  RegrasConformidade: "Regras de conformidade: teto por titular e detentores",
  BRLStableMock: "Stablecoin de demonstração, em reais",
  Oferta: "Oferta inicial",
  Recolocacao: "Recolocação de lotes recomprados",
  Distribuicao: "Distribuição mensal do royalty",
  ControleTransferencia: "Revenda com preferência do emissor e crivo do comprador",
  IbitiPass: "Crédito de benefícios (IbitiPass)",
};

const DECISOES: Record<TipoDeDecisao, (referencia: string) => string> = {
  catalogo_publicado: (versao) => `Catálogo de benefícios publicado: versão ${versao}`,
  comprador_aprovado: (oferta) => `Comprador aprovado no crivo da revenda nº ${oferta}`,
  comprador_vetado: (oferta) => `Comprador vetado no crivo da revenda nº ${oferta}`,
  reatribuicao_anunciada: (id) => `Reatribuição nº ${id} anunciada, com 7 dias de espera pública`,
};

function Secao({ titulo, children, selo }: { titulo: string; children: React.ReactNode; selo?: boolean }) {
  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-semibold">{titulo}</h2>
        {selo && <SeloDemonstracao />}
      </div>
      {children}
    </section>
  );
}

export default async function Transparencia() {
  // A página lê a cadeia e o banco a cada visita, e não no build.
  await connection();
  const transparencia = await consultarTransparencia(obterDependencias());

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-borda bg-creme">
        <Container className="flex h-16 items-center justify-between gap-4 sm:h-[76px]">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="text-[28px] font-bold leading-none tracking-[-0.02em] text-folha">ibiti</span>
            <span className="text-[15px] text-cinza">Transparência</span>
          </Link>
        </Container>
      </header>

      <main className="flex-1 py-10 sm:py-14">
        <Container className="max-w-[880px]">
          <LinkDeVolta href="/">Voltar ao site</LinkDeVolta>
          <h1 className="mt-4 text-[32px] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[40px]">Transparência</h1>
          <p className="mt-3 text-base leading-relaxed text-cinza">
            O que o Memorando de Oferta promete tornar público (§11.5): os contratos na Sepolia, as versões do catálogo de
            benefícios, as apurações e o registro das decisões estruturais. Nada aqui identifica detentores.
          </p>

          <Cartao className="mt-8 p-6 sm:p-7">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Indicador rotulo="Detentores" nota="Endereços com saldo, incluindo tesouraria, oferta e recolocação">
                {transparencia.detentores}
              </Indicador>
              <Indicador rotulo="Tokens em circulação" nota={`Com investidores, de ${transparencia.emissaoTotal} emitidos`}>
                {formatarTokens(transparencia.emCirculacao)}
              </Indicador>
            </dl>
          </Cartao>

          <Secao titulo="Registro de decisões">
            {transparencia.decisoes.length === 0 ? (
              <p className="mt-4 text-base text-cinza">Nenhuma decisão registrada on-chain ainda.</p>
            ) : (
              <ul className="mt-4 divide-y divide-borda rounded-[20px] border border-borda bg-white">
                {transparencia.decisoes.map((decisao) => (
                  <li key={`${decisao.txHash}-${decisao.tipo}-${decisao.referencia}`} className="px-5 py-4 sm:px-7">
                    <p className="text-base font-medium">{DECISOES[decisao.tipo](decisao.referencia.toString())}</p>
                    <p className="mt-1 text-sm text-cinza">{formatarDataHora(decisao.em)}</p>
                    <LinkDaTransacao hash={decisao.txHash} className="mt-1 text-sm">
                      Transação
                    </LinkDaTransacao>
                  </li>
                ))}
              </ul>
            )}
          </Secao>

          <Secao titulo="Contratos">
            <ul className="mt-4 divide-y divide-borda rounded-[20px] border border-borda bg-white">
              {transparencia.contratos.map((contrato) => (
                <li key={contrato.nome} className="px-5 py-4 sm:px-7">
                  <p className="text-base font-medium">{CONTRATOS[contrato.nome] ?? contrato.nome}</p>
                  <a
                    href={contrato.link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex max-w-full items-center gap-2 break-all font-mono text-sm text-folha underline-offset-2 hover:underline"
                  >
                    {contrato.endereco}
                    <ExternalLink className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </Secao>

          <Secao titulo="Catálogo de benefícios">
            <p className="mt-2 text-[15px] leading-relaxed text-cinza">
              Cada versão da tabela de preços tem o hash gravado no contrato do IbitiPass: uma mudança de preço não passa sem
              aparecer aqui.
            </p>
            {transparencia.versoesDoCatalogo.length === 0 ? (
              <p className="mt-4 text-base text-cinza">Nenhuma versão publicada.</p>
            ) : (
              <ul className="mt-4 divide-y divide-borda rounded-[20px] border border-borda bg-white">
                {transparencia.versoesDoCatalogo.map((versao) => (
                  <li key={versao.versao} className="px-5 py-4 sm:px-7">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-base font-medium">Versão {versao.versao}</p>
                      <p className="text-sm text-cinza">{formatarDataHora(versao.publicadaEm)}</p>
                    </div>
                    <p className="mt-1 break-all font-mono text-sm text-cinza">{versao.hashTabela}</p>
                    {versao.txPublicacao && (
                      <LinkDaTransacao hash={versao.txPublicacao} className="mt-1 text-sm">
                        Transação
                      </LinkDaTransacao>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Secao>

          <Secao titulo="Apurações" selo>
            <p className="mt-2 text-[15px] leading-relaxed text-cinza">
              A distribuição on-chain só aceita apurações a partir de 2027. Até lá, as apurações são simuladas e nenhum valor é
              depositado. Cada uma traz o relatório do mês e o hash dele: quem baixa o relatório confere que é o mesmo registrado.
            </p>
            <TabelaDeApuracoes apuracoes={transparencia.apuracoes} />
          </Secao>
        </Container>
      </main>
    </div>
  );
}
