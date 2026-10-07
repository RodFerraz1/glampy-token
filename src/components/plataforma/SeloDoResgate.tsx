import type { StatusDoResgate } from "@/servidor/operacoes/loja";

export const STATUS_DO_RESGATE: Record<StatusDoResgate, { texto: string; classe: string }> = {
  assinado: { texto: "Assinado", classe: "bg-areia text-tinta" },
  submetido: { texto: "Aguardando confirmação", classe: "bg-areia text-tinta" },
  confirmado: { texto: "Ativo", classe: "bg-musgo text-folha" },
  falhou: { texto: "Falhou", classe: "bg-aviso text-aviso-texto" },
  entregue: { texto: "Entregue", classe: "bg-areia text-tinta" },
  cancelado: { texto: "Cancelado", classe: "bg-aviso text-aviso-texto" },
};

export function SeloDoResgate({ status }: { status: StatusDoResgate }) {
  const { texto, classe } = STATUS_DO_RESGATE[status];
  return <span className={`w-fit shrink-0 rounded-full px-3 py-1 text-sm font-medium ${classe}`}>{texto}</span>;
}
