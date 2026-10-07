const digitoVerificador = (digitos: number[]) => {
  const soma = digitos.reduce((total, digito, i) => total + digito * (digitos.length + 1 - i), 0);
  const resto = (soma * 10) % 11;
  return resto === 10 ? 0 : resto;
};

/** CPF válido e aleatório, porque o banco local guarda os cadastros de execuções anteriores. */
export function cpfNovo() {
  const digitos = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  digitos.push(digitoVerificador(digitos));
  digitos.push(digitoVerificador(digitos));
  return digitos.join("");
}
