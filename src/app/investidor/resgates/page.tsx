import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LinkDeVolta } from "@/components/plataforma/LinkDeVolta";
import { SeloDoResgate } from "@/components/plataforma/SeloDoResgate";
import { formatarCredito, formatarDataHora } from "@/formatacao";
import { obterBanco } from "@/servidor/dependencias";
import { listarMeusResgates, type StatusDoResgate } from "@/servidor/operacoes/loja";
import { exigirArea } from "@/servidor/sessao";

export const metadata: Metadata = { title: "Meus resgates · Ibiti Glamping" };

const GRUPOS: { titulo: string; status: StatusDoResgate[] }[] = [
  { titulo: "Ativos", status: ["submetido", "confirmado"] },
  { titulo: "Usados", status: ["entregue"] },
  { titulo: "Cancelados", status: ["cancelado"] },
  { titulo: "Não concluídos", status: ["falhou", "assinado"] },
];

export default async function MeusResgates() {
  const usuario = await exigirArea("investidor");
  const resgates = await listarMeusResgates({ banco: obterBanco() }, usuario.id);

  return (
    <div className="mx-auto max-w-[640px]">
      <LinkDeVolta href="/investidor">Área do investidor</LinkDeVolta>
      <h1 className="mt-4 text-[32px] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[40px]">Meus resgates</h1>
      {resgates.length === 0 && (
        <p className="mt-8 text-base text-cinza">
          Nenhum resgate ainda.{" "}
          <Link href="/investidor/loja" className="font-medium text-folha underline-offset-2 hover:underline">
            Ver a loja de benefícios
          </Link>
        </p>
      )}
      {GRUPOS.map(({ titulo, status }) => {
        const doGrupo = resgates.filter((resgate) => status.includes(resgate.status));
        if (doGrupo.length === 0) return null;
        return (
          <section key={titulo} className="mt-8">
            <h2 className="text-xl font-semibold">{titulo}</h2>
            <ul className="mt-3 divide-y divide-borda rounded-[20px] border border-borda bg-white">
              {doGrupo.map((resgate) => (
                <li key={resgate.id}>
                  <Link href={`/investidor/resgates/${resgate.id}`} className="flex items-center gap-3 px-5 py-4 sm:px-7">
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-medium">{resgate.beneficio.nome}</p>
                      <p className="mt-1 text-sm text-cinza">
                        {formatarDataHora(resgate.criadoEm)} · {formatarCredito(resgate.custo)} IbitiPass
                      </p>
                    </div>
                    <SeloDoResgate status={resgate.status} />
                    <ChevronRight className="size-5 shrink-0 text-cinza" strokeWidth={2} aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
