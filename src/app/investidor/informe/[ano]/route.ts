import { gerarPdfDoInforme } from "@/informe/pdf";
import { obterDependencias } from "@/servidor/dependencias";
import { montarInforme } from "@/servidor/operacoes/informe";
import { usuarioAtual } from "@/servidor/sessao";

export async function GET(_requisicao: Request, contexto: RouteContext<"/investidor/informe/[ano]">) {
  const usuario = await usuarioAtual();
  if (usuario?.papel !== "investidor") return new Response("Entre como investidor.", { status: 401 });
  const ano = Number((await contexto.params).ano);
  if (!Number.isSafeInteger(ano)) return new Response("Ano inválido.", { status: 400 });

  const informe = await montarInforme(obterDependencias(), usuario.id, ano);
  if ("erro" in informe) return new Response(informe.erro, { status: 404 });
  const pdf = await gerarPdfDoInforme(informe);
  return new Response(Buffer.from(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="informe-de-rendimentos-${ano}-demonstracao.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}
