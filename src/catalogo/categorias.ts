/** As categorias da tabela de benefícios, na ordem em que a versão 1 as apresenta. */
export const CATEGORIAS = ["Wellness", "Passeios", "Gastronomia", "Bike e cavalo", "Hospedagem", "Taxas"] as const;

export type Categoria = (typeof CATEGORIAS)[number];

export const ehCategoria = (valor: string): valor is Categoria => (CATEGORIAS as readonly string[]).includes(valor);

/** O resgate custa 60% do preço de tabela: o detentor paga 40% a menos. */
export const precoDeResgate = (precoTabelaCentavos: number) => Math.round((precoTabelaCentavos * 60) / 100);
