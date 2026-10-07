import type { Metadata } from "next";
import { Cartao } from "@/components/landing/base";
import { ContagemRegressiva } from "@/components/plataforma/ContagemRegressiva";
import { FormularioDeRecuperacao } from "@/components/plataforma/FormularioDeRecuperacao";
import { LinkDaTransacao } from "@/components/plataforma/LinkDaTransacao";
import { LinkDeVolta } from "@/components/plataforma/LinkDeVolta";
import { MOTIVOS, SeloDaReatribuicao } from "@/components/plataforma/SeloDaReatribuicao";
import { abreviarEndereco } from "@/explorador";
import { formatarDataHora, formatarTokens } from "@/formatacao";
import { obterBanco } from "@/servidor/dependencias";
import { listarMeusPedidos } from "@/servidor/operacoes/reatribuicao";
import { exigirArea } from "@/servidor/sessao";

export const metadata: Metadata = { title: "Recuperação de acesso · Ibiti Glamping" };

export default async function Recuperacao() {
  const usuario = await exigirArea("investidor");
  const pedidos = await listarMeusPedidos({ banco: obterBanco() }, usuario.id);

  return (
    <div className="mx-auto max-w-[640px]">
      <LinkDeVolta href="/investidor">Área do investidor</LinkDeVolta>
      <h1 className="mt-4 text-[32px] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[40px]">Recuperação de acesso</h1>
      <p className="mt-3 text-base leading-relaxed text-cinza">
        Se você perdeu o acesso à carteira, ou é herdeiro de um investidor, o Ibiti pode reatribuir a posição. Depois da
        análise, a reatribuição é anunciada on-chain e só pode ser executada 7 dias depois.
      </p>

      <Cartao className="mt-8 p-6 sm:p-7">
        <h2 className="mb-4 text-xl font-semibold">Novo pedido</h2>
        <FormularioDeRecuperacao email={usuario.email} />
      </Cartao>

      <h2 className="mt-10 text-xl font-semibold">Meus pedidos</h2>
      {pedidos.length === 0 ? (
        <p className="mt-4 text-base text-cinza">Nenhum pedido aberto.</p>
      ) : (
        <ul className="mt-4 divide-y divide-borda rounded-[20px] border border-borda bg-white">
          {pedidos.map((pedido) => (
            <li key={pedido.id} className="px-5 py-4 sm:px-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-base font-medium">
                    {MOTIVOS[pedido.motivo]}: {formatarTokens(pedido.quantidade)}{" "}
                    {pedido.titular ? `de ${pedido.titular}` : `da carteira ${abreviarEndereco(pedido.carteiraDeOrigem)}`}
                  </p>
                  <p className="mt-1 text-sm text-cinza">Aberto em {formatarDataHora(pedido.abertoEm)}</p>
                </div>
                <SeloDaReatribuicao status={pedido.status} />
              </div>
              {pedido.parecer && <p className="mt-2 text-[15px] text-cinza">Parecer do Ibiti: {pedido.parecer}</p>}
              {pedido.status === "anunciada" && pedido.executavelApos && (
                <p className="mt-2 text-[15px] text-cinza">
                  Pode ser executada a partir de {formatarDataHora(pedido.executavelApos)}.{" "}
                  <ContagemRegressiva ate={pedido.executavelApos.toISOString()} encerrada="O prazo já terminou." />
                </p>
              )}
              {pedido.txAnuncio && (
                <LinkDaTransacao hash={pedido.txAnuncio} className="mt-2">
                  Anúncio
                </LinkDaTransacao>
              )}
              {pedido.txExecucao && (
                <LinkDaTransacao hash={pedido.txExecucao} className="mt-2 ml-4">
                  Execução
                </LinkDaTransacao>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
