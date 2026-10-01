import { NextResponse, type NextRequest } from "next/server";
import { criarClienteDaSessao } from "@/servidor/adaptadores/sessao";

/**
 * Renova a sessão do Supabase antes das páginas da plataforma, que não
 * conseguem gravar cookies. A guarda de papel fica em `exigirArea`.
 */
export async function proxy(requisicao: NextRequest) {
  let resposta = NextResponse.next({ request: requisicao });
  const cliente = criarClienteDaSessao({
    getAll: () => requisicao.cookies.getAll(),
    setAll: (lista, cabecalhos) => {
      for (const { name, value } of lista) requisicao.cookies.set(name, value);
      resposta = NextResponse.next({ request: requisicao });
      for (const { name, value, options } of lista) resposta.cookies.set(name, value, options);
      for (const [nome, valor] of Object.entries(cabecalhos)) resposta.headers.set(nome, valor);
    },
  });
  await cliente.auth.getClaims();
  return resposta;
}

export const config = {
  matcher: ["/entrar", "/investidor/:path*", "/operador/:path*", "/ibiti/:path*"],
};
