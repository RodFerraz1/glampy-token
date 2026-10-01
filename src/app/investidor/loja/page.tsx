import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIAS } from "@/catalogo/categorias";
import { Aviso, Cartao } from "@/components/landing/base";
import { LinkDeVolta } from "@/components/plataforma/LinkDeVolta";
import { ResgateDoBeneficio } from "@/components/plataforma/ResgateDoBeneficio";
import { formatarCredito, formatarData, formatarReais } from "@/formatacao";
import { obterDependencias } from "@/servidor/dependencias";
import { consultarLoja } from "@/servidor/operacoes/loja";
import { exigirArea } from "@/servidor/sessao";

export const metadata: Metadata = { title: "Loja de benefícios · Ibiti Glamping" };

const dias = (quantidade: number) => (quantidade === 1 ? "1 dia" : `${quantidade} dias`);

export default async function Loja({ searchParams }: PageProps<"/investidor/loja">) {
  const usuario = await exigirArea("investidor");
  const loja = await consultarLoja(obterDependencias(), usuario.id);
  const { categoria } = await searchParams;
  const filtro = typeof categoria === "string" && CATEGORIAS.some((nome) => nome === categoria) ? categoria : null;

  return (
    <div className="mx-auto max-w-[880px]">
      <LinkDeVolta href="/investidor">Área do investidor</LinkDeVolta>
      <h1 className="mt-4 text-[32px] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[40px]">Loja de benefícios</h1>
      {!loja ? (
        <Cartao className="mt-8 p-6 sm:p-7">
          <Aviso>A loja abre quando sua carteira estiver habilitada.</Aviso>
        </Cartao>
      ) : (
        <>
          <Cartao className="mt-8 p-6 sm:p-7">
            <p className="text-sm text-cinza">Seu crédito IbitiPass no ciclo</p>
            <p className="mt-1 text-[32px] font-bold leading-none">{formatarCredito(loja.saldo)}</p>
            <p className="mt-3 text-[15px] leading-relaxed text-cinza">
              {loja.fimDoCiclo && loja.diasParaExpirar !== null
                ? `Expira em ${dias(loja.diasParaExpirar)}, em ${formatarData(loja.fimDoCiclo)}. O crédito não é cumulativo: o que não for usado no ciclo se perde.`
                : "O programa de benefícios não está em um ciclo agora."}
            </p>
          </Cartao>

          <nav aria-label="Categorias" className="mt-8 flex flex-wrap gap-2">
            {[null, ...CATEGORIAS].map((nome) => (
              <Link
                key={nome ?? "todas"}
                href={nome ? `/investidor/loja?categoria=${encodeURIComponent(nome)}` : "/investidor/loja"}
                aria-current={filtro === nome ? "page" : undefined}
                className={`rounded-full border px-4 py-2 text-[15px] font-medium transition-colors ${
                  filtro === nome ? "border-folha bg-folha text-white" : "border-borda bg-white text-tinta hover:border-folha"
                }`}
              >
                {nome ?? "Todas"}
              </Link>
            ))}
          </nav>

          {loja.beneficios.length === 0 ? (
            <p className="mt-6 text-base text-cinza">O catálogo ainda não foi publicado.</p>
          ) : (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {loja.beneficios
                .filter((beneficio) => !filtro || beneficio.categoria === filtro)
                .map((beneficio) => (
                  <li key={beneficio.id} className="flex flex-col rounded-[20px] border border-borda bg-white p-6">
                    {beneficio.imagemUrl && (
                      // eslint-disable-next-line @next/next/no-img-element -- o link é cadastrado pelo Ibiti, de qualquer domínio
                      <img src={beneficio.imagemUrl} alt="" className="mb-4 aspect-video w-full rounded-lg object-cover" />
                    )}
                    <p className="text-sm text-cinza">{beneficio.categoria}</p>
                    <p className="mt-1 text-lg font-semibold">{beneficio.nome}</p>
                    {beneficio.descricao && <p className="mt-1 text-[15px] text-cinza">{beneficio.descricao}</p>}
                    <p className="mt-4 text-[15px]">
                      <span className="font-semibold">{formatarCredito(beneficio.custo)} IbitiPass</span>
                      <span className="text-cinza"> · {formatarReais(beneficio.precoCentavos)}</span>
                    </p>
                    <div className="mt-4 flex-1 content-end">
                      {beneficio.disponivel ? (
                        <ResgateDoBeneficio
                          beneficioId={beneficio.id}
                          nome={beneficio.nome}
                          carteira={loja.carteira}
                          passkey={loja.passkey}
                        />
                      ) : (
                        <p className="rounded-lg bg-areia px-4 py-3 text-center text-[15px] text-tinta">
                          Indisponível: acima do seu saldo
                        </p>
                      )}
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
