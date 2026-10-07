import { PDFDocument, rgb, StandardFonts, type PDFFont } from "pdf-lib";
import { formatarPeriodo } from "@/calendario-da-oferta";
import { formatarDataHora, formatarReais } from "@/formatacao";
import type { Informe } from "@/servidor/operacoes/informe";

const TINTA = rgb(0.13, 0.16, 0.14);
const CINZA = rgb(0.42, 0.45, 0.43);
const AVISO = rgb(0.6, 0.33, 0.05);
const MARGEM = 56;

// As fontes padrão do PDF só codificam WinAnsi: o espaço não separável do Intl vira espaço comum.
const texto = (valor: string) => valor.replace(/\u00a0|\u202f/g, " ");

export async function gerarPdfDoInforme(informe: Informe) {
  const documento = await PDFDocument.create();
  documento.setTitle(`Informe de rendimentos ${informe.ano} (demonstração)`);
  const pagina = documento.addPage([595.28, 841.89]);
  const normal = await documento.embedFont(StandardFonts.Helvetica);
  const negrito = await documento.embedFont(StandardFonts.HelveticaBold);
  let y = pagina.getHeight() - MARGEM;

  const escrever = (
    valor: string,
    { fonte = normal, tamanho = 11, cor = TINTA, x = MARGEM, direita = false }: {
      fonte?: PDFFont;
      tamanho?: number;
      cor?: ReturnType<typeof rgb>;
      x?: number;
      direita?: boolean;
    } = {},
  ) => {
    const conteudo = texto(valor);
    const largura = fonte.widthOfTextAtSize(conteudo, tamanho);
    pagina.drawText(conteudo, { x: direita ? x - largura : x, y, size: tamanho, font: fonte, color: cor });
  };
  const linha = () =>
    pagina.drawLine({
      start: { x: MARGEM, y: y + 6 },
      end: { x: pagina.getWidth() - MARGEM, y: y + 6 },
      thickness: 0.5,
      color: CINZA,
    });
  const direita = pagina.getWidth() - MARGEM;

  escrever("DEMONSTRAÇÃO - SEM VALIDADE FISCAL", { fonte: negrito, tamanho: 10, cor: AVISO });
  y -= 28;
  escrever(`Informe de rendimentos ${informe.ano}`, { fonte: negrito, tamanho: 20 });
  y -= 20;
  escrever("Royalty do token Glampy, Ibiti Glamping", { cor: CINZA });
  y -= 36;

  escrever("Titular", { fonte: negrito, tamanho: 10, cor: CINZA });
  y -= 16;
  escrever(informe.titular.nome, { fonte: negrito });
  y -= 16;
  escrever(`CPF ${informe.titular.cpf}`);
  y -= 16;
  escrever(`Posição usada no cálculo: ${informe.posicao} ${informe.posicao === 1n ? "token" : "tokens"}`);
  y -= 36;

  escrever("Mês", { fonte: negrito, tamanho: 10, cor: CINZA });
  escrever("Valor por token", { fonte: negrito, tamanho: 10, cor: CINZA, x: 330, direita: true });
  escrever("Recebido", { fonte: negrito, tamanho: 10, cor: CINZA, x: direita, direita: true });
  y -= 8;
  linha();
  y -= 16;
  for (const mes of informe.meses) {
    const periodo = formatarPeriodo(mes.periodo);
    escrever(periodo.charAt(0).toUpperCase() + periodo.slice(1));
    escrever(formatarReais(mes.valorPorTokenCentavos), { x: 330, direita: true });
    escrever(formatarReais(mes.recebidoCentavos), { x: direita, direita: true });
    y -= 18;
  }
  linha();
  y -= 12;
  escrever(`Total em ${informe.ano}`, { fonte: negrito });
  escrever(formatarReais(informe.totalCentavos), { fonte: negrito, x: direita, direita: true });
  y -= 44;

  for (const paragrafo of [
    "Documento de demonstração, gerado a partir de apurações simuladas: nenhum valor foi pago.",
    "Não tem validade fiscal e não deve ser usado na declaração de imposto de renda.",
    "O cálculo usa a posição atual do titular, e não a posição no fechamento de cada mês.",
  ]) {
    escrever(paragrafo, { tamanho: 9, cor: CINZA });
    y -= 13;
  }
  y -= 8;
  escrever(`Gerado em ${formatarDataHora(new Date())}`, { tamanho: 9, cor: CINZA });

  return documento.save();
}
