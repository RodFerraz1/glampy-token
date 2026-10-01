import { keccak256, parseEventLogs, toBytes, toHex, zeroHash, type Hash } from "viem";
import { ehCategoria, precoDeResgate, type Categoria } from "@/catalogo/categorias";
import { CONTEUDO_DA_VERSAO_1 } from "@/catalogo/versao-1";
import { lerReais } from "@/formatacao";
import type { Dependencias } from "@/servidor/adaptadores";
import { registrarAuditoria } from "@/servidor/auditoria";
import { exigirPapel } from "@/servidor/autorizacao";
import { ehUuid, type Resultado } from "@/servidor/resultado";
import { mensagemDeErro } from "@/servidor/transacoes";

const NAO_ENCONTRADO = { erro: "Benefício não encontrado." };

export interface DadosDoBeneficio {
  nome: string;
  descricao: string;
  categoria: string;
  /** Vazio quando o benefício não tem imagem. */
  imagemUrl: string;
  precoTabelaCentavos: number;
  ativo: boolean;
}

// Tipo, e não interface, para caber em `Json` na auditoria.
type LinhaDoBeneficio = {
  nome: string;
  descricao: string | null;
  categoria: Categoria;
  imagem_url: string | null;
  preco_tabela_centavos: number;
  ativo: boolean;
};

function validar(dados: DadosDoBeneficio): Resultado<LinhaDoBeneficio> {
  const nome = dados.nome.trim();
  const imagemUrl = dados.imagemUrl.trim();
  if (!nome) return { erro: "Informe o nome do benefício." };
  if (!ehCategoria(dados.categoria)) return { erro: "Escolha uma categoria da lista." };
  if (!Number.isSafeInteger(dados.precoTabelaCentavos) || dados.precoTabelaCentavos <= 0) {
    return { erro: "Informe o preço de tabela." };
  }
  if (imagemUrl && !/^https?:$/.test(URL.parse(imagemUrl)?.protocol ?? "")) {
    return { erro: "A imagem precisa ser um link http ou https." };
  }
  return {
    nome,
    descricao: dados.descricao.trim() || null,
    categoria: dados.categoria,
    imagem_url: imagemUrl || null,
    preco_tabela_centavos: dados.precoTabelaCentavos,
    ativo: dados.ativo,
  };
}

export async function listarBeneficios({ banco }: Pick<Dependencias, "banco">, ator: string) {
  await exigirPapel(banco, ator, "administrador");
  const { data, error } = await banco.from("beneficios").select().order("categoria").order("nome");
  if (error) throw new Error(`falha ao listar os benefícios: ${error.message}`);
  return data.map((beneficio) => ({
    id: beneficio.id,
    item: beneficio.item as Hash,
    nome: beneficio.nome,
    descricao: beneficio.descricao,
    categoria: beneficio.categoria,
    imagemUrl: beneficio.imagem_url,
    precoTabelaCentavos: beneficio.preco_tabela_centavos,
    precoCentavos: beneficio.preco_centavos,
    ativo: beneficio.ativo,
  }));
}

export async function criarBeneficio(
  { banco }: Pick<Dependencias, "banco">,
  ator: string,
  dados: DadosDoBeneficio,
): Promise<Resultado<{ id: string }>> {
  await exigirPapel(banco, ator, "administrador");
  const beneficio = validar(dados);
  if ("erro" in beneficio) return beneficio;

  const linha = { ...beneficio, preco_centavos: precoDeResgate(beneficio.preco_tabela_centavos) };
  const { data, error } = await banco
    .from("beneficios")
    .insert({ ...linha, item: toHex(crypto.getRandomValues(new Uint8Array(32))) })
    .select("id")
    .single();
  if (error) throw new Error(`falha ao criar o benefício: ${error.message}`);
  await registrarAuditoria(banco, {
    ator,
    acao: "criar_beneficio",
    entidade: "beneficios",
    entidadeId: data.id,
    dados: linha,
  });

  return { id: data.id };
}

/**
 * O resgate só é recalculado quando o preço de tabela muda. Assim os preços
 * importados da versão 1, arredondados para reais na tabela original, não
 * mudam sozinhos na próxima publicação.
 */
export async function editarBeneficio(
  { banco }: Pick<Dependencias, "banco">,
  ator: string,
  id: string,
  dados: DadosDoBeneficio,
): Promise<Resultado<{ id: string }>> {
  await exigirPapel(banco, ator, "administrador");
  const beneficio = validar(dados);
  if ("erro" in beneficio) return beneficio;
  if (!ehUuid(id)) return NAO_ENCONTRADO;

  const { data: atual, error: erroDaLeitura } = await banco
    .from("beneficios")
    .select("preco_tabela_centavos, preco_centavos")
    .eq("id", id)
    .maybeSingle();
  if (erroDaLeitura) throw new Error(`falha ao ler o benefício ${id}: ${erroDaLeitura.message}`);
  if (!atual) return NAO_ENCONTRADO;

  const precoCentavos =
    atual.preco_tabela_centavos === beneficio.preco_tabela_centavos
      ? atual.preco_centavos
      : precoDeResgate(beneficio.preco_tabela_centavos);
  const { error } = await banco
    .from("beneficios")
    .update({ ...beneficio, preco_centavos: precoCentavos })
    .eq("id", id);
  if (error) throw new Error(`falha ao editar o benefício ${id}: ${error.message}`);
  await registrarAuditoria(banco, {
    ator,
    acao: "editar_beneficio",
    entidade: "beneficios",
    entidadeId: id,
    dados: { ...beneficio, preco_centavos: precoCentavos },
  });

  return { id };
}

/** Sem papel exigido: o catálogo é público, e a transparência lista as versões. */
export async function listarVersoes({ banco }: Pick<Dependencias, "banco">) {
  const { data, error } = await banco
    .from("catalogo_versoes")
    .select("versao, hash_tabela, tx_publicacao, publicada_em, precos_beneficio(count)")
    .order("versao", { ascending: false });
  if (error) throw new Error(`falha ao listar as versões do catálogo: ${error.message}`);
  return data.map((versao) => ({
    versao: versao.versao,
    hashTabela: versao.hash_tabela as Hash,
    txPublicacao: versao.tx_publicacao as Hash | null,
    publicadaEm: versao.publicada_em,
    beneficios: versao.precos_beneficio[0]?.count ?? 0,
  }));
}

async function versaoVigente({ banco }: Pick<Dependencias, "banco">) {
  const { data, error } = await banco
    .from("catalogo_versoes")
    .select("versao, hash_tabela")
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`falha ao ler a versão vigente do catálogo: ${error.message}`);
  return data;
}

async function gravarVersao(
  { banco }: Pick<Dependencias, "banco">,
  versao: { versao: number; hashTabela: Hash; conteudo: string; txHash: Hash; publicadaEm: Date },
  precos: { beneficio_id: string; preco_centavos: number }[],
) {
  const { error } = await banco.rpc("gravar_versao_do_catalogo", {
    p_versao: versao.versao,
    p_hash_tabela: versao.hashTabela,
    p_conteudo: versao.conteudo,
    p_tx_publicacao: versao.txHash,
    p_publicada_em: versao.publicadaEm.toISOString(),
    p_precos: precos,
  });
  if (error) throw new Error(`falha ao gravar a versão ${versao.versao} do catálogo: ${error.message}`);
}

/**
 * Serializa os benefícios ativos em JSON, ordenados pelo item e com as chaves
 * sempre na mesma ordem: a mesma tabela dá sempre o mesmo texto, e o mesmo hash.
 */
function serializar(
  beneficios: {
    item: string;
    nome: string;
    descricao: string | null;
    categoria: string;
    imagem_url: string | null;
    preco_centavos: number;
  }[],
) {
  const itens = [...beneficios]
    .sort((a, b) => (a.item < b.item ? -1 : 1))
    .map(({ item, nome, descricao, categoria, imagem_url, preco_centavos }) => ({
      item,
      nome,
      descricao,
      categoria,
      imagem: imagem_url,
      precoResgateCentavos: preco_centavos,
    }));
  return JSON.stringify(itens, null, 2);
}

/**
 * Publica os benefícios ativos como nova versão: grava o keccak256 da tabela
 * serializada em `IbitiPass.publicarCatalogo`, com a conta agente, e a versão
 * que o contrato atribuiu, com os preços, no banco.
 */
export async function publicarCatalogo(
  { banco, cadeia }: Pick<Dependencias, "banco" | "cadeia">,
  ator: string,
): Promise<Resultado<{ versao: number; hashTabela: Hash; txHash: Hash }>> {
  await exigirPapel(banco, ator, "administrador");

  const { data: ativos, error } = await banco
    .from("beneficios")
    .select("id, item, nome, descricao, categoria, imagem_url, preco_centavos")
    .eq("ativo", true);
  if (error) throw new Error(`falha ao ler os benefícios ativos: ${error.message}`);
  if (ativos.length === 0) return { erro: "Não há benefício ativo para publicar." };

  const conteudo = serializar(ativos);
  const hashTabela = keccak256(toBytes(conteudo));
  const [vigente, versaoNoContrato] = await Promise.all([
    versaoVigente({ banco }),
    cadeia.ibitiPass.read.versaoDoCatalogo(),
  ]);
  if ((vigente?.versao ?? 0) !== versaoNoContrato) {
    return {
      erro: `O contrato está na versão ${versaoNoContrato} do catálogo e o banco, na ${vigente?.versao ?? 0}. Resolva a divergência antes de publicar.`,
    };
  }
  if (vigente?.hash_tabela === hashTabela) return { erro: `Nada mudou desde a versão ${vigente.versao}.` };

  let publicacao: { txHash: Hash; versao: number; quando: bigint };
  try {
    const txHash = await cadeia.ibitiPass.write.publicarCatalogo([hashTabela]);
    const recibo = await cadeia.leitor.waitForTransactionReceipt({ hash: txHash });
    if (recibo.status !== "success") throw new Error(`a transação ${txHash} reverteu`);
    const [{ args }] = parseEventLogs({ abi: cadeia.ibitiPass.abi, eventName: "CatalogoPublicado", logs: recibo.logs });
    publicacao = { txHash, versao: args.versao, quando: args.quando };
  } catch (erro) {
    const mensagem = `A publicação on-chain falhou: ${mensagemDeErro(erro)}`;
    await registrarAuditoria(banco, { ator, acao: "publicar_catalogo", entidade: "catalogo_versoes", dados: { erro: mensagem } });
    return { erro: mensagem };
  }
  const { txHash, versao } = publicacao;

  // Auditada antes de gravar: se a gravação falhar, fica o rastro da versão que já está on-chain.
  await registrarAuditoria(banco, {
    ator,
    acao: "publicar_catalogo",
    entidade: "catalogo_versoes",
    entidadeId: String(versao),
    dados: { hashTabela, txHash },
  });
  await gravarVersao(
    { banco },
    { versao, hashTabela, conteudo, txHash, publicadaEm: new Date(Number(publicacao.quando) * 1000) },
    ativos.map(({ id, preco_centavos }) => ({ beneficio_id: id, preco_centavos })),
  );

  return { versao, hashTabela, txHash };
}

/**
 * Os itens da tabela em markdown da versão 1: a seção "Catálogo completo", com
 * uma categoria por `###`, um grupo por linha em negrito e uma linha por item.
 */
function itensDaVersao1() {
  const itens = [];
  let naTabela = false;
  let categoria = "";
  let grupo = "";
  for (const linha of CONTEUDO_DA_VERSAO_1.split(/\r?\n/)) {
    if (linha.startsWith("## ")) naTabela = linha === "## Catálogo completo";
    else if (!naTabela) continue;
    else if (linha.startsWith("### ")) categoria = linha.slice(4).trim();
    else if (/^\*\*[^*]+\*\*$/.test(linha)) grupo = linha.slice(2, -2);
    else if (linha.startsWith("| ") && !linha.startsWith("| Item")) {
      const [nome, base, , , tabela, resgate] = linha.split("|").slice(1, -1).map((celula) => celula.trim());
      itens.push({
        item: keccak256(toBytes(`${categoria}/${grupo}/${nome}/${base}`)),
        nome,
        descricao: `${grupo}, ${base}`,
        categoria,
        preco_tabela_centavos: lerReais(tabela)!,
        preco_centavos: lerReais(resgate)!,
      });
    }
  }
  return itens;
}

/**
 * Traz para o banco a versão 1 que a Sprint 04 publicou na Sepolia: o arquivo
 * do catálogo, cujo keccak256 tem de ser o hash on-chain, e os itens dele.
 */
export async function importarVersaoInicial(
  { banco, cadeia }: Pick<Dependencias, "banco" | "cadeia">,
  ator: string,
): Promise<Resultado<{ versao: 1; beneficios: number }>> {
  await exigirPapel(banco, ator, "administrador");
  if (await versaoVigente({ banco })) return { erro: "O catálogo já tem versões importadas ou publicadas." };

  const hashTabela = keccak256(toBytes(CONTEUDO_DA_VERSAO_1));
  const noContrato = await cadeia.ibitiPass.read.catalogoDaVersao([1]);
  if (noContrato === zeroHash) return { erro: "A versão 1 do catálogo não está publicada no contrato." };
  if (noContrato !== hashTabela) {
    return { erro: `O hash da versão 1 no contrato (${noContrato}) não confere com o da tabela (${hashTabela}).` };
  }
  const [publicacao] = await cadeia.emJanelas((janela) =>
    cadeia.ibitiPass.getEvents.CatalogoPublicado({ versao: 1 }, janela),
  );
  if (!publicacao) throw new Error("a versão 1 está no contrato, mas o evento CatalogoPublicado não foi encontrado");

  const itens = itensDaVersao1();
  const { data: beneficios, error } = await banco
    .from("beneficios")
    .upsert(itens, { onConflict: "item" })
    .select("id, preco_centavos");
  if (error) throw new Error(`falha ao importar os benefícios da versão 1: ${error.message}`);

  await gravarVersao(
    { banco },
    {
      versao: 1,
      hashTabela,
      conteudo: CONTEUDO_DA_VERSAO_1,
      txHash: publicacao.transactionHash,
      publicadaEm: new Date(Number(publicacao.args.quando) * 1000),
    },
    beneficios.map(({ id, preco_centavos }) => ({ beneficio_id: id, preco_centavos })),
  );
  await registrarAuditoria(banco, {
    ator,
    acao: "importar_catalogo",
    entidade: "catalogo_versoes",
    entidadeId: "1",
    dados: { hashTabela, txHash: publicacao.transactionHash, beneficios: itens.length },
  });

  return { versao: 1, beneficios: itens.length };
}
