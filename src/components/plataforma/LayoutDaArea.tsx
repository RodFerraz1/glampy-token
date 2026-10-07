import { LogOut } from "lucide-react";
import Link from "next/link";
import { sair } from "@/app/acoes-de-sessao";
import { AREAS } from "@/areas";
import { Cartao, Container } from "@/components/landing/base";
import type { Papel } from "@/servidor/autorizacao";

export function LayoutDaArea({ papel, email, children }: { papel: Papel; email: string; children: React.ReactNode }) {
  const area = AREAS[papel];
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-borda bg-creme/95 backdrop-blur">
        <Container className="flex h-16 items-center justify-between gap-4 sm:h-[76px]">
          <Link href={area.caminho} className="flex min-w-0 items-baseline gap-2">
            <span className="text-[28px] font-bold leading-none tracking-[-0.02em] text-folha">ibiti</span>
            <span className="truncate text-[15px] text-cinza">{area.nome}</span>
          </Link>
          <div className="flex shrink-0 items-center gap-4">
            <span className="hidden max-w-[260px] truncate text-[15px] text-cinza sm:block">{email}</span>
            <form action={sair}>
              <button
                type="submit"
                className="inline-flex h-10 items-center gap-2 rounded-lg border-[1.5px] border-folha px-3 text-[15px] font-semibold text-folha transition-colors hover:bg-folha hover:text-white sm:px-4"
              >
                <LogOut className="size-4" strokeWidth={2} aria-hidden />
                Sair
              </button>
            </form>
          </div>
        </Container>
      </header>
      <main className="flex-1 py-10 sm:py-14">
        <Container>{children}</Container>
      </main>
    </div>
  );
}

export function AreaVazia({ papel, descricao }: { papel: Papel; descricao: string }) {
  return (
    <>
      <h1 className="text-[32px] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[40px]">{AREAS[papel].nome}</h1>
      <Cartao className="mt-8 p-6 sm:p-7">
        <p className="text-base leading-relaxed text-cinza">{descricao}</p>
      </Cartao>
    </>
  );
}
