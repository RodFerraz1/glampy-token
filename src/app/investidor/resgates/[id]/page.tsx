import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { AVISO_DO_RESGATE } from "@/catalogo/resgate";
import { Aviso, Cartao } from "@/components/landing/base";
import { LinkDaTransacao } from "@/components/plataforma/LinkDaTransacao";
import { LinkDeVolta } from "@/components/plataforma/LinkDeVolta";
import { SeloDoResgate } from "@/components/plataforma/SeloDoResgate";
import { formatarCredito, formatarDataHora } from "@/formatacao";
import { obterBanco } from "@/servidor/dependencias";
import { consultarResgate } from "@/servidor/operacoes/loja";
import { exigirArea } from "@/servidor/sessao";

export const metadata: Metadata = { title: "Voucher · Ibiti Glamping" };

export default async function Voucher({ params }: PageProps<"/investidor/resgates/[id]">) {
  const usuario = await exigirArea("investidor");
  const { id } = await params;
  const resgate = await consultarResgate({ banco: obterBanco() }, usuario.id, id);
  if (!resgate) notFound();
  const qr =
    resgate.status === "confirmado" ? await QRCode.toString(resgate.codigo, { type: "svg", margin: 1 }) : null;

  return (
    <div className="mx-auto max-w-[480px]">
      <LinkDeVolta href="/investidor/resgates">Meus resgates</LinkDeVolta>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="min-w-0 text-[28px] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[36px]">
          {resgate.beneficio.nome}
        </h1>
        <SeloDoResgate status={resgate.status} />
      </div>
      {resgate.beneficio.descricao && <p className="mt-2 text-base text-cinza">{resgate.beneficio.descricao}</p>}

      <Cartao className="mt-6 p-6 text-center sm:p-7">
        {qr ? (
          <>
            <div
              role="img"
              aria-label="QR code do voucher"
              className="mx-auto w-full max-w-[280px] [&>svg]:h-auto [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: qr }}
            />
            <p className="mt-4 text-[15px] text-cinza">Apresente este QR code no território. Se a câmera falhar, informe o código:</p>
            <p className="mt-2 break-all font-mono text-base font-medium">{resgate.codigo}</p>
          </>
        ) : resgate.status === "entregue" ? (
          <p className="text-base text-cinza">
            Benefício entregue{resgate.entregueEm ? ` em ${formatarDataHora(resgate.entregueEm)}` : ""}.
          </p>
        ) : (
          <p className="text-base text-cinza">{resgate.erro ?? "Este voucher não pode mais ser usado."}</p>
        )}
      </Cartao>

      {resgate.status === "confirmado" && (
        <div className="mt-6">
          <Aviso>{AVISO_DO_RESGATE}</Aviso>
        </div>
      )}

      <dl className="mt-6 space-y-2 text-[15px]">
        <div className="flex flex-wrap justify-between gap-x-4">
          <dt className="text-cinza">Resgatado em</dt>
          <dd className="font-medium">{formatarDataHora(resgate.criadoEm)}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-x-4">
          <dt className="text-cinza">Crédito usado</dt>
          <dd className="font-medium">{formatarCredito(resgate.custo)} IbitiPass</dd>
        </div>
      </dl>
      {resgate.txHash && (
        <LinkDaTransacao hash={resgate.txHash} className="mt-4">
          Transação
        </LinkDaTransacao>
      )}
    </div>
  );
}
