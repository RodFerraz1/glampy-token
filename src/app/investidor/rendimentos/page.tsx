import { FileDown } from "lucide-react";
import type { Metadata } from "next";
import { Aviso, Cartao } from "@/components/landing/base";
import { LinkDeVolta } from "@/components/plataforma/LinkDeVolta";
import { SaqueDoCreditoPendente } from "@/components/plataforma/SaqueDoCreditoPendente";
import { SeloDemonstracao } from "@/components/plataforma/SeloDemonstracao";
import { TabelaDeApuracoes } from "@/components/plataforma/TabelaDeApuracoes";
import { formatarReais, formatarStable } from "@/formatacao";
import { obterDependencias } from "@/servidor/dependencias";
import { consultarRendimentos } from "@/servidor/operacoes/apuracoes";
import { anosComApuracao } from "@/servidor/operacoes/informe";
import { consultarCreditoPendente } from "@/servidor/operacoes/saque";
import { exigirArea } from "@/servidor/sessao";

export const metadata: Metadata = { title: "Rendimentos · Ibiti Glamping" };

export default async function Rendimentos() {
  const usuario = await exigirArea("investidor");
  const dependencias = obterDependencias();
  const [rendimentos, creditoPendente] = await Promise.all([
    consultarRendimentos(dependencias, usuario.id),
    consultarCreditoPendente(dependencias, usuario.id),
  ]);
  const anos = anosComApuracao(rendimentos?.meses ?? []);

  return (
    <div className="mx-auto max-w-[720px]">
      <LinkDeVolta href="/investidor">Área do investidor</LinkDeVolta>
      <h1 className="mt-4 text-[32px] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[40px]">Rendimentos</h1>
      {!rendimentos ? (
        <Cartao className="mt-8 p-6 sm:p-7">
          <Aviso>Os rendimentos aparecem depois que seu cadastro for aprovado.</Aviso>
        </Cartao>
      ) : (
        <>
          <Cartao className="mt-8 p-6 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-cinza">Royalty recebido na vigência</p>
              <SeloDemonstracao />
            </div>
            <p className="mt-1 text-[32px] font-bold leading-none">{formatarReais(rendimentos.totalCentavos)}</p>
            <p className="mt-3 text-[15px] leading-relaxed text-cinza">
              Apurações simuladas: nenhum valor foi depositado. O cálculo usa a sua posição atual,{" "}
              {rendimentos.posicao === 1n ? "1 token" : `${rendimentos.posicao} tokens`}, e não a do fechamento de cada mês.
            </p>
          </Cartao>
          {creditoPendente && (
            <Cartao className="mt-6 p-6 sm:p-7">
              <h2 className="text-xl font-semibold">Crédito pendente</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-cinza">
                {creditoPendente.podeSacar
                  ? `Um pagamento de royalty não chegou à sua carteira e ${formatarStable(creditoPendente.valor)} ficaram guardados na Distribuição. Saque quando quiser, sem custo de gas.`
                  : "Nenhum crédito pendente. Se um pagamento de royalty real não chegar à sua carteira, o valor fica guardado no contrato para você sacar."}
              </p>
              <div className="mt-4">
                <SaqueDoCreditoPendente
                  podeSacar={creditoPendente.podeSacar}
                  carteira={creditoPendente.carteira}
                  passkey={creditoPendente.passkey}
                />
              </div>
            </Cartao>
          )}
          {anos.length > 0 && (
            <Cartao className="mt-6 p-6 sm:p-7">
              <h2 className="text-xl font-semibold">Informe anual</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-cinza">
                PDF com os rendimentos de cada ano-calendário. É uma demonstração, sem validade fiscal.
              </p>
              <ul className="mt-4 flex flex-wrap gap-3">
                {anos.map((ano) => (
                  <li key={ano}>
                    <a
                      href={`/investidor/informe/${ano}`}
                      download
                      className="inline-flex h-11 items-center gap-2 rounded-lg border-[1.5px] border-folha px-4 text-[15px] font-semibold text-folha transition-colors hover:bg-folha hover:text-white"
                    >
                      <FileDown className="size-4" strokeWidth={2} aria-hidden />
                      Informe {ano}
                    </a>
                  </li>
                ))}
              </ul>
            </Cartao>
          )}
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold">Mês a mês</h2>
            <SeloDemonstracao />
          </div>
          <p className="mt-2 text-[15px] leading-relaxed text-cinza">
            Cada mês traz o relatório de apuração do Ibiti e o hash dele, registrado junto da apuração. Conferir o hash prova
            que o relatório não foi trocado depois; a veracidade do faturamento é assunto de auditoria, não do hash.
          </p>
          <TabelaDeApuracoes apuracoes={rendimentos.meses} tokens={rendimentos.posicao} />
        </>
      )}
    </div>
  );
}
