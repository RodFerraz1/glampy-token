import type { Metadata } from "next";
import { formatarPeriodo } from "@/calendario-da-oferta";
import { Aviso, Cartao } from "@/components/landing/base";
import { LinkDeVolta } from "@/components/plataforma/LinkDeVolta";
import { CancelarOferta, FormularioDeOferta, IndicarComprador, LiquidarRevenda } from "@/components/plataforma/OperacoesDaRevenda";
import { SeloDaRevenda } from "@/components/plataforma/SeloDaRevenda";
import { SeloDemonstracao } from "@/components/plataforma/SeloDemonstracao";
import { formatarData, formatarReais, formatarTokens } from "@/formatacao";
import { obterDependencias } from "@/servidor/dependencias";
import { consultarReferencia, consultarRevendas, type OfertaDeRevenda } from "@/servidor/operacoes/revenda";
import { exigirArea } from "@/servidor/sessao";

export const metadata: Metadata = { title: "Revenda · Ibiti Glamping" };

function Prazo({ oferta }: { oferta: OfertaDeRevenda }) {
  const caducidade = `A oferta caduca em ${formatarData(oferta.caducaEm)} se não for liquidada.`;
  const texto = {
    inexistente: "",
    ofertado: `O Ibiti tem até ${formatarData(oferta.preferenciaAte)} para exercer a preferência (30 dias). Sem resposta até lá, você pode indicar um comprador.`,
    recusado: `O Ibiti não vai recomprar. Indique um comprador. ${caducidade}`,
    em_crivo: `O Ibiti analisa o comprador até ${oferta.crivoAte ? formatarData(oferta.crivoAte) : "o fim do prazo"} (15 dias). Sem decisão até lá, o comprador conta como vetado e você pode indicar outro. ${caducidade}`,
    aprovado: `O comprador pode liquidar. ${caducidade}`,
    liquidado: "Revenda concluída.",
    cancelado: "Oferta encerrada e lote destravado.",
  }[oferta.estado];
  return <p className="mt-2 text-[15px] leading-relaxed text-cinza">{texto}</p>;
}

export default async function Revenda() {
  const usuario = await exigirArea("investidor");
  const dependencias = obterDependencias();
  const agora = new Date();
  const [revendas, referencia] = await Promise.all([
    consultarRevendas(dependencias, usuario.id),
    consultarReferencia(dependencias, usuario.id),
  ]);

  return (
    <div className="mx-auto max-w-[720px]">
      <LinkDeVolta href="/investidor">Área do investidor</LinkDeVolta>
      <h1 className="mt-4 text-[32px] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[40px]">Revenda</h1>
      <div className="mt-6">
        <Aviso>
          Não existe garantia de saída nem mercado secundário aberto. A revenda passa pela preferência do Ibiti (30 dias) e,
          se ele recusar, pelo crivo do comprador que você indicar (15 dias). O preço final nunca fica abaixo do ofertado.
        </Aviso>
      </div>

      {!revendas ? (
        <Cartao className="mt-6 p-6 sm:p-7">
          <Aviso>A revenda fica disponível quando sua carteira estiver habilitada.</Aviso>
        </Cartao>
      ) : (
        <>
          <Cartao className="mt-6 p-6 sm:p-7">
            <h2 className="text-xl font-semibold">Ofertar um lote</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-cinza">
              Você tem {formatarTokens(revendas.saldo)}, {formatarTokens(revendas.travado)} travados em ofertas. O lote ofertado
              fica travado na sua carteira até a revenda ser liquidada ou cancelada: os tokens continuam seus e rendendo, mas
              não podem ser movidos.
            </p>
            <div className="mt-5">
              {revendas.saldo > revendas.travado ? (
                <FormularioDeOferta
                  livre={Number(revendas.saldo - revendas.travado)}
                  referenciaPorTokenCentavos={referencia.porTokenCentavos}
                  carteira={revendas.carteira}
                  passkey={revendas.passkey}
                />
              ) : (
                <p className="text-[15px] text-cinza">Não há tokens livres para ofertar.</p>
              )}
            </div>
          </Cartao>

          <Cartao className="mt-6 p-6 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Valor de referência</h2>
              {referencia.origem === "apuracoes" && <SeloDemonstracao />}
            </div>
            <p className="mt-1 text-[32px] font-bold leading-none">{formatarReais(referencia.porTokenCentavos)}</p>
            <p className="mt-1 text-sm text-cinza">por token</p>
            <p className="mt-4 text-[15px] leading-relaxed text-cinza">
              Valor presente do royalty que cada token ainda recebe até março de 2031. O fluxo de cada mês é{" "}
              {referencia.origem === "apuracoes"
                ? `a média do valor por token dos últimos ${referencia.mesesDaMedia} meses apurados`
                : "a projeção do Memorando de Oferta para o ciclo do mês"}
              , descontado a {(referencia.taxaAnual * 100).toFixed(2).replace(".", ",")}% ao ano.
            </p>
            <p className="mt-3 rounded-lg bg-creme px-4 py-3 font-mono text-sm">
              VP = Σ fluxo do mês ÷ (1 + {(referencia.taxaAnual * 100).toFixed(2).replace(".", ",")}%)^(k ÷ 12), com k em meses a
              partir de hoje
            </p>
            <details className="mt-4">
              <summary className="cursor-pointer text-[15px] font-medium text-folha">
                Ver as {referencia.meses.length} entradas mês a mês
              </summary>
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="text-left text-cinza">
                    <th className="py-1 font-medium">Mês</th>
                    <th className="py-1 text-right font-medium">k</th>
                    <th className="py-1 text-right font-medium">Fluxo por token</th>
                    <th className="py-1 text-right font-medium">Fator</th>
                    <th className="py-1 text-right font-medium">Valor presente</th>
                  </tr>
                </thead>
                <tbody>
                  {referencia.meses.map((mes) => (
                    <tr key={mes.periodo} className="border-t border-borda">
                      <td className="py-1">{formatarPeriodo(mes.periodo)}</td>
                      <td className="py-1 text-right">{mes.k}</td>
                      <td className="py-1 text-right">{formatarReais(mes.fluxoPorTokenCentavos)}</td>
                      <td className="py-1 text-right">{mes.fator.toFixed(4).replace(".", ",")}</td>
                      <td className="py-1 text-right">{formatarReais(mes.valorPresenteCentavos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </Cartao>

          <h2 className="mt-10 text-xl font-semibold">Minhas ofertas</h2>
          {revendas.minhas.length === 0 ? (
            <p className="mt-4 text-base text-cinza">Nenhuma oferta de revenda.</p>
          ) : (
            <ul className="mt-4 divide-y divide-borda rounded-[20px] border border-borda bg-white">
              {revendas.minhas.map((oferta) => (
                <li key={oferta.id.toString()} className="px-5 py-4 sm:px-7">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-medium">
                        Oferta nº {oferta.id.toString()}: {formatarTokens(oferta.quantidade)} por {formatarReais(oferta.precoCentavos)}
                      </p>
                      <p className="mt-1 text-sm text-cinza">Ofertada em {formatarData(oferta.ofertadaEm)}</p>
                    </div>
                    <SeloDaRevenda estado={oferta.estado} />
                  </div>
                  <Prazo oferta={oferta} />
                  {(oferta.estado === "recusado" ||
                    (oferta.estado === "ofertado" && agora > oferta.preferenciaAte) ||
                    (oferta.estado === "em_crivo" && !!oferta.crivoAte && agora > oferta.crivoAte)) && (
                    <IndicarComprador id={oferta.id.toString()} carteira={revendas.carteira} passkey={revendas.passkey} />
                  )}
                  {oferta.estado !== "liquidado" && oferta.estado !== "cancelado" && (
                    <CancelarOferta id={oferta.id.toString()} carteira={revendas.carteira} passkey={revendas.passkey} />
                  )}
                </li>
              ))}
            </ul>
          )}

          <h2 className="mt-10 text-xl font-semibold">Como comprador</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-cinza">
            Para ser indicado como comprador numa revenda, passe ao vendedor o endereço da sua carteira:
          </p>
          <p className="mt-2 break-all rounded-lg border border-borda bg-white px-4 py-3 font-mono text-sm">{revendas.carteira}</p>
          {revendas.comoComprador.length > 0 && (
            <ul className="mt-4 divide-y divide-borda rounded-[20px] border border-borda bg-white">
              {revendas.comoComprador.map((oferta) => (
                <li key={oferta.id.toString()} className="px-5 py-4 sm:px-7">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="text-base font-medium">
                      Oferta nº {oferta.id.toString()}: {formatarTokens(oferta.quantidade)} por {formatarReais(oferta.precoCentavos)}
                    </p>
                    <SeloDaRevenda estado={oferta.estado} />
                  </div>
                  <Prazo oferta={oferta} />
                  {oferta.estado === "aprovado" && (
                    <LiquidarRevenda
                      id={oferta.id.toString()}
                      precoMinimo={(oferta.precoCentavos / 100).toFixed(2).replace(".", ",")}
                      carteira={revendas.carteira}
                      passkey={revendas.passkey}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
