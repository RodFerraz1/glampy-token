export interface CobrancaPix {
  id: string;
  aprovada: boolean;
}

export interface Pagamento {
  cobrarPix(valorCentavos: bigint): Promise<CobrancaPix>;
}

/** PIX de demonstração: aprova sempre, depois de um pequeno atraso. */
export function criarPagamentoSimulado({ atrasoMs = 1500 } = {}): Pagamento {
  return {
    async cobrarPix() {
      await new Promise((resolver) => setTimeout(resolver, atrasoMs));
      return { id: crypto.randomUUID(), aprovada: true };
    },
  };
}
