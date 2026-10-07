import type { Metadata } from "next";
import { Cartao } from "@/components/landing/base";
import { FormularioConvite } from "@/components/plataforma/FormularioConvite";
import { LinkDeVolta } from "@/components/plataforma/LinkDeVolta";
import { formatarDataHora } from "@/formatacao";
import { obterBanco } from "@/servidor/dependencias";
import { listarConvites, VALIDADE_DO_CONVITE_EM_DIAS, type StatusDoConvite } from "@/servidor/operacoes/convites";
import { exigirArea } from "@/servidor/sessao";

export const metadata: Metadata = { title: "Convites · Ibiti Glamping" };

const SELOS: Record<StatusDoConvite, { texto: string; classe: string }> = {
  pendente: { texto: "Pendente", classe: "bg-musgo text-folha" },
  usado: { texto: "Usado", classe: "bg-areia text-tinta" },
  vencido: { texto: "Vencido", classe: "bg-aviso text-aviso-texto" },
};

export default async function Convites() {
  const usuario = await exigirArea("administrador");
  const convites = await listarConvites({ banco: obterBanco() }, usuario.id);

  return (
    <>
      <LinkDeVolta href="/ibiti">Painel IBITI</LinkDeVolta>
      <h1 className="mt-4 text-[32px] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[40px]">Convites</h1>
      <p className="mt-3 text-base leading-relaxed text-cinza">
        Só quem recebe um convite consegue se cadastrar. A plataforma não envia e-mail: copie o link e mande pelo canal que preferir.
      </p>

      <Cartao className="mt-8 p-6 sm:p-7">
        <h2 className="mb-4 text-xl font-semibold">Novo convite</h2>
        <FormularioConvite validadeEmDias={VALIDADE_DO_CONVITE_EM_DIAS} />
      </Cartao>

      <h2 className="mt-12 text-xl font-semibold">Convites criados</h2>
      {convites.length === 0 ? (
        <p className="mt-4 text-base text-cinza">Nenhum convite criado ainda.</p>
      ) : (
        <ul className="mt-4 divide-y divide-borda rounded-[20px] border border-borda bg-white">
          {convites.map((convite) => (
            <li key={convite.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <div className="min-w-0">
                <p className="truncate text-base font-medium">{convite.email}</p>
                <p className="mt-1 text-sm text-cinza">
                  Criado em {formatarDataHora(convite.criadoEm)} ·{" "}
                  {convite.usadoEm ? `usado em ${formatarDataHora(convite.usadoEm)}` : `vale até ${formatarDataHora(convite.expiraEm)}`}
                </p>
              </div>
              <span className={`w-fit shrink-0 rounded-full px-3 py-1 text-sm font-medium ${SELOS[convite.status].classe}`}>
                {SELOS[convite.status].texto}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
