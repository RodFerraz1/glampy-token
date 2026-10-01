import type { Metadata } from "next";
import Link from "next/link";
import { FormularioConta } from "@/components/plataforma/FormularioConta";
import { obterBanco } from "@/servidor/dependencias";
import { TAMANHO_MINIMO_DA_SENHA } from "@/servidor/operacoes/cadastro";
import { VALIDADE_DO_CONVITE_EM_DIAS, validarConvite } from "@/servidor/operacoes/convites";
import { criarContaNoConvite } from "./acoes";

export const metadata: Metadata = { title: "Convite · Ibiti Glamping" };

const classeDeLink = "font-medium text-folha underline underline-offset-2 hover:text-mata";

const MENSAGENS = {
  usado: {
    titulo: "Este convite já foi usado",
    texto: (
      <>
        Se o cadastro é seu,{" "}
        <Link href="/entrar" className={classeDeLink}>
          entre com seu e-mail e senha
        </Link>
        . Se não, peça um novo convite ao Ibiti.
      </>
    ),
  },
  vencido: {
    titulo: "Este convite venceu",
    texto: (
      <>
        O convite vale por {VALIDADE_DO_CONVITE_EM_DIAS} dias.{" "}
        <Link href="/#contato" className={classeDeLink}>
          Peça um novo convite ao Ibiti
        </Link>
        .
      </>
    ),
  },
  invalido: {
    titulo: "Link de convite inválido",
    texto: (
      <>
        Confira se o link foi copiado inteiro ou{" "}
        <Link href="/#contato" className={classeDeLink}>
          fale com o Ibiti
        </Link>
        .
      </>
    ),
  },
} satisfies Record<"usado" | "vencido" | "invalido", { titulo: string; texto: React.ReactNode }>;

export default async function Convite({ params }: PageProps<"/convite/[token]">) {
  const { token } = await params;
  const convite = await validarConvite({ banco: obterBanco() }, token);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-[440px]">
        <Link href="/" className="flex items-baseline justify-center gap-2">
          <span className="text-[28px] font-bold leading-none tracking-[-0.02em] text-folha">ibiti</span>
          <span className="text-[15px] text-cinza">Glamping</span>
        </Link>
        <div className="mt-8 rounded-3xl border border-borda bg-white p-6 sm:p-9">
          {convite.status === "pendente" ? (
            <>
              <h1 className="text-[28px] font-bold leading-[1.1] tracking-[-0.02em]">Cadastro de investidor</h1>
              <p className="mt-3 text-base text-cinza">Você foi convidado pelo Ibiti. O cadastro fica vinculado a este e-mail.</p>
              <FormularioConta
                criarConta={criarContaNoConvite.bind(null, token)}
                email={convite.email}
                tamanhoMinimoDaSenha={TAMANHO_MINIMO_DA_SENHA}
              />
            </>
          ) : (
            <>
              <h1 className="text-[28px] font-bold leading-[1.1] tracking-[-0.02em]">{MENSAGENS[convite.status].titulo}</h1>
              <p className="mt-3 text-base leading-relaxed text-cinza">{MENSAGENS[convite.status].texto}</p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
