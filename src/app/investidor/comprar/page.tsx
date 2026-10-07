import { Aviso, Cartao } from "@/components/landing/base";
import { CompraComTimeline } from "@/components/plataforma/CompraComTimeline";
import { LinkDeVolta } from "@/components/plataforma/LinkDeVolta";
import { obterDependencias } from "@/servidor/dependencias";
import { condicoesDaCompra } from "@/servidor/operacoes/compra";
import { exigirArea } from "@/servidor/sessao";

export default async function Comprar() {
  const usuario = await exigirArea("investidor");
  const condicoes = await condicoesDaCompra(obterDependencias(), usuario.id);

  return (
    <div className="mx-auto max-w-[640px]">
      <LinkDeVolta href="/investidor">Área do investidor</LinkDeVolta>
      <h1 className="mt-4 text-[32px] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[40px]">Comprar tokens</h1>
      {"erro" in condicoes ? (
        <Cartao className="mt-8 p-6 sm:p-7">
          <Aviso>{condicoes.erro}</Aviso>
        </Cartao>
      ) : (
        <CompraComTimeline {...condicoes} />
      )}
    </div>
  );
}
