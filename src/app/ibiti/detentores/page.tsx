import type { Metadata } from "next";
import { LinkDeVolta } from "@/components/plataforma/LinkDeVolta";
import { abreviarEndereco, linkDoEndereco } from "@/explorador";
import { obterDependencias } from "@/servidor/dependencias";
import { consultarDetentores } from "@/servidor/operacoes/painel";
import { exigirArea } from "@/servidor/sessao";

export const metadata: Metadata = { title: "Detentores · Ibiti Glamping" };

export default async function Detentores() {
  const usuario = await exigirArea("administrador");
  const detentores = await consultarDetentores(obterDependencias(), usuario.id);

  return (
    <>
      <LinkDeVolta href="/ibiti/painel">Painel</LinkDeVolta>
      <h1 className="mt-4 text-[32px] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[40px]">Detentores</h1>
      <p className="mt-3 text-base leading-relaxed text-cinza">
        Quem detém o token agora, lido do contrato. Esta consulta fica registrada na auditoria, com quem consultou e quando.
      </p>
      <ul className="mt-8 divide-y divide-borda rounded-[20px] border border-borda bg-white">
        {detentores.map((detentor) => (
          <li key={detentor.endereco} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-7">
            <div className="min-w-0">
              <p className="text-base font-medium">{detentor.nome}</p>
              <a
                href={linkDoEndereco(detentor.endereco)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-sm text-cinza underline-offset-2 hover:underline"
              >
                {abreviarEndereco(detentor.endereco)}
              </a>
            </div>
            <p className="text-lg font-semibold">{detentor.saldo.toString()}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
