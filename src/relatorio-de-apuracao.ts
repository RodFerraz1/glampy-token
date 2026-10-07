import { keccak256 } from "viem";

export const BUCKET_DOS_RELATORIOS = "relatorios-de-apuracao";

export const TAMANHO_MAXIMO_DO_RELATORIO = 4 * 1024 * 1024;

/**
 * O hash que vai para `depositarApuracao`: o keccak256 dos bytes do arquivo.
 * O mesmo cálculo roda no servidor ao registrar e no navegador de quem confere.
 */
export const hashDoRelatorio = (conteudo: Uint8Array) => keccak256(conteudo);

export const ehPdf = (conteudo: Uint8Array) =>
  new TextDecoder().decode(conteudo.subarray(0, 5)) === "%PDF-";
