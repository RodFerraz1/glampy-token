import type { StatusDaReatribuicao } from "@/servidor/operacoes/reatribuicao";

const STATUS: Record<StatusDaReatribuicao, { texto: string; classe: string }> = {
  aberta: { texto: "Aberto", classe: "bg-areia text-tinta" },
  em_analise: { texto: "Em análise", classe: "bg-areia text-tinta" },
  anunciada: { texto: "Anunciada on-chain", classe: "bg-musgo text-folha" },
  executada: { texto: "Executada", classe: "bg-musgo text-folha" },
  cancelada: { texto: "Cancelado", classe: "bg-aviso text-aviso-texto" },
  recusada: { texto: "Recusado", classe: "bg-aviso text-aviso-texto" },
};

export const MOTIVOS = { perda_de_acesso: "Perda de acesso", sucessao: "Sucessão", ordem_judicial: "Ordem judicial" };

export function SeloDaReatribuicao({ status }: { status: StatusDaReatribuicao }) {
  const { texto, classe } = STATUS[status];
  return <span className={`w-fit shrink-0 rounded-full px-3 py-1 text-sm font-medium ${classe}`}>{texto}</span>;
}
