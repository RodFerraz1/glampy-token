import { encodeFunctionData, getAddress, isAddress, isAddressEqual, keccak256, parseEventLogs, toBytes, type Hash, type Hex } from "viem";
import type { Passkey } from "@/carteira/safe";
import { formatarDataHora } from "@/formatacao";
import type { Dependencias } from "@/servidor/adaptadores";
import type { Chamada } from "@/servidor/adaptadores/conta-inteligente";
import type { Database } from "@/servidor/adaptadores/tipos-do-banco";
import { registrarAuditoria } from "@/servidor/auditoria";
import { exigirPapel } from "@/servidor/autorizacao";
import { decidirPelaGovernanca, type Decisao } from "@/servidor/decisao-de-governanca";
import { ehUuid, type Resultado } from "@/servidor/resultado";
import { mensagemDeErro } from "@/servidor/transacoes";
import { lerCarteiraHabilitada, passkeyValida } from "./carteira";

export type MotivoDaReatribuicao = Database["public"]["Enums"]["motivo_reatribuicao"];
export type StatusDaReatribuicao = Database["public"]["Enums"]["status_reatribuicao"];

type Pedido =
  | { motivo: "perda_de_acesso"; passkey: Passkey; justificativa: string }
  | { motivo: "sucessao"; carteiraDeOrigem: string; justificativa: string };

const NAO_ENCONTRADO = { erro: "Pedido de reatribuição não encontrado." };
// Uma mensagem só para carteira desconhecida e sem posição: o pedido não revela quem é da plataforma.
const SEM_POSICAO = { erro: "Não há posição na plataforma para reatribuir a partir desta carteira." };
const ENCERRADOS: StatusDaReatribuicao[] = ["executada", "cancelada", "recusada"];

/** A carteira embutida de um investidor da plataforma, com o titular e o perfil dela. */
async function carteiraDaPlataforma({ banco }: Pick<Dependencias, "banco">, endereco: string) {
  if (!isAddress(endereco.trim())) return null;
  const { data, error } = await banco
    .from("carteiras")
    .select("endereco, status, perfil_id, perfis!inner(titulares!titulares_perfil_id_fkey(id, identificador))")
    .eq("endereco", endereco.trim().toLowerCase())
    .eq("tipo", "embutida")
    .maybeSingle();
  if (error) throw new Error(`falha ao ler a carteira ${endereco}: ${error.message}`);
  const titular = data?.perfis.titulares;
  return data && titular
    ? {
        endereco: getAddress(data.endereco),
        status: data.status,
        perfilId: data.perfil_id,
        titularId: titular.id,
        identificador: titular.identificador as Hex,
      }
    : null;
}

/**
 * Perda de acesso: o investidor, que ainda entra com a senha, cria uma passkey
 * nova, e a posição vai para a Safe dela, do mesmo titular. Sucessão: o
 * herdeiro, com conta e carteira habilitada, pede a posição do titular para a
 * própria carteira. A quantidade é a posição on-chain na abertura; o Ibiti
 * relê ao anunciar.
 */
export async function abrirPedido(
  { banco, cadeia, contaInteligente }: Pick<Dependencias, "banco" | "cadeia" | "contaInteligente">,
  perfilId: string,
  pedido: Pedido,
): Promise<Resultado<{ id: string }>> {
  await exigirPapel(banco, perfilId, "investidor");
  const justificativa = pedido.justificativa.trim();
  if (!justificativa) return { erro: "Explique o pedido na justificativa." };
  const propria = await lerCarteiraHabilitada({ banco }, perfilId);
  if (!propria) return { erro: "Sua carteira precisa estar habilitada para abrir um pedido." };

  let origem, destino;
  if (pedido.motivo === "perda_de_acesso") {
    if (!passkeyValida(pedido.passkey)) return { erro: "A passkey criada pelo aparelho não é válida. Tente de novo." };
    origem = propria.carteira;
    destino = await contaInteligente.enderecoDaCarteira(pedido.passkey);
    if (isAddressEqual(origem, destino)) return { erro: "A passkey nova tem de ser diferente da atual." };
  } else {
    const deOrigem = await carteiraDaPlataforma({ banco }, pedido.carteiraDeOrigem);
    if (!deOrigem) return SEM_POSICAO;
    if (isAddressEqual(deOrigem.endereco, propria.carteira)) return { erro: "Informe a carteira do titular, não a sua." };
    origem = deOrigem.endereco;
    destino = propria.carteira;
  }
  const quantidade = await cadeia.token.read.balanceOf([origem]);
  if (quantidade === 0n) return SEM_POSICAO;
  const titular = await carteiraDaPlataforma({ banco }, origem);
  if (!titular) return SEM_POSICAO;

  const { data, error } = await banco
    .from("reatribuicoes")
    .insert({
      titular_id: titular.titularId,
      carteira_origem: origem.toLowerCase(),
      carteira_destino: destino.toLowerCase(),
      quantidade: Number(quantidade),
      motivo: pedido.motivo,
      justificativa,
      aberto_por: perfilId,
      ...(pedido.motivo === "perda_de_acesso"
        ? { passkey_id: pedido.passkey.id, passkey_chave_publica: pedido.passkey.chavePublica }
        : {}),
    })
    .select("id")
    .single();
  if (error) throw new Error(`falha ao abrir o pedido de reatribuição: ${error.message}`);
  await registrarAuditoria(banco, {
    ator: perfilId,
    acao: "abrir_reatribuicao",
    entidade: "reatribuicoes",
    entidadeId: data.id,
    dados: { motivo: pedido.motivo, quantidade: Number(quantidade) },
  });
  return { id: data.id };
}

const COLUNAS =
  "id, motivo, status, justificativa, parecer, quantidade, carteira_origem, carteira_destino, criado_em, analisado_em, executavel_apos, tx_anuncio, tx_execucao, titulares(perfil_id, nome_completo), aberto_por";

type Linha = {
  id: string;
  motivo: MotivoDaReatribuicao;
  status: StatusDaReatribuicao;
  justificativa: string;
  parecer: string | null;
  quantidade: number;
  carteira_origem: string;
  carteira_destino: string;
  criado_em: string;
  analisado_em: string | null;
  executavel_apos: string | null;
  tx_anuncio: string | null;
  tx_execucao: string | null;
  titulares: { perfil_id: string; nome_completo: string };
  aberto_por: string | null;
};

const paraTela = (linha: Linha, { comNomeDoTitular }: { comNomeDoTitular: boolean }) => ({
  id: linha.id,
  motivo: linha.motivo,
  status: linha.status,
  justificativa: linha.justificativa,
  parecer: linha.parecer,
  quantidade: linha.quantidade,
  titular: comNomeDoTitular ? linha.titulares.nome_completo : null,
  carteiraDeOrigem: getAddress(linha.carteira_origem),
  carteiraDeDestino: getAddress(linha.carteira_destino),
  abertoEm: linha.criado_em,
  analisadoEm: linha.analisado_em,
  executavelApos: linha.executavel_apos ? new Date(linha.executavel_apos) : null,
  txAnuncio: linha.tx_anuncio as Hash | null,
  txExecucao: linha.tx_execucao as Hash | null,
});

export type PedidoDeReatribuicao = ReturnType<typeof paraTela>;

/**
 * Os pedidos que o investidor abriu e os que pedem a posição dele. O nome do
 * titular só aparece para o próprio titular: quem pede a sucessão de outro
 * não descobre por aqui a quem pertence a carteira.
 */
export async function listarMeusPedidos({ banco }: Pick<Dependencias, "banco">, perfilId: string) {
  await exigirPapel(banco, perfilId, "investidor");
  if (!ehUuid(perfilId)) return [];
  const { data: titular } = await banco.from("titulares").select("id").eq("perfil_id", perfilId).maybeSingle();
  const { data, error } = await banco
    .from("reatribuicoes")
    .select(COLUNAS)
    .or(titular && ehUuid(titular.id) ? `aberto_por.eq.${perfilId},titular_id.eq.${titular.id}` : `aberto_por.eq.${perfilId}`)
    .order("criado_em", { ascending: false });
  if (error) throw new Error(`falha ao listar os pedidos de reatribuição: ${error.message}`);
  return data.map((linha) => paraTela(linha, { comNomeDoTitular: linha.titulares.perfil_id === perfilId }));
}

/** Para o Ibiti analisar: com o titular e quem abriu o pedido. */
export async function listarPedidos({ banco }: Pick<Dependencias, "banco">, ator: string) {
  await exigirPapel(banco, ator, "administrador");
  const { data, error } = await banco.from("reatribuicoes").select(COLUNAS).order("criado_em", { ascending: false });
  if (error) throw new Error(`falha ao listar os pedidos de reatribuição: ${error.message}`);
  const solicitantes = [...new Set(data.flatMap(({ aberto_por }) => (aberto_por ? [aberto_por] : [])))];
  const { data: nomes, error: erroDosNomes } = await banco
    .from("titulares")
    .select("perfil_id, nome_completo")
    .in("perfil_id", solicitantes);
  if (erroDosNomes) throw new Error(`falha ao ler quem abriu os pedidos: ${erroDosNomes.message}`);
  return data.map((linha) => ({
    ...paraTela(linha, { comNomeDoTitular: true }),
    abertoPor: nomes.find(({ perfil_id }) => perfil_id === linha.aberto_por)?.nome_completo ?? null,
  }));
}

async function lerPedido({ banco }: Pick<Dependencias, "banco">, id: string) {
  if (!ehUuid(id)) return null;
  const { data, error } = await banco.from("reatribuicoes").select().eq("id", id).maybeSingle();
  if (error) throw new Error(`falha ao ler o pedido de reatribuição ${id}: ${error.message}`);
  return data;
}

/**
 * Pôr em análise, recusar ou cancelar antes do anúncio. Recusar e cancelar
 * exigem parecer. Depois do anúncio, cancelar passa pela cadeia.
 */
export async function analisarPedido(
  { banco }: Pick<Dependencias, "banco">,
  ator: string,
  id: string,
  { status, parecer, agora = new Date() }: { status: "em_analise" | "recusada" | "cancelada"; parecer: string; agora?: Date },
): Promise<Resultado<{ status: StatusDaReatribuicao }>> {
  await exigirPapel(banco, ator, "administrador");
  const pedido = await lerPedido({ banco }, id);
  if (!pedido) return NAO_ENCONTRADO;
  if (ENCERRADOS.includes(pedido.status)) return { erro: "Este pedido já foi encerrado." };
  if (pedido.status === "anunciada") return { erro: "A reatribuição já foi anunciada on-chain: cancele pela cadeia." };
  if (status === "em_analise" && pedido.status !== "aberta") return { erro: "Só um pedido aberto vai para análise." };
  parecer = parecer.trim();
  if (status !== "em_analise" && !parecer) return { erro: "Informe o parecer da decisão." };

  const { data, error } = await banco
    .from("reatribuicoes")
    .update({ status, parecer: parecer || null, analisado_por: ator, analisado_em: agora.toISOString() })
    .eq("id", id)
    .eq("status", pedido.status)
    .select("status")
    .maybeSingle();
  if (error) throw new Error(`falha ao analisar o pedido ${id}: ${error.message}`);
  if (!data) return { erro: "O pedido mudou enquanto era analisado. Recarregue a página." };
  await registrarAuditoria(banco, {
    ator,
    acao: "analisar_reatribuicao",
    entidade: "reatribuicoes",
    entidadeId: id,
    dados: { status, parecer },
  });
  return { status: data.status };
}

/** Executar e cancelar recebem só o id on-chain da reatribuição. */
const chamadaPeloId = (
  cadeia: Dependencias["cadeia"],
  functionName: "executarReatribuicao" | "cancelarReatribuicao",
  idOnChain: number,
): Chamada => ({
  to: cadeia.token.address,
  data: encodeFunctionData({ abi: cadeia.token.abi, functionName, args: [BigInt(idOnChain)] }),
});

/** Grava o que a decisão on-chain mudou, só se o pedido ainda está no estado que a originou. */
async function gravarDecisao(
  { banco }: Pick<Dependencias, "banco">,
  id: string,
  de: StatusDaReatribuicao,
  colunas: Database["public"]["Tables"]["reatribuicoes"]["Update"],
) {
  const { data, error } = await banco.from("reatribuicoes").update(colunas).eq("id", id).eq("status", de).select("id");
  if (error) throw new Error(`falha ao registrar a decisão do pedido ${id}: ${error.message}`);
  if (data.length === 0) throw new Error(`o pedido ${id} saiu de ${de} enquanto a decisão ia on-chain`);
}

/**
 * Anuncia pela Safe de reatribuição, 3 de 5, e abre os 7 dias de espera
 * pública. Na perda de acesso, a conta agente habilita antes a Safe nova para
 * o mesmo titular, porque a execução só entrega a carteira habilitada. O
 * motivo on-chain é só o hash do id do pedido, nunca dado pessoal.
 */
export async function anunciarReatribuicao(
  { banco, cadeia, governanca }: Pick<Dependencias, "banco" | "cadeia" | "governanca">,
  ator: string,
  id: string,
): Promise<Resultado<Decisao & { executavelApos: Date }>> {
  await exigirPapel(banco, ator, "administrador");
  const pedido = await lerPedido({ banco }, id);
  if (!pedido) return NAO_ENCONTRADO;
  if (pedido.status !== "em_analise") return { erro: "Só um pedido em análise pode ser anunciado." };

  const de = getAddress(pedido.carteira_origem);
  const para = getAddress(pedido.carteira_destino);
  const quantidade = await cadeia.token.read.balanceOf([de]);
  if (quantidade === 0n) return { erro: "A carteira de origem não tem mais tokens." };

  if (pedido.motivo === "perda_de_acesso" && !(await cadeia.registro.read.habilitado([para]))) {
    const titular = await carteiraDaPlataforma({ banco }, de);
    if (!titular) return { erro: "A carteira de origem não é mais de um titular da plataforma." };
    try {
      const hash = await cadeia.registro.write.habilitar([para, titular.identificador]);
      const recibo = await cadeia.leitor.waitForTransactionReceipt({ hash });
      if (recibo.status !== "success") throw new Error(`a habilitação ${hash} reverteu`);
    } catch (erro) {
      return { erro: `Não foi possível habilitar a carteira nova: ${mensagemDeErro(erro)}` };
    }
  }

  const motivo = keccak256(toBytes(pedido.id));
  const decisao = await decidirPelaGovernanca(
    { banco, governanca },
    {
      ator,
      acao: "anunciar_reatribuicao",
      entidade: "reatribuicoes",
      entidadeId: id,
      safe: "reatribuicao",
      chamadas: [
        {
          to: cadeia.token.address,
          data: encodeFunctionData({
            abi: cadeia.token.abi,
            functionName: "anunciarReatribuicao",
            args: [de, para, quantidade, motivo],
          }),
        },
      ],
      dados: { quantidade: Number(quantidade) },
    },
  );
  if ("erro" in decisao) return decisao;

  const recibo = await cadeia.leitor.getTransactionReceipt({ hash: decisao.txHash });
  const [anuncio] = parseEventLogs({ abi: cadeia.token.abi, eventName: "ReatribuicaoAnunciada", logs: recibo.logs });
  if (!anuncio) throw new Error(`a transação ${decisao.txHash} não registrou o anúncio`);
  const executavelApos = new Date(Number(anuncio.args.executavelApos) * 1000);
  await gravarDecisao({ banco }, id, "em_analise", {
    status: "anunciada",
    quantidade: Number(quantidade),
    id_on_chain: Number(anuncio.args.id),
    motivo_on_chain: motivo,
    tx_anuncio: decisao.txHash,
    executavel_apos: executavelApos.toISOString(),
  });
  return { ...decisao, executavelApos };
}

/**
 * Passados os 7 dias pelo relógio da cadeia, move a posição pela Safe de
 * reatribuição. Na perda de acesso, a carteira do perfil passa a ser a Safe
 * nova, e a antiga, já sem saldo, sai do registro de habilitados.
 */
export async function executarReatribuicao(
  { banco, cadeia, governanca }: Pick<Dependencias, "banco" | "cadeia" | "governanca">,
  ator: string,
  id: string,
): Promise<Resultado<Decisao>> {
  await exigirPapel(banco, ator, "administrador");
  const pedido = await lerPedido({ banco }, id);
  if (!pedido) return NAO_ENCONTRADO;
  if (pedido.status !== "anunciada" || pedido.id_on_chain === null || !pedido.executavel_apos) {
    return { erro: "Só uma reatribuição anunciada pode ser executada." };
  }
  const executavelApos = new Date(pedido.executavel_apos);
  const { timestamp } = await cadeia.leitor.getBlock();
  if (Number(timestamp) * 1000 < executavelApos.getTime()) {
    return { erro: `A espera de 7 dias termina em ${formatarDataHora(executavelApos)}.` };
  }

  const decisao = await decidirPelaGovernanca(
    { banco, governanca },
    {
      ator,
      acao: "executar_reatribuicao",
      entidade: "reatribuicoes",
      entidadeId: id,
      safe: "reatribuicao",
      chamadas: [chamadaPeloId(cadeia, "executarReatribuicao", pedido.id_on_chain)],
    },
  );
  if ("erro" in decisao) return decisao;
  await gravarDecisao({ banco }, id, "anunciada", { status: "executada", tx_execucao: decisao.txHash });

  if (pedido.motivo === "perda_de_acesso" && pedido.passkey_id && pedido.passkey_chave_publica) {
    await trocarCarteiraDoTitular({ banco, cadeia }, ator, pedido);
  }
  return decisao;
}

/** A carteira do perfil passa a ser a Safe da passkey nova; a antiga sai do registro. */
async function trocarCarteiraDoTitular(
  { banco, cadeia }: Pick<Dependencias, "banco" | "cadeia">,
  ator: string,
  pedido: { id: string; carteira_origem: string; carteira_destino: string; passkey_id: string | null; passkey_chave_publica: string | null },
) {
  const { error } = await banco
    .from("carteiras")
    .update({
      endereco: pedido.carteira_destino,
      passkey_id: pedido.passkey_id,
      passkey_chave_publica: pedido.passkey_chave_publica,
      status: "habilitada",
      habilitada_em: new Date().toISOString(),
    })
    .eq("endereco", pedido.carteira_origem)
    .eq("tipo", "embutida");
  if (error) throw new Error(`falha ao trocar a carteira do pedido ${pedido.id}: ${error.message}`);

  // A troca já valeu; a desabilitação da carteira antiga, sem saldo, só limpa o registro.
  let desabilitacao: string;
  try {
    const hash = await cadeia.registro.write.desabilitar([getAddress(pedido.carteira_origem), keccak256(toBytes(pedido.id))]);
    const recibo = await cadeia.leitor.waitForTransactionReceipt({ hash });
    if (recibo.status !== "success") throw new Error(`a desabilitação ${hash} reverteu`);
    desabilitacao = hash;
  } catch (erro) {
    desabilitacao = `falhou: ${mensagemDeErro(erro)}`;
  }
  await registrarAuditoria(banco, {
    ator,
    acao: "trocar_carteira",
    entidade: "reatribuicoes",
    entidadeId: pedido.id,
    dados: { de: pedido.carteira_origem, para: pedido.carteira_destino, desabilitacao },
  });
}

/** Desiste de uma reatribuição já anunciada, pela Safe de reatribuição, com parecer. */
export async function cancelarAnunciada(
  { banco, cadeia, governanca }: Pick<Dependencias, "banco" | "cadeia" | "governanca">,
  ator: string,
  id: string,
  { parecer, agora = new Date() }: { parecer: string; agora?: Date },
): Promise<Resultado<Decisao>> {
  await exigirPapel(banco, ator, "administrador");
  const pedido = await lerPedido({ banco }, id);
  if (!pedido) return NAO_ENCONTRADO;
  if (pedido.status !== "anunciada" || pedido.id_on_chain === null) return { erro: "Só uma reatribuição anunciada é cancelada pela cadeia." };
  parecer = parecer.trim();
  if (!parecer) return { erro: "Informe o parecer da decisão." };

  const decisao = await decidirPelaGovernanca(
    { banco, governanca },
    {
      ator,
      acao: "cancelar_reatribuicao",
      entidade: "reatribuicoes",
      entidadeId: id,
      safe: "reatribuicao",
      chamadas: [chamadaPeloId(cadeia, "cancelarReatribuicao", pedido.id_on_chain)],
      dados: { parecer },
    },
  );
  if ("erro" in decisao) return decisao;
  await gravarDecisao({ banco }, id, "anunciada", {
    status: "cancelada",
    parecer,
    analisado_por: ator,
    analisado_em: agora.toISOString(),
  });
  return decisao;
}
