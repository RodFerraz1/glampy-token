import { Cartao } from "@/components/landing/base";
import { AtualizarEnquantoPendente } from "@/components/plataforma/AtualizarEnquantoPendente";
import { LinkDaTransacao } from "@/components/plataforma/LinkDaTransacao";
import { LinkDeVolta } from "@/components/plataforma/LinkDeVolta";
import { ETAPAS_DA_COMPRA } from "@/etapas-da-compra";
import { formatarDataHora } from "@/formatacao";
import { obterDependencias } from "@/servidor/dependencias";
import { consultarExtrato, type TransacaoDoExtrato } from "@/servidor/operacoes/extrato";
import { exigirArea } from "@/servidor/sessao";
import type { TipoDeTransacao } from "@/servidor/transacoes";

const TIPO: Record<TipoDeTransacao, string> = {
  habilitacao: "Habilitação da carteira",
  desabilitacao: "Desabilitação da carteira",
  compra_oferta: "Compra na oferta inicial",
  compra_recolocacao: "Compra de lote recolocado",
  revenda_oferta: "Oferta de revenda",
  revenda_indicacao: "Indicação de comprador",
  revenda_liquidacao: "Liquidação de revenda",
  revenda_cancelamento: "Cancelamento de revenda",
  saque_pendente: "Saque de crédito pendente",
  resgate_beneficio: "Resgate de benefício",
};

const STATUS: Record<TransacaoDoExtrato["status"], { texto: string; classe: string }> = {
  pendente: { texto: "Pendente", classe: "bg-areia text-tinta" },
  confirmada: { texto: "Confirmada", classe: "bg-musgo text-folha" },
  revertida: { texto: "Revertida", classe: "bg-aviso text-aviso-texto" },
};

function Transacao({ tipo, etapa, status, txHash, erro, criadoEm }: TransacaoDoExtrato) {
  const { texto, classe } = STATUS[status];
  return (
    <li className="border-b border-borda py-5 first:pt-0 last:border-b-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-medium">{TIPO[tipo]}</p>
          {etapa && <p className="text-[15px] text-cinza">{ETAPAS_DA_COMPRA[etapa]}</p>}
          <p className="mt-1 text-sm text-cinza">{formatarDataHora(criadoEm)}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${classe}`}>{texto}</span>
      </div>
      {erro && <p className="mt-2 text-[15px] leading-relaxed text-aviso-texto">{erro}</p>}
      <LinkDaTransacao hash={txHash} className="mt-2 break-all">
        Hash
      </LinkDaTransacao>
    </li>
  );
}

export default async function Extrato() {
  const usuario = await exigirArea("investidor");
  const extrato = await consultarExtrato(obterDependencias(), usuario.id);
  const haPendentes = extrato.some(({ status }) => status === "pendente");

  return (
    <div className="mx-auto max-w-[640px]">
      <LinkDeVolta href="/investidor">Área do investidor</LinkDeVolta>
      <h1 className="mt-4 text-[32px] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[40px]">Extrato</h1>
      <Cartao className="mt-8 p-6 sm:p-7">
        {extrato.length === 0 ? (
          <p className="text-base leading-relaxed text-cinza">Você ainda não tem transações.</p>
        ) : (
          <>
            {haPendentes && (
              <p role="status" className="mb-5 text-[15px] leading-relaxed text-cinza">
                As transações pendentes se atualizam sozinhas quando a rede confirmar.
              </p>
            )}
            <ul aria-live="polite">
              {extrato.map((transacao) => (
                <Transacao key={transacao.id} {...transacao} />
              ))}
            </ul>
          </>
        )}
      </Cartao>
      <AtualizarEnquantoPendente haPendentes={haPendentes} />
    </div>
  );
}
