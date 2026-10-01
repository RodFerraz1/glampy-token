"use client";

import { useActionState } from "react";
import type { EstadoDaConta } from "@/app/convite/[token]/acoes";
import { Aviso, classeDeCampo } from "@/components/landing/base";

export function FormularioConta({
  criarConta,
  email,
  tamanhoMinimoDaSenha,
}: {
  criarConta: (anterior: EstadoDaConta, formulario: FormData) => Promise<EstadoDaConta>;
  email: string;
  tamanhoMinimoDaSenha: number;
}) {
  const [estado, acao, enviando] = useActionState(criarConta, {});
  return (
    <form action={acao} className="mt-8 space-y-5">
      <div>
        <label htmlFor="email" className="mb-2 block text-[15px] font-medium">
          E-mail
        </label>
        <input id="email" name="email" type="email" value={email} readOnly className={`${classeDeCampo} bg-areia`} />
      </div>
      <div>
        <label htmlFor="senha" className="mb-2 block text-[15px] font-medium">
          Crie uma senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          required
          minLength={tamanhoMinimoDaSenha}
          autoComplete="new-password"
          aria-describedby="dica-da-senha"
          className={classeDeCampo}
        />
        <p id="dica-da-senha" className="mt-2 text-sm text-cinza">
          Pelo menos {tamanhoMinimoDaSenha} caracteres. É com ela e o e-mail que você entra na plataforma.
        </p>
      </div>
      <div>
        <label htmlFor="confirmacao" className="mb-2 block text-[15px] font-medium">
          Repita a senha
        </label>
        <input
          id="confirmacao"
          name="confirmacao"
          type="password"
          required
          minLength={tamanhoMinimoDaSenha}
          autoComplete="new-password"
          className={classeDeCampo}
        />
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
        {enviando ? "Criando acesso…" : "Criar acesso e continuar"}
      </button>
    </form>
  );
}
