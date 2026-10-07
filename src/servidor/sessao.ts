import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { AREAS } from "@/areas";
import { criarClienteDaSessao } from "./adaptadores/sessao";
import { papelDe, type Papel } from "./autorizacao";

export async function clienteDaSessao() {
  const armazem = await cookies();
  return criarClienteDaSessao({
    getAll: () => armazem.getAll(),
    setAll: (lista) => {
      try {
        for (const { name, value, options } of lista) armazem.set(name, value, options);
      } catch {
        // Server Components não gravam cookies; o proxy renova a sessão na próxima requisição.
      }
    },
  });
}

export const usuarioAtual = cache(async () => {
  const cliente = await clienteDaSessao();
  const { data } = await cliente.auth.getClaims();
  if (!data) return null;
  const papel = await papelDe(cliente, data.claims.sub);
  if (!papel) return null;
  return { id: data.claims.sub, email: data.claims.email ?? "", papel };
});

export async function exigirArea(papel: Papel) {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/entrar");
  if (usuario.papel !== papel) redirect(AREAS[usuario.papel].caminho);
  return usuario;
}
