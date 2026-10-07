import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AREAS } from "@/areas";
import { FormularioEntrar } from "@/components/plataforma/FormularioEntrar";
import { LinkDeVolta } from "@/components/plataforma/LinkDeVolta";
import { usuarioAtual } from "@/servidor/sessao";

export const metadata: Metadata = { title: "Entrar · Ibiti Glamping" };

export default async function Entrar() {
  const usuario = await usuarioAtual();
  if (usuario) redirect(AREAS[usuario.papel].caminho);

  return (
    <main className="relative flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="absolute left-4 top-6 sm:left-8">
        <LinkDeVolta href="/">Voltar ao site</LinkDeVolta>
      </div>
      <div className="w-full max-w-[440px]">
        <Link href="/" className="flex items-baseline justify-center gap-2">
          <span className="text-[28px] font-bold leading-none tracking-[-0.02em] text-folha">ibiti</span>
          <span className="text-[15px] text-cinza">Glamping</span>
        </Link>
        <div className="mt-8 rounded-3xl border border-borda bg-white p-6 sm:p-9">
          <h1 className="text-[28px] font-bold leading-[1.1] tracking-[-0.02em]">Entrar na plataforma</h1>
          <p className="mt-3 text-base text-cinza">Use o e-mail e a senha do seu cadastro.</p>
          <FormularioEntrar />
        </div>
        <p className="mt-6 text-center text-[15px] leading-relaxed text-cinza">
          O acesso é por convite.{" "}
          <Link href="/#contato" className="font-medium text-folha underline underline-offset-2 hover:text-mata">
            Quero ser um investidor
          </Link>
        </p>
      </div>
    </main>
  );
}
