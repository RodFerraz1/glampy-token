import type { Metadata } from "next";
import { DecisaoDaPreferencia, DecisaoDoCrivo } from "@/components/plataforma/DecisoesDaRevenda";
import { LinkDaTransacao } from "@/components/plataforma/LinkDaTransacao";
import { LinkDeVolta } from "@/components/plataforma/LinkDeVolta";
import { SeloDaRevenda } from "@/components/plataforma/SeloDaRevenda";
import { formatarData, formatarDataHora, formatarReais, formatarTokens } from "@/formatacao";
import { obterDependencias } from "@/servidor/dependencias";
import { listarRevendasParaDecisao, type AcaoDaRevenda } from "@/servidor/operacoes/decisoes-da-revenda";
import { exigirArea } from "@/servidor/sessao";

export const metadata: Metadata = { title: "Revendas · Ibiti Glamping" };

const DECISOES: Record<AcaoDaRevenda, string> = {
  exercer_preferencia: "Preferência exercida: lote recomprado pela tesouraria",
  recusar_preferencia: "Preferência recusada",
  aprovar_comprador: "Comprador aprovado no crivo",
  vetar_comprador: "Comprador vetado no crivo",
};

function diasAte(data: Date, agora: Date) {
  const dias = Math.ceil((data.getTime() - agora.getTime()) / 86_400_000);
  return dias <= 0 ? "prazo encerrado" : dias === 1 ? "falta 1 dia" : `faltam ${dias} dias`;
}

export default async function Revendas() {
  const usuario = await exigirArea("administrador");
  const ofertas = await listarRevendasParaDecisao(obterDependencias(), usuario.id);
  const agora = new Date();

  return (
    <>
      <LinkDeVolta href="/ibiti">Painel IBITI</LinkDeVolta>
      <h1 className="mt-4 text-[32px] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[40px]">Revendas</h1>
      <p className="mt-3 text-base leading-relaxed text-cinza">
        O Ibiti tem 30 dias de preferência para recomprar um lote ofertado e 15 dias para decidir sobre o comprador indicado.
        As decisões vão on-chain pelas Safes de governança, com as assinaturas dos diretores.
      </p>
      {ofertas.length === 0 ? (
        <p className="mt-8 text-base text-cinza">Nenhuma oferta de revenda.</p>
      ) : (
        <ul className="mt-8 divide-y divide-borda rounded-[20px] border border-borda bg-white">
          {ofertas.map((oferta) => (
            <li key={oferta.id.toString()} className="px-5 py-5 sm:px-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-medium">
                    Oferta nº {oferta.id.toString()}: {formatarTokens(oferta.quantidade)} por {formatarReais(oferta.precoCentavos)}
                  </p>
                  <p className="mt-1 text-sm text-cinza">
                    Vendedor: {oferta.vendedorNome ?? oferta.vendedor} · ofertada em {formatarData(oferta.ofertadaEm)}
                  </p>
                  {oferta.compradorIndicado && (
                    <p className="mt-1 text-sm text-cinza">Comprador indicado: {oferta.compradorNome ?? oferta.compradorIndicado}</p>
                  )}
                </div>
                <SeloDaRevenda estado={oferta.estado} />
              </div>
              {oferta.estado === "ofertado" && (
                <p className="mt-2 text-[15px] text-cinza">
                  Preferência até {formatarData(oferta.preferenciaAte)}, {diasAte(oferta.preferenciaAte, agora)}.
                </p>
              )}
              {oferta.estado === "em_crivo" && oferta.crivoAte && (
                <p className="mt-2 text-[15px] text-cinza">
                  Crivo até {formatarData(oferta.crivoAte)}, {diasAte(oferta.crivoAte, agora)}.
                </p>
              )}
              {oferta.decisoes.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {oferta.decisoes.map((decisao, i) => (
                    <li key={i} className="rounded-lg bg-creme px-4 py-3 text-sm">
                      <p className="font-medium">{DECISOES[decisao.acao]}</p>
                      <p className="mt-1 text-cinza">
                        {formatarDataHora(decisao.em)}
                        {decisao.dados.assinaturas !== undefined &&
                          ` · ${decisao.dados.assinaturas} de ${decisao.dados.donos ?? decisao.dados.necessarias} assinaturas colhidas`}
                        {decisao.dados.motivo && ` · motivo: ${decisao.dados.motivo}`}
                      </p>
                      {decisao.dados.txHash && (
                        <LinkDaTransacao hash={decisao.dados.txHash} className="mt-1 text-sm">
                          Transação
                        </LinkDaTransacao>
                      )}
                      {decisao.dados.erro && <p className="mt-1 text-aviso-texto">{decisao.dados.erro}</p>}
                    </li>
                  ))}
                </ul>
              )}
              {oferta.estado === "ofertado" && agora <= oferta.preferenciaAte && (
                <DecisaoDaPreferencia id={oferta.id.toString()} preco={formatarReais(oferta.precoCentavos)} />
              )}
              {oferta.estado === "em_crivo" && <DecisaoDoCrivo id={oferta.id.toString()} />}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
