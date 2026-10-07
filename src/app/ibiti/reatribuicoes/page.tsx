import type { Metadata } from "next";
import { AcoesDaReatribuicao } from "@/components/plataforma/AcoesDaReatribuicao";
import { ContagemRegressiva } from "@/components/plataforma/ContagemRegressiva";
import { LinkDaTransacao } from "@/components/plataforma/LinkDaTransacao";
import { LinkDeVolta } from "@/components/plataforma/LinkDeVolta";
import { MOTIVOS, SeloDaReatribuicao } from "@/components/plataforma/SeloDaReatribuicao";
import { abreviarEndereco } from "@/explorador";
import { formatarDataHora, formatarTokens } from "@/formatacao";
import { obterBanco } from "@/servidor/dependencias";
import { listarPedidos } from "@/servidor/operacoes/reatribuicao";
import { exigirArea } from "@/servidor/sessao";

export const metadata: Metadata = { title: "Reatribuições · Ibiti Glamping" };

export default async function Reatribuicoes() {
  const usuario = await exigirArea("administrador");
  const pedidos = await listarPedidos({ banco: obterBanco() }, usuario.id);
  const agora = new Date();

  return (
    <>
      <LinkDeVolta href="/ibiti">Painel IBITI</LinkDeVolta>
      <h1 className="mt-4 text-[32px] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[40px]">Reatribuições</h1>
      <p className="mt-3 text-base leading-relaxed text-cinza">
        Pedidos de recuperação de acesso e de sucessão. A execução move a posição sem a assinatura do titular, por isso passa
        por anúncio público e 7 dias de espera.
      </p>
      {pedidos.length === 0 ? (
        <p className="mt-8 text-base text-cinza">Nenhum pedido.</p>
      ) : (
        <ul className="mt-8 divide-y divide-borda rounded-[20px] border border-borda bg-white">
          {pedidos.map((pedido) => (
            <li key={pedido.id} className="px-5 py-5 sm:px-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-medium">
                    {MOTIVOS[pedido.motivo]}: {formatarTokens(pedido.quantidade)} de {pedido.titular}
                  </p>
                  <p className="mt-1 text-sm text-cinza">
                    {abreviarEndereco(pedido.carteiraDeOrigem)} para {abreviarEndereco(pedido.carteiraDeDestino)} · aberto em{" "}
                    {formatarDataHora(pedido.abertoEm)}
                    {pedido.abertoPor && ` por ${pedido.abertoPor}`}
                  </p>
                  {pedido.motivo === "perda_de_acesso" && (
                    <p className="mt-1 text-sm text-cinza">
                      Destino: a Safe da passkey nova do titular, habilitada para ele no anúncio.
                    </p>
                  )}
                </div>
                <SeloDaReatribuicao status={pedido.status} />
              </div>
              <p className="mt-2 text-[15px] leading-relaxed">{pedido.justificativa}</p>
              {pedido.parecer && <p className="mt-2 text-[15px] text-cinza">Parecer: {pedido.parecer}</p>}
              {pedido.status === "anunciada" && pedido.executavelApos && (
                <p className="mt-2 text-[15px] text-cinza">
                  Executável a partir de {formatarDataHora(pedido.executavelApos)}.{" "}
                  <ContagemRegressiva ate={pedido.executavelApos.toISOString()} encerrada="Pode executar." />
                </p>
              )}
              <div className="flex flex-wrap gap-x-4">
                {pedido.txAnuncio && (
                  <LinkDaTransacao hash={pedido.txAnuncio} className="mt-2">
                    Anúncio
                  </LinkDaTransacao>
                )}
                {pedido.txExecucao && (
                  <LinkDaTransacao hash={pedido.txExecucao} className="mt-2">
                    Execução
                  </LinkDaTransacao>
                )}
              </div>
              <AcoesDaReatribuicao
                id={pedido.id}
                status={pedido.status}
                podeExecutar={!!pedido.executavelApos && agora >= pedido.executavelApos}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
