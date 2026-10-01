import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./tipos-do-banco";

export type ClienteDaSessao = SupabaseClient<Database>;

/**
 * Cliente Supabase com a chave pública e a sessão do usuário guardada em
 * cookies. Só enxerga o que a RLS libera; é por ele que se entra e se sai.
 */
export function criarClienteDaSessao(cookies: CookieMethodsServer): ClienteDaSessao {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chavePublica = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !chavePublica) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY são obrigatórias");
  }
  return createServerClient<Database>(url, chavePublica, { cookies });
}
