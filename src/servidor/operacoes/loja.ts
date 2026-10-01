import {
  encodeFunctionData,
  isAddressEqual,
  isHash,
  parseEventLogs,
  type Address,
  type Hash,
  type TransactionReceipt,
} from "viem";
import { CATEGORIAS } from "@/catalogo/categorias";
import { custoEmCredito } from "@/catalogo/resgate";
import type { Dependencias } from "@/servidor/adaptadores";
import { comoNumeric } from "@/servidor/adaptadores/banco";
import type { Cadeia } from "@/servidor/adaptadores/cadeia";
import type { Chamada } from "@/servidor/adaptadores/conta-inteligente";
import type { Database } from "@/servidor/adaptadores/tipos-do-banco";
import { exigirPapel } from "@/servidor/autorizacao";
import { ehUuid, type Resultado } from "@/servidor/resultado";
import { ehOperacaoDaCarteira, esperarRecibo } from "@/servidor/transacoes";
import { lerCarteiraHabilitada } from "./carteira";

export type StatusDoResgate = Database["public"]["Enums"]["status_resgate"];

const NAO_HABILITADA = { erro: "Sua carteira não está habilitada para resgatar." };
const FORA_DO_CATALOGO = { erro: "Este benefício não está no catálogo vigente." };
const NAO_RESGATOU = "O resgate não aconteceu: o contrato não registrou o consumo.";
const DE_OUTRA_CARTEIRA = "Esta transação não é da sua carteira.";
const CONSUMO_DIVERGENTE =
  "O crédito foi consumido com um item ou custo que não confere com o catálogo, e o voucher não vale. Fale com o Ibiti.";

const ordemDaCategoria = (categoria: string) => CATEGORIAS.indexOf(categoria as (typeof CATEGORIAS)[number]);

/** Os benefícios ativos da versão vigente, com o preço dela. `null` antes da primeira versão. */
async function catalogoVigente({ banco }: Pick<Dependencias, "banco">) {
  const { data: vigente, error } = await banco
    .from("catalogo_versoes")
    .select("versao")
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`falha ao ler a versão vigente do catálogo: ${error.message}`);
  if (!vigente) return null;

  const { data, error: erroDosPrecos } = await banco
    .from("precos_beneficio")
    .select("preco_centavos, beneficios!inner(id, item, nome, descricao, categoria, imagem_url)")
    .eq("versao", vigente.versao)
    .eq("beneficios.ativo", true);
  if (erroDosPrecos) throw new Error(`falha ao ler os preços da versão ${vigente.versao}: ${erroDosPrecos.message}`);

  const itens = data
    .map(({ preco_centavos, beneficios: beneficio }) => ({
      id: beneficio.id,
      item: beneficio.item as Hash,
      nome: beneficio.nome,
      descricao: beneficio.descricao,
      categoria: beneficio.categoria,
      imagemUrl: beneficio.imagem_url,
      precoCentavos: preco_centavos,
      custo: custoEmCredito(preco_centavos),
    }))
    .sort((a, b) => ordemDaCategoria(a.categoria) - ordemDaCategoria(b.categoria) || a.nome.localeCompare(b.nome, "pt-BR"));
  return { versao: vigente.versao, itens };
}

/**
 * O saldo de crédito IbitiPass do ciclo, quando ele expira e o catálogo
 * vigente, com o que cabe no saldo. `null` sem carteira habilitada.
 */
export async function consultarLoja(
  { banco, cadeia }: Pick<Dependencias, "banco" | "cadeia">,
  perfilId: string,
  { agora = new Date() }: { agora?: Date } = {},
) {
  await exigirPapel(banco, perfilId, "investidor");
  const carteira = await lerCarteiraHabilitada({ banco }, perfilId);
  if (!carteira) return null;

  const [saldo, fim, catalogo] = await Promise.all([
    cadeia.ibitiPass.read.balanceOf([carteira.carteira]),
    cadeia.ibitiPass.read.fimDoCiclo(),
    catalogoVigente({ banco }),
  ]);
  const fimDoCiclo = fim === 0n ? null : new Date(Number(fim) * 1000);

  return {
    carteira: carteira.carteira,
    passkey: carteira.passkey,
    saldo,
    fimDoCiclo,
    diasParaExpirar: fimDoCiclo && Math.ceil((fimDoCiclo.getTime() - agora.getTime()) / 86_400_000),
    versao: catalogo?.versao ?? null,
    beneficios: (catalogo?.itens ?? []).map((item) => ({ ...item, disponivel: item.custo <= saldo })),
  };
}

/** Confere o crédito e monta a chamada `IbitiPass.resgatar(custo, item)` que a Safe executa. */
export async function prepararResgate(
  { banco, cadeia }: Pick<Dependencias, "banco" | "cadeia">,
  perfilId: string,
  { beneficioId }: { beneficioId: string },
): Promise<Resultado<{ custo: bigint; precoCentavos: number; nome: string; chamadas: Chamada[] }>> {
  await exigirPapel(banco, perfilId, "investidor");
  const carteira = await lerCarteiraHabilitada({ banco }, perfilId);
  if (!carteira) return NAO_HABILITADA;
  if (!ehUuid(beneficioId)) return FORA_DO_CATALOGO;

  const beneficio = (await catalogoVigente({ banco }))?.itens.find(({ id }) => id === beneficioId);
  if (!beneficio) return FORA_DO_CATALOGO;
  const saldo = await cadeia.ibitiPass.read.balanceOf([carteira.carteira]);
  if (beneficio.custo > saldo) return { erro: "Seu crédito não cobre este benefício." };

  return {
    custo: beneficio.custo,
    precoCentavos: beneficio.precoCentavos,
    nome: beneficio.nome,
    chamadas: [
      {
        to: cadeia.ibitiPass.address,
        data: encodeFunctionData({
          abi: cadeia.ibitiPass.abi,
          functionName: "resgatar",
          args: [beneficio.custo, beneficio.item],
        }),
      },
    ],
  };
}

type Recibo = Pick<TransactionReceipt, "status" | "from" | "logs" | "blockNumber">;

function consumoNoRecibo(cadeia: Cadeia, recibo: Recibo, carteira: Address) {
  if (recibo.status !== "success") return null;
  const [consumo] = parseEventLogs({
    abi: cadeia.ibitiPass.abi,
    eventName: "BeneficioResgatado",
    logs: recibo.logs.filter((log) => isAddressEqual(log.address, cadeia.ibitiPass.address)),
    args: { detentor: carteira },
  });
  return consumo?.args ?? null;
}

/**
 * `IbitiPass.resgatar` aceita qualquer custo e item: quem confere é a
 * plataforma. O voucher só vale se o item está naquela versão do catálogo e o
 * custo é o preço dela.
 */
async function conferirConsumo(
  { banco }: Pick<Dependencias, "banco">,
  { item, custo, versaoDoCatalogo }: { item: Hash; custo: bigint; versaoDoCatalogo: number },
) {
  const { data, error } = await banco
    .from("precos_beneficio")
    .select("preco_centavos, beneficios!inner(id)")
    .eq("versao", versaoDoCatalogo)
    .eq("beneficios.item", item)
    .maybeSingle();
  if (error) throw new Error(`falha ao conferir o item ${item} na versão ${versaoDoCatalogo}: ${error.message}`);
  if (!data || custoEmCredito(data.preco_centavos) !== custo) return null;
  return { beneficio_id: data.beneficios.id, versao: versaoDoCatalogo, custo: comoNumeric(custo) };
}

/**
 * A Safe já executou `resgatar`, e o navegador informa o hash e o benefício
 * escolhido. O consumo vem do evento do contrato, conferido contra o catálogo;
 * o benefício escolhido só classifica o resgate que falhou. A falha também é
 * gravada, para o Ibiti ver o erro.
 */
export async function registrarResgate(
  { banco, cadeia }: Pick<Dependencias, "banco" | "cadeia">,
  perfilId: string,
  { txHash, beneficioId }: { txHash: Hash; beneficioId: string },
): Promise<Resultado<{ resgateId: string; status: StatusDoResgate }>> {
  await exigirPapel(banco, perfilId, "investidor");
  const carteira = await lerCarteiraHabilitada({ banco }, perfilId);
  if (!carteira) return NAO_HABILITADA;
  if (!isHash(txHash) || !ehUuid(beneficioId)) return { erro: "Resgate inválido." };

  const { data: registrado, error: erroDaLeitura } = await banco
    .from("resgates")
    .select("id, perfil_id, status, erro")
    .eq("tx_hash", txHash)
    .maybeSingle();
  if (erroDaLeitura) throw new Error(`falha ao ler o resgate ${txHash}: ${erroDaLeitura.message}`);
  if (registrado) {
    if (registrado.perfil_id !== perfilId) return { erro: DE_OUTRA_CARTEIRA };
    return registrado.erro ? { erro: registrado.erro } : { resgateId: registrado.id, status: registrado.status };
  }

  const recibo = await esperarRecibo({ cadeia }, txHash);
  if ("erro" in recibo) return recibo;
  const consumo = consumoNoRecibo(cadeia, recibo, carteira.carteira);
  if (!consumo && !ehOperacaoDaCarteira(recibo, carteira.carteira)) return { erro: DE_OUTRA_CARTEIRA };
  const conferido = consumo && (await conferirConsumo({ banco }, consumo));
  const erro = !consumo ? NAO_RESGATOU : !conferido ? CONSUMO_DIVERGENTE : null;

  const vigente = await catalogoVigente({ banco });
  const escolhido = vigente?.itens.find(({ id }) => id === beneficioId);
  const doResgate =
    conferido ??
    (escolhido && vigente && { beneficio_id: escolhido.id, versao: vigente.versao, custo: comoNumeric(escolhido.custo) });
  if (!doResgate) return { erro: erro ?? FORA_DO_CATALOGO.erro };

  const { data, error } = await banco
    .from("resgates")
    .insert({
      ...doResgate,
      perfil_id: perfilId,
      carteira_id: carteira.carteiraId,
      tx_hash: txHash,
      status: erro ? "falhou" : "confirmado",
      erro,
    })
    .select("id, status")
    .single();
  // Outra chamada com o mesmo hash gravou primeiro: a releitura devolve o que ela gravou.
  if (error?.code === "23505") return registrarResgate({ banco, cadeia }, perfilId, { txHash, beneficioId });
  if (error) throw new Error(`falha ao registrar o resgate ${txHash}: ${error.message}`);

  const { error: erroDaTransacao } = await banco.from("transacoes").upsert(
    {
      perfil_id: perfilId,
      carteira_id: carteira.carteiraId,
      tipo: "resgate_beneficio",
      tx_hash: txHash,
      status: erro ? "revertida" : "confirmada",
      bloco: Number(recibo.blockNumber),
      erro,
      confirmada_em: erro ? null : new Date().toISOString(),
    },
    { onConflict: "tx_hash", ignoreDuplicates: true },
  );
  if (erroDaTransacao) throw new Error(`falha ao registrar a transação ${txHash}: ${erroDaTransacao.message}`);

  return erro ? { erro } : { resgateId: data.id, status: data.status };
}

const COLUNAS_DO_RESGATE =
  "id, status, custo::text, tx_hash, erro, criado_em, entregue_em, beneficios(nome, descricao, categoria)";

const paraTela = (resgate: {
  id: string;
  status: StatusDoResgate;
  custo: string;
  tx_hash: string | null;
  erro: string | null;
  criado_em: string;
  entregue_em: string | null;
  beneficios: { nome: string; descricao: string | null; categoria: string };
}) => ({
  id: resgate.id,
  status: resgate.status,
  custo: BigInt(resgate.custo),
  txHash: resgate.tx_hash as Hash | null,
  erro: resgate.erro,
  criadoEm: resgate.criado_em,
  entregueEm: resgate.entregue_em,
  beneficio: resgate.beneficios,
});

export async function listarMeusResgates({ banco }: Pick<Dependencias, "banco">, perfilId: string) {
  await exigirPapel(banco, perfilId, "investidor");
  const { data, error } = await banco
    .from("resgates")
    .select(COLUNAS_DO_RESGATE)
    .eq("perfil_id", perfilId)
    .order("criado_em", { ascending: false });
  if (error) throw new Error(`falha ao listar os resgates: ${error.message}`);
  return data.map(paraTela);
}

/** O voucher de um resgate do próprio investidor. O código do QR é só o id do resgate. */
export async function consultarResgate({ banco }: Pick<Dependencias, "banco">, perfilId: string, resgateId: string) {
  await exigirPapel(banco, perfilId, "investidor");
  if (!ehUuid(resgateId)) return null;
  const { data, error } = await banco
    .from("resgates")
    .select(COLUNAS_DO_RESGATE)
    .eq("id", resgateId)
    .eq("perfil_id", perfilId)
    .maybeSingle();
  if (error) throw new Error(`falha ao ler o resgate ${resgateId}: ${error.message}`);
  return data && { ...paraTela(data), codigo: data.id };
}
