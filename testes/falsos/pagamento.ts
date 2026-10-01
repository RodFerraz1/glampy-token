import type { Pagamento } from "@/servidor/adaptadores/pagamento";

export function criarPagamentoFalso({ aprova = true } = {}) {
  const cobrancas: bigint[] = [];
  const pagamento: Pagamento & { cobrancas: bigint[] } = {
    cobrancas,
    async cobrarPix(valorCentavos) {
      cobrancas.push(valorCentavos);
      return { id: crypto.randomUUID(), aprovada: aprova };
    },
  };
  return pagamento;
}
