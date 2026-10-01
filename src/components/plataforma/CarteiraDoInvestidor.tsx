import { Cartao } from "@/components/landing/base";
import { Indicador } from "@/components/plataforma/Indicador";
import { CALENDARIO_DA_OFERTA } from "@/calendario-da-oferta";
import { formatarCredito, formatarData, formatarTokens } from "@/formatacao";
import type { Estoque } from "@/servidor/operacoes/consultar-posicao";

export function CarteiraDoInvestidor({
  glampy,
  ibitiPass,
  teto,
  tetoRestante,
  estoque,
}: {
  glampy: bigint;
  ibitiPass: bigint;
  teto: bigint;
  tetoRestante: bigint;
  estoque: Estoque | null;
}) {
  const { fimDaOferta, inicioDosDireitos, fimDosDireitos } = CALENDARIO_DA_OFERTA;
  return (
    <Cartao className="mt-6 p-6 sm:p-7">
      <h2 className="text-xl font-semibold">Sua carteira</h2>
      <p className="mt-2 text-[15px] leading-relaxed text-cinza">Só os ativos do programa: o token Glampy e o crédito IbitiPass.</p>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <Indicador rotulo="Glampy">{formatarTokens(glampy)}</Indicador>
        <Indicador rotulo="IbitiPass" nota="Crédito de benefícios do ciclo">
          {formatarCredito(ibitiPass)}
        </Indicador>
        <Indicador rotulo="Você ainda pode comprar" nota={`Até o teto de ${teto} tokens por pessoa`}>
          {formatarTokens(tetoRestante)}
        </Indicador>
        <Indicador rotulo="À venda agora" nota={estoque ? undefined : "Não há tokens à venda no momento"}>
          {formatarTokens(estoque?.quantidade ?? 0n)}
        </Indicador>
      </dl>
      <dl className="mt-5 space-y-2 border-t border-borda pt-5 text-[15px]">
        <div className="flex flex-wrap justify-between gap-x-4">
          <dt className="text-cinza">Oferta aberta até</dt>
          <dd className="font-medium">{formatarData(fimDaOferta)}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-x-4">
          <dt className="text-cinza">Direitos econômicos</dt>
          <dd className="font-medium">
            {formatarData(inicioDosDireitos)} a {formatarData(fimDosDireitos)}
          </dd>
        </div>
      </dl>
    </Cartao>
  );
}
