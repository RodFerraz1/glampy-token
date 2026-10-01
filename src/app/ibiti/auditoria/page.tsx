import type { Metadata } from "next";
import { classeDeCampo } from "@/components/landing/base";
import { LinkDeVolta } from "@/components/plataforma/LinkDeVolta";
import { classeDoSecundario } from "@/components/plataforma/formulario";
import { formatarDataHora } from "@/formatacao";
import { obterBanco } from "@/servidor/dependencias";
import { consultarAuditoria, opcoesDaAuditoria } from "@/servidor/operacoes/consultar-auditoria";
import { exigirArea } from "@/servidor/sessao";

export const metadata: Metadata = { title: "Auditoria · Ibiti Glamping" };

const legivel = (codigo: string) => codigo.replaceAll("_", " ");

export default async function Auditoria({ searchParams }: PageProps<"/ibiti/auditoria">) {
  const usuario = await exigirArea("administrador");
  const { acao, entidade } = await searchParams;
  const filtro = {
    acao: typeof acao === "string" && acao ? acao : undefined,
    entidade: typeof entidade === "string" && entidade ? entidade : undefined,
  };
  const banco = obterBanco();
  const [registros, opcoes] = await Promise.all([
    consultarAuditoria({ banco }, usuario.id, filtro),
    opcoesDaAuditoria({ banco }, usuario.id),
  ]);

  return (
    <>
      <LinkDeVolta href="/ibiti">Painel IBITI</LinkDeVolta>
      <h1 className="mt-4 text-[32px] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[40px]">Auditoria</h1>
      <p className="mt-3 text-base leading-relaxed text-cinza">
        Toda ação de administradores e operadores, com autor, data e dados. O registro é somente inserção: nada aqui pode ser
        alterado ou apagado.
      </p>

      <form action="/ibiti/auditoria" className="mt-8 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="acao" className="block text-[15px] font-medium">
            Ação
          </label>
          <select id="acao" name="acao" defaultValue={filtro.acao ?? ""} className={`mt-2 ${classeDeCampo}`}>
            <option value="">Todas</option>
            {opcoes.acoes.map((opcao) => (
              <option key={opcao} value={opcao}>
                {legivel(opcao)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="entidade" className="block text-[15px] font-medium">
            Entidade
          </label>
          <select id="entidade" name="entidade" defaultValue={filtro.entidade ?? ""} className={`mt-2 ${classeDeCampo}`}>
            <option value="">Todas</option>
            {opcoes.entidades.map((opcao) => (
              <option key={opcao} value={opcao}>
                {legivel(opcao)}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className={classeDoSecundario}>
          Filtrar
        </button>
      </form>

      {registros.length === 0 ? (
        <p className="mt-8 text-base text-cinza">Nenhum registro com estes filtros.</p>
      ) : (
        <ul className="mt-8 divide-y divide-borda rounded-[20px] border border-borda bg-white">
          {registros.map((registro) => (
            <li key={registro.id} className="px-5 py-4 sm:px-7">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-base font-medium first-letter:uppercase">{legivel(registro.acao)}</p>
                <p className="text-sm text-cinza">{formatarDataHora(registro.em)}</p>
              </div>
              <p className="mt-1 text-sm text-cinza">
                {registro.autor} · {legivel(registro.entidade)}
                {registro.entidadeId && ` ${registro.entidadeId}`}
              </p>
              {registro.dados && typeof registro.dados === "object" && Object.keys(registro.dados).length > 0 && (
                <pre className="mt-2 overflow-x-auto rounded-lg bg-creme px-4 py-3 text-xs leading-relaxed">
                  {JSON.stringify(registro.dados, null, 2)}
                </pre>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
