import { getAddress, type Hex } from "viem";
import type { Dependencias } from "@/servidor/adaptadores";
import { exigirPapel } from "@/servidor/autorizacao";

export type OrigemDoEstoque = "oferta" | "recolocacao";

export interface Estoque {
  origem: OrigemDoEstoque;
  quantidade: bigint;
}

/**
 * Onde há token à venda agora: a Oferta, enquanto não passou de `FIM_DA_OFERTA`
 * e tem float; senão a Recolocação, se tem lote; senão nenhum.
 */
export async function estoqueAVenda(
  { cadeia }: Pick<Dependencias, "cadeia">,
  { agora = new Date() }: { agora?: Date } = {},
): Promise<Estoque | null> {
  const fimDaOferta = await cadeia.oferta.read.FIM_DA_OFERTA();
  if (BigInt(Math.floor(agora.getTime() / 1000)) <= fimDaOferta) {
    const float = await cadeia.oferta.read.floatDisponivel();
    if (float > 0n) return { origem: "oferta", quantidade: float };
  }
  const lote = await cadeia.recolocacao.read.loteDisponivel();
  return lote > 0n ? { origem: "recolocacao", quantidade: lote } : null;
}

/** Quanto o titular ainda pode ter até o teto por pessoa, somando todas as carteiras dele. */
export async function tetoDoTitular({ cadeia }: Pick<Dependencias, "cadeia">, identificador: Hex) {
  const [posicao, teto] = await Promise.all([
    cadeia.conformidade.read.posicaoDoTitular([identificador]),
    cadeia.conformidade.read.TETO_TOKENS(),
  ]);
  return { teto, restante: posicao >= teto ? 0n : teto - posicao };
}

/**
 * Só os ativos da plataforma na carteira embutida do investidor aprovado:
 * Glampy e crédito IbitiPass. O teto restante vem da posição do titular, que
 * soma todas as carteiras habilitadas para ele, e não do saldo desta carteira.
 * `null` enquanto o cadastro não foi aprovado.
 */
export async function consultarPosicao(
  { banco, cadeia }: Pick<Dependencias, "banco" | "cadeia">,
  perfilId: string,
  { agora = new Date() }: { agora?: Date } = {},
) {
  await exigirPapel(banco, perfilId, "investidor");

  const { data, error } = await banco
    .from("titulares")
    .select("identificador, status, perfis!titulares_perfil_id_fkey(carteiras(endereco, tipo))")
    .eq("perfil_id", perfilId)
    .maybeSingle();
  if (error) throw new Error(`falha ao ler o cadastro do perfil ${perfilId}: ${error.message}`);
  const embutida = data?.perfis.carteiras.find(({ tipo }) => tipo === "embutida");
  if (data?.status !== "aprovado" || !embutida) return null;

  const carteira = getAddress(embutida.endereco);
  const [glampy, ibitiPass, { teto, restante }, estoque] = await Promise.all([
    cadeia.token.read.balanceOf([carteira]),
    cadeia.ibitiPass.read.balanceOf([carteira]),
    tetoDoTitular({ cadeia }, data.identificador as Hex),
    estoqueAVenda({ cadeia }, { agora }),
  ]);

  return { carteira, glampy, ibitiPass, teto, tetoRestante: restante, estoque };
}
