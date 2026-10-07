"use client";

import { useActionState } from "react";
import { entrarNaPlataforma } from "@/app/acoes-de-sessao";
import { Aviso, classeDeCampo } from "@/components/landing/base";

export function FormularioEntrar() {
  const [estado, acao, enviando] = useActionState(entrarNaPlataforma, {});
  return (
    <form action={acao} className="mt-8 space-y-5">
      <div>
        <label htmlFor="email" className="mb-2 block text-[15px] font-medium">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="voce@email.com"
          defaultValue={estado.email}
          className={classeDeCampo}
        />
      </div>
      <div>
        <label htmlFor="senha" className="mb-2 block text-[15px] font-medium">
          Senha
        </label>
        <input id="senha" name="senha" type="password" required autoComplete="current-password" className={classeDeCampo} />
      </div>
      {estado.erro && (
        <div role="alert">
          <Aviso>{estado.erro}</Aviso>
        </div>
      )}
      <button
        type="submit"
        disabled={enviando}
        className="h-[52px] w-full rounded-lg bg-folha text-base font-semibold text-white transition-colors hover:bg-mata disabled:opacity-60"
      >
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
