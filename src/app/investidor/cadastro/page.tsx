import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Cartao } from "@/components/landing/base";
import { FormularioCadastro } from "@/components/plataforma/FormularioCadastro";
import { TEXTO_DA_DECLARACAO } from "@/declaracao-investidor-profissional";
import { obterBanco } from "@/servidor/dependencias";
import { consultarCadastro } from "@/servidor/operacoes/cadastro";
import { consultarCarteira } from "@/servidor/operacoes/carteira";
import { exigirArea } from "@/servidor/sessao";

export const metadata: Metadata = { title: "Cadastro · Ibiti Glamping" };

export default async function Cadastro() {
  const usuario = await exigirArea("investidor");
  const banco = obterBanco();
  if (await consultarCadastro({ banco }, usuario.id)) redirect("/investidor");
  const carteira = await consultarCarteira({ banco }, usuario.id);

  return (
    <div className="mx-auto max-w-[640px]">
      <h1 className="text-[32px] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[40px]">Seu cadastro</h1>
      <p className="mt-3 text-base leading-relaxed text-cinza">
        O Ibiti usa estes dados para identificar você e analisar o cadastro antes da primeira compra.
      </p>
      <Cartao className="mt-8 p-6 sm:p-7">
        <FormularioCadastro declaracao={TEXTO_DA_DECLARACAO} email={usuario.email} carteira={carteira?.endereco ?? null} />
      </Cartao>
    </div>
  );
}
