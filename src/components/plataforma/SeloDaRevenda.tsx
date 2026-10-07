import type { EstadoDaRevenda } from "@/servidor/operacoes/revenda";

const ESTADOS: Record<EstadoDaRevenda, { texto: string; classe: string }> = {
  inexistente: { texto: "Inexistente", classe: "bg-areia text-tinta" },
  ofertado: { texto: "Ofertado ao Ibiti", classe: "bg-areia text-tinta" },
  recusado: { texto: "Preferência recusada", classe: "bg-musgo text-folha" },
  em_crivo: { texto: "Em crivo", classe: "bg-areia text-tinta" },
  aprovado: { texto: "Comprador aprovado", classe: "bg-musgo text-folha" },
  liquidado: { texto: "Liquidado", classe: "bg-areia text-tinta" },
  cancelado: { texto: "Cancelado", classe: "bg-aviso text-aviso-texto" },
};

export function SeloDaRevenda({ estado }: { estado: EstadoDaRevenda }) {
  const { texto, classe } = ESTADOS[estado];
  return <span className={`w-fit shrink-0 rounded-full px-3 py-1 text-sm font-medium ${classe}`}>{texto}</span>;
}
