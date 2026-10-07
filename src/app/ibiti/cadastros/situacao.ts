import type { Database } from "@/servidor/adaptadores/tipos-do-banco";
import type { StatusDoCadastro } from "@/servidor/operacoes/cadastro";

type StatusDaCarteira = Database["public"]["Enums"]["status_carteira"];

const SELOS = {
  em_analise: { texto: "Em análise", classe: "bg-aviso text-aviso-texto" },
  reprovado: { texto: "Reprovado", classe: "bg-areia text-tinta" },
  habilitada: { texto: "Aprovado e habilitado", classe: "bg-musgo text-folha" },
  falhou: { texto: "Habilitação falhou", classe: "bg-aviso text-aviso-texto" },
  habilitando: { texto: "Aprovado, habilitando", classe: "bg-aviso text-aviso-texto" },
  desabilitada: { texto: "Carteira desabilitada", classe: "bg-areia text-tinta" },
  pendente: { texto: "Incompleto", classe: "bg-areia text-tinta" },
};

/** Selo que junta o status do cadastro e o da carteira, que só importa depois de aprovado. */
export function seloDaSituacao(status: StatusDoCadastro, carteira: StatusDaCarteira | null, habilitacaoFalhou: boolean) {
  if (status !== "aprovado") return SELOS[status];
  if (carteira === "habilitada" || carteira === "desabilitada") return SELOS[carteira];
  return habilitacaoFalhou ? SELOS.falhou : SELOS.habilitando;
}
