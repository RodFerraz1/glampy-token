import type { Banco } from "./banco";
import type { Cadeia } from "./cadeia";
import type { ContaInteligente } from "./conta-inteligente";
import type { Governanca } from "./governanca";
import type { Pagamento } from "./pagamento";

/** Bordas externas das operações. Cada uma tem versão real e versão falsa. */
export interface Dependencias {
  banco: Banco;
  cadeia: Cadeia;
  contaInteligente: ContaInteligente;
  pagamento: Pagamento;
  governanca: Governanca;
}
