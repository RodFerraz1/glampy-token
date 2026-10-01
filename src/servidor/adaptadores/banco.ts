import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/servidor/adaptadores/tipos-do-banco";

export type Banco = SupabaseClient<Database>;

export interface ConfiguracaoBanco {
  url: string;
  /** Chave secreta do Supabase: ignora RLS, nunca vai ao cliente. */
  chaveSecreta: string;
}

export function criarBanco({ url, chaveSecreta }: ConfiguracaoBanco): Banco {
  return createClient<Database>(url, chaveSecreta, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * `uint256` no banco é numeric(78), e o PostgREST o troca por número JSON, que
 * perde precisão acima de 2^53. Por isso vai como texto na escrita e volta com
 * `::text` na leitura.
 */
export const comoNumeric = (valor: bigint) => valor.toString() as unknown as number;
