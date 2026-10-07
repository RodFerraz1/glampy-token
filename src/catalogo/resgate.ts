/** Um crédito IbitiPass vale R$ 663,13, como `CENTAVOS_POR_TOKEN` no contrato. */
const CENTAVOS_POR_CREDITO = 66_313n;

/** O custo em crédito, com as 18 casas do IbitiPass, de um preço de resgate em centavos. */
export const custoEmCredito = (precoCentavos: number) => (BigInt(precoCentavos) * 10n ** 18n) / CENTAVOS_POR_CREDITO;

export const AVISO_DO_RESGATE =
  "A data e o agendamento são combinados diretamente com o Ibiti. Hospedagem exige estada mínima de 2 diárias: uma pode ser resgatada com crédito e a outra paga à parte.";
