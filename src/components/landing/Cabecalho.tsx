import Link from "next/link";
import { BotaoSecundario, Container } from "./base";
import { MenuMobile } from "./MenuMobile";
import { links } from "./navegacao";

export function Cabecalho() {
  return (
    <header className="sticky top-0 z-10 border-b border-borda bg-creme/95 backdrop-blur">
      <Container className="flex h-[76px] items-center justify-between gap-6">
        <a href="#inicio">
          <span className="text-[28px] font-bold leading-none tracking-[-0.02em] text-folha">Glampy</span>
        </a>
        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex gap-9 text-base">
            {links.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="transition-colors hover:text-folha">
                  {link.rotulo}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-5">
          <div className="hidden items-center gap-5 sm:flex">
            <Link href="/entrar" className="text-[15px] font-semibold text-folha transition-colors hover:text-mata">
              Entrar
            </Link>
            <BotaoSecundario href="#contato" className="h-10 px-4 text-[15px]">
              Quero conversar
            </BotaoSecundario>
          </div>
          <MenuMobile />
        </div>
      </Container>
    </header>
  );
}
