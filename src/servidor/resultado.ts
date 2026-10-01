/** O que uma operação devolve: o resultado, ou a recusa com a mensagem que a tela mostra. */
export type Resultado<T> = T | { erro: string };

export const ehUuid = (valor: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);
