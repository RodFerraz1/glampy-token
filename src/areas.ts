import type { Papel } from "@/servidor/autorizacao";

export const AREAS: Record<Papel, { caminho: string; nome: string }> = {
  investidor: { caminho: "/investidor", nome: "Área do investidor" },
  operador: { caminho: "/operador", nome: "Operação do território" },
  administrador: { caminho: "/ibiti", nome: "Painel IBITI" },
};
