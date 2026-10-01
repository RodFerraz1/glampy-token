export const ETAPAS_DA_COMPRA = {
  pix: "Pagamento via PIX (simulado)",
  conversao: "Conversão para stablecoin",
  autorizacao: "Autorização do pagamento",
  compra: "Compra e entrega do token",
  carteira: "Token na carteira",
};

export type EtapaDaCompra = keyof typeof ETAPAS_DA_COMPRA;

/** As etapas que viram transação própria em `transacoes`, marcadas em `dados.etapa`. */
export type EtapaGravada = Extract<EtapaDaCompra, "conversao" | "compra">;

export const ehEtapaGravada = (valor: unknown): valor is EtapaGravada => valor === "conversao" || valor === "compra";
