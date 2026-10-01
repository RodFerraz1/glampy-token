import { CircleCheck } from "lucide-react";
import { AREAS } from "@/areas";
import { Aviso, Cartao, classeDeCampo } from "@/components/landing/base";
import { classeDoSecundario } from "@/components/plataforma/formulario";
import { LeitorDeVoucher } from "@/components/plataforma/LeitorDeVoucher";
import { MarcarEntrega } from "@/components/plataforma/MarcarEntrega";
import { SeloDoResgate } from "@/components/plataforma/SeloDoResgate";
import { formatarDataHora } from "@/formatacao";
import { obterBanco } from "@/servidor/dependencias";
import { validarVoucher } from "@/servidor/operacoes/voucher";
import { exigirArea } from "@/servidor/sessao";

// A guarda se repete na página porque o layout não impede a página de renderizar.
export default async function AreaDoOperador({ searchParams }: PageProps<"/operador">) {
  const usuario = await exigirArea("operador");
  const { codigo, entregue } = await searchParams;
  const voucher = typeof codigo === "string" ? await validarVoucher({ banco: obterBanco() }, usuario.id, codigo) : null;

  return (
    <div className="mx-auto max-w-[480px]">
      <h1 className="text-[32px] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[40px]">{AREAS.operador.nome}</h1>
      <p className="mt-3 text-base leading-relaxed text-cinza">
        Leia o QR code do voucher do investidor para conferir o benefício e registrar a entrega.
      </p>

      {voucher &&
        ("erro" in voucher ? (
          <div role="alert" className="mt-8">
            <Aviso>{voucher.erro}</Aviso>
          </div>
        ) : (
          <Cartao className="mt-8 p-6 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-cinza">{voucher.beneficio.categoria}</p>
                <h2 className="text-xl font-semibold">{voucher.beneficio.nome}</h2>
                {voucher.beneficio.descricao && <p className="text-[15px] text-cinza">{voucher.beneficio.descricao}</p>}
              </div>
              <SeloDoResgate status={voucher.status} />
            </div>
            <dl className="mt-5 space-y-2 border-t border-borda pt-5 text-[15px]">
              <div className="flex flex-wrap justify-between gap-x-4">
                <dt className="text-cinza">Investidor</dt>
                <dd className="font-medium">{voucher.investidor}</dd>
              </div>
              {voucher.entregueEm && (
                <div className="flex flex-wrap justify-between gap-x-4">
                  <dt className="text-cinza">Entregue em</dt>
                  <dd className="font-medium">{formatarDataHora(voucher.entregueEm)}</dd>
                </div>
              )}
            </dl>
            <div className="mt-5">
              {voucher.podeEntregar ? (
                <MarcarEntrega codigo={voucher.id} />
              ) : voucher.status === "entregue" ? (
                <p role="status" className="flex gap-3 rounded-lg bg-musgo px-4 py-4 text-[15px] leading-relaxed text-folha">
                  <CircleCheck className="mt-0.5 size-5 shrink-0" strokeWidth={1.75} aria-hidden />
                  {entregue ? "Entrega registrada. Pode entregar o benefício." : voucher.aviso}
                </p>
              ) : (
                <div role="alert">
                  <Aviso>{voucher.aviso}</Aviso>
                </div>
              )}
            </div>
          </Cartao>
        ))}

      <Cartao className="mt-8 p-6 sm:p-7">
        <LeitorDeVoucher />
        <form action="/operador" className="mt-6 border-t border-borda pt-6">
          <label htmlFor="codigo" className="block text-[15px] font-medium">
            Ou digite o código do voucher
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              id="codigo"
              name="codigo"
              required
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="00000000-0000-0000-0000-000000000000"
              defaultValue={typeof codigo === "string" ? codigo : ""}
              className={`font-mono ${classeDeCampo}`}
            />
            <button type="submit" className={`shrink-0 ${classeDoSecundario}`}>
              Conferir
            </button>
          </div>
        </form>
      </Cartao>
    </div>
  );
}
