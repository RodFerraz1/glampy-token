"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { BotaoSecundario, Container } from "./base";
import { links } from "./navegacao";

export function MenuMobile() {
  const dialogo = useRef<HTMLDialogElement>(null);
  const fechar = () => dialogo.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={() => dialogo.current?.showModal()}
        aria-label="Abrir menu"
        className="-mr-2 flex size-10 items-center justify-center rounded-lg text-folha transition-colors hover:bg-musgo lg:hidden"
      >
        <Menu className="size-6" strokeWidth={1.75} aria-hidden />
      </button>
      <dialog
        ref={dialogo}
        aria-label="Menu"
        onClick={(evento) => {
          if (evento.target instanceof Element && evento.target.closest("a")) fechar();
        }}
        className="m-0 h-dvh max-h-none w-full max-w-none bg-creme p-0 text-tinta lg:hidden"
      >
        <Container className="flex h-[76px] items-center justify-between border-b border-borda">
          <span className="text-[28px] font-bold leading-none tracking-[-0.02em] text-folha">Glampy</span>
          <button
            type="button"
            onClick={fechar}
            aria-label="Fechar menu"
            className="-mr-2 flex size-10 items-center justify-center rounded-lg text-folha transition-colors hover:bg-musgo"
          >
            <X className="size-6" strokeWidth={1.75} aria-hidden />
          </button>
        </Container>
        <Container>
          <nav aria-label="Principal">
            <ul>
              {links.map((link) => (
                <li key={link.href} className="border-b border-borda">
                  <a
                    href={link.href}
                    className="block py-5 text-[22px] font-medium transition-colors hover:text-folha"
                  >
                    {link.rotulo}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-8 flex flex-col gap-3">
            <BotaoSecundario href="#contato" className="h-[52px] text-base">
              Quero conversar
            </BotaoSecundario>
            <Link
              href="/entrar"
              className="flex h-[52px] items-center justify-center text-base font-semibold text-folha transition-colors hover:text-mata"
            >
              Entrar
            </Link>
          </div>
        </Container>
      </dialog>
    </>
  );
}
