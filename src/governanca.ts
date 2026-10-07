import type { SafeDeGovernanca } from "@/servidor/adaptadores/governanca";

/** As Safes de governança da Sprint 04, como a tela descreve cada decisão. */
export const SAFES: Record<SafeDeGovernanca, { nome: string; necessarias: number; diretores: number }> = {
  tesouraria: { nome: "Safe da tesouraria", necessarias: 2, diretores: 3 },
  crivo: { nome: "Safe do crivo", necessarias: 2, diretores: 3 },
  reatribuicao: { nome: "Safe de reatribuição", necessarias: 3, diretores: 5 },
};
