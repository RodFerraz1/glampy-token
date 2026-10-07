import type { Metadata } from "next";
import { CATEGORIAS } from "@/catalogo/categorias";
import { Cartao } from "@/components/landing/base";
import { FormularioDoBeneficio, ImportarVersao1, PublicarCatalogo } from "@/components/plataforma/GestaoDoCatalogo";
import { LinkDaTransacao } from "@/components/plataforma/LinkDaTransacao";
import { abreviarHash } from "@/explorador";
import { formatarDataHora, formatarReais } from "@/formatacao";
import { obterBanco } from "@/servidor/dependencias";
import { listarBeneficios, listarVersoes } from "@/servidor/operacoes/catalogo";
import { exigirArea } from "@/servidor/sessao";

export const metadata: Metadata = { title: "Catálogo · Passaporte Ibiti · Ibiti Glamping" };

export default async function Catalogo() {
  const usuario = await exigirArea("administrador");
  const banco = obterBanco();
  const [beneficios, versoes] = await Promise.all([listarBeneficios({ banco }, usuario.id), listarVersoes({ banco })]);
  const [vigente] = versoes;
  const ativos = beneficios.filter(({ ativo }) => ativo).length;

  return (
    <>
      <p className="text-base leading-relaxed text-cinza">
        As alterações ficam em rascunho até a publicação. Publicar grava o hash da tabela no IbitiPass, e é pela versão
        publicada que o investidor resgata.
      </p>

      <Cartao className="mt-8 p-6 sm:p-7">
        <h2 className="text-xl font-semibold">Publicação</h2>
        {vigente ? (
          <p className="mt-2 text-[15px] leading-relaxed text-cinza">
            Vigente: versão {vigente.versao}, publicada em {formatarDataHora(vigente.publicadaEm)}, com {vigente.beneficios}{" "}
            benefícios. Publicar agora cria a versão {vigente.versao + 1} com os {ativos} benefícios ativos.
          </p>
        ) : (
          <p className="mt-2 text-[15px] leading-relaxed text-cinza">
            Nenhuma versão no banco ainda. A versão 1 já está no contrato, publicada pela Sprint 04: importe-a para trazer os
            benefícios da tabela original, com o hash conferido contra o on-chain.
          </p>
        )}
        <div className="mt-5 flex flex-col gap-4 sm:flex-row">
          {vigente ? <PublicarCatalogo /> : <ImportarVersao1 />}
        </div>
      </Cartao>

      <Cartao className="mt-6 p-6 sm:p-7">
        <h2 className="mb-4 text-xl font-semibold">Novo benefício</h2>
        <FormularioDoBeneficio />
      </Cartao>

      <h2 className="mt-12 text-xl font-semibold">Benefícios</h2>
      {beneficios.length === 0 && <p className="mt-4 text-base text-cinza">Nenhum benefício cadastrado.</p>}
      {CATEGORIAS.map((categoria) => {
        const daCategoria = beneficios.filter((beneficio) => beneficio.categoria === categoria);
        if (daCategoria.length === 0) return null;
        return (
          <section key={categoria} className="mt-6">
            <h3 className="text-lg font-semibold">{categoria}</h3>
            <ul className="mt-3 divide-y divide-borda rounded-[20px] border border-borda bg-white">
              {daCategoria.map((beneficio) => (
                <li key={beneficio.id}>
                  <details className="group px-5 py-4 sm:px-7">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-base font-medium">{beneficio.nome}</p>
                        {beneficio.descricao && <p className="text-sm text-cinza">{beneficio.descricao}</p>}
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        {!beneficio.ativo && <span className="rounded-full bg-areia px-3 py-1 font-medium text-tinta">Inativo</span>}
                        <span className="text-cinza">
                          Tabela {formatarReais(beneficio.precoTabelaCentavos)} ·{" "}
                          <span className="font-medium text-tinta">resgate {formatarReais(beneficio.precoCentavos)}</span>
                        </span>
                      </div>
                    </summary>
                    <div className="mt-5 border-t border-borda pt-5">
                      <FormularioDoBeneficio beneficio={beneficio} />
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <h2 className="mt-12 text-xl font-semibold">Versões publicadas</h2>
      {versoes.length === 0 ? (
        <p className="mt-4 text-base text-cinza">Nenhuma versão no banco.</p>
      ) : (
        <ul className="mt-4 divide-y divide-borda rounded-[20px] border border-borda bg-white">
          {versoes.map((versao) => (
            <li key={versao.versao} className="px-5 py-4 sm:px-7">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-base font-medium">Versão {versao.versao}</p>
                <p className="text-sm text-cinza">
                  {formatarDataHora(versao.publicadaEm)} · {versao.beneficios} benefícios
                </p>
              </div>
              <p className="mt-1 break-all font-mono text-sm text-cinza" title={versao.hashTabela}>
                Hash da tabela {abreviarHash(versao.hashTabela)}
              </p>
              {versao.txPublicacao && (
                <LinkDaTransacao hash={versao.txPublicacao} className="mt-1">
                  Transação
                </LinkDaTransacao>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
