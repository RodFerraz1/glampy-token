import { obterDependencias, urlDaPimlico } from "@/servidor/dependencias";
import { autorizarRequisicaoAoPimlico, type RequisicaoJsonRpc } from "@/servidor/operacoes/pimlico";
import { usuarioAtual } from "@/servidor/sessao";

/**
 * Bundler e paymaster da Pimlico para o navegador do investidor. A API key
 * fica aqui, e cada requisição passa pelo filtro antes de seguir.
 */
export async function POST(requisicao: Request) {
  const usuario = await usuarioAtual();
  if (usuario?.papel !== "investidor") return Response.json({ erro: "Entre como investidor." }, { status: 401 });

  const corpo = await requisicao.json().catch(() => null);
  if (!ehRequisicaoJsonRpc(corpo)) return Response.json({ erro: "Envie uma requisição JSON-RPC por vez." }, { status: 400 });
  const { jsonrpc, id, method, params } = corpo;

  const autorizacao = await autorizarRequisicaoAoPimlico(obterDependencias(), usuario.id, corpo);
  if ("erro" in autorizacao) return Response.json({ jsonrpc, id, error: { code: -32000, message: autorizacao.erro } });

  const resposta = await fetch(urlDaPimlico(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc, id, method, params }),
  });
  return new Response(resposta.body, { status: resposta.status, headers: { "content-type": "application/json" } });
}

function ehRequisicaoJsonRpc(corpo: unknown): corpo is RequisicaoJsonRpc {
  if (typeof corpo !== "object" || corpo === null || Array.isArray(corpo)) return false;
  const { jsonrpc, id, method, params } = corpo as Record<string, unknown>;
  return (
    jsonrpc === "2.0" &&
    (typeof id === "number" || typeof id === "string") &&
    typeof method === "string" &&
    (params === undefined || Array.isArray(params))
  );
}
