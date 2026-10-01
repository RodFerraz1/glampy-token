import { getAddress, keccak256, toBytes, type Hex } from "viem";
import type { Dependencias } from "@/servidor/adaptadores";
import { registrarAuditoria } from "@/servidor/auditoria";
import { exigirPapel } from "@/servidor/autorizacao";
import { ehUuid, type Resultado } from "@/servidor/resultado";
import { enviarTransacao, mensagemDeErro } from "@/servidor/transacoes";
import { consultarCarteira } from "./carteira";

type Habilitacao = Resultado<{ txHash: Hex | null }>;

const NAO_ESTA_EM_ANALISE = { erro: "Este cadastro não está em análise." };

/** Todos os cadastros enviados, os mais antigos primeiro, para a fila não esquecer ninguém. */
export async function listarCadastros({ banco }: Pick<Dependencias, "banco">, ator: string) {
  await exigirPapel(banco, ator, "administrador");

  const { data, error } = await banco
    .from("titulares")
    .select("id, nome_completo, status, criado_em, perfis!titulares_perfil_id_fkey(carteiras(tipo, status, erro_habilitacao))")
    .neq("status", "pendente")
    .order("criado_em");
  if (error) throw new Error(`falha ao listar os cadastros: ${error.message}`);

  return data.map((titular) => {
    const carteira = titular.perfis.carteiras.find(({ tipo }) => tipo === "embutida");
    return {
      id: titular.id,
      nomeCompleto: titular.nome_completo,
      status: titular.status,
      enviadoEm: titular.criado_em,
      carteira: carteira?.status ?? null,
      habilitacaoFalhou: !!carteira?.erro_habilitacao,
    };
  });
}

export async function detalharCadastro({ banco }: Pick<Dependencias, "banco">, ator: string, titularId: string) {
  await exigirPapel(banco, ator, "administrador");
  if (!ehUuid(titularId)) return null;

  const titular = await lerTitular({ banco }, titularId);
  if (!titular) return null;
  const carteira = await lerCarteira({ banco }, titular.perfil_id);
  const habilitacao = await consultarCarteira({ banco }, titular.perfil_id);
  const { data: usuario, error } = await banco.auth.admin.getUserById(titular.perfil_id);
  if (error) throw new Error(`falha ao ler o e-mail do cadastro ${titularId}: ${error.message}`);

  return {
    id: titular.id,
    nomeCompleto: titular.nome_completo,
    email: usuario.user.email ?? "",
    cpf: titular.cpf,
    dataNascimento: titular.data_nascimento,
    telefone: titular.telefone,
    status: titular.status,
    motivoReprovacao: titular.motivo_reprovacao,
    enviadoEm: titular.criado_em,
    analisadoEm: titular.analisado_em,
    declaracao: {
      versao: titular.declaracao_profissional_versao,
      aceitaEm: titular.declaracao_profissional_aceita_em,
    },
    carteira: {
      endereco: getAddress(carteira.endereco),
      status: carteira.status,
      erroHabilitacao: carteira.erro_habilitacao,
      txHabilitacao: habilitacao?.txHabilitacao ?? null,
    },
  };
}

export async function aprovarCadastro(
  { banco, cadeia }: Pick<Dependencias, "banco" | "cadeia">,
  ator: string,
  titularId: string,
  { agora = new Date() }: { agora?: Date } = {},
): Promise<Habilitacao> {
  await exigirPapel(banco, ator, "administrador");

  const { data: titular, error } = await banco
    .from("titulares")
    .update({ status: "aprovado", analisado_por: ator, analisado_em: agora.toISOString() })
    .eq("id", titularId)
    .eq("status", "em_analise")
    .select("id, perfil_id, identificador")
    .maybeSingle();
  if (error) throw new Error(`falha ao aprovar o cadastro ${titularId}: ${error.message}`);
  if (!titular) return NAO_ESTA_EM_ANALISE;
  await registrarAuditoria(banco, { ator, acao: "aprovar_cadastro", entidade: "titulares", entidadeId: titularId });

  return habilitar({ banco, cadeia }, ator, titular, await lerCarteira({ banco }, titular.perfil_id));
}

/** Nova tentativa de habilitar a carteira de um cadastro aprovado cuja habilitação falhou. */
export async function habilitarCarteira(
  { banco, cadeia }: Pick<Dependencias, "banco" | "cadeia">,
  ator: string,
  titularId: string,
): Promise<Habilitacao> {
  await exigirPapel(banco, ator, "administrador");

  const titular = await lerTitular({ banco }, titularId);
  const carteira = titular && (await lerCarteira({ banco }, titular.perfil_id));
  if (titular?.status !== "aprovado" || carteira?.status !== "pendente") {
    return { erro: "Só um cadastro aprovado com a carteira pendente pode ser habilitado." };
  }

  return habilitar({ banco, cadeia }, ator, titular, carteira);
}

export async function reprovarCadastro(
  { banco }: Pick<Dependencias, "banco">,
  ator: string,
  titularId: string,
  { motivo, agora = new Date() }: { motivo: string; agora?: Date },
): Promise<Resultado<{ status: "reprovado" }>> {
  await exigirPapel(banco, ator, "administrador");
  motivo = motivo.trim();
  if (!motivo) return { erro: "Informe o motivo da reprovação." };

  const { data, error } = await banco
    .from("titulares")
    .update({ status: "reprovado", motivo_reprovacao: motivo, analisado_por: ator, analisado_em: agora.toISOString() })
    .eq("id", titularId)
    .eq("status", "em_analise")
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`falha ao reprovar o cadastro ${titularId}: ${error.message}`);
  if (!data) return NAO_ESTA_EM_ANALISE;
  await registrarAuditoria(banco, {
    ator,
    acao: "reprovar_cadastro",
    entidade: "titulares",
    entidadeId: titularId,
    dados: { motivo },
  });

  return { status: "reprovado" };
}

/**
 * Retira a carteira do registro on-chain. O motivo vai on-chain só como
 * keccak256, porque o texto pode ter dado pessoal; o texto fica na auditoria.
 * O contrato só aceita carteira com saldo zero.
 */
export async function desabilitarCarteira(
  { banco, cadeia }: Pick<Dependencias, "banco" | "cadeia">,
  ator: string,
  titularId: string,
  { motivo, agora = new Date() }: { motivo: string; agora?: Date },
): Promise<Resultado<{ txHash: Hex }>> {
  await exigirPapel(banco, ator, "administrador");
  motivo = motivo.trim();
  if (!motivo) return { erro: "Informe o motivo da desabilitação." };

  const titular = await lerTitular({ banco }, titularId);
  const carteira = titular && (await lerCarteira({ banco }, titular.perfil_id));
  if (!titular || carteira?.status !== "habilitada") {
    return { erro: "A carteira deste cadastro não está habilitada." };
  }

  const endereco = getAddress(carteira.endereco);
  const auditar = (dados: { txHash: Hex } | { erro: string }) =>
    registrarAuditoria(banco, {
      ator,
      acao: "desabilitar_carteira",
      entidade: "titulares",
      entidadeId: titularId,
      dados: { endereco, motivo, ...dados },
    });

  let txHash: Hex;
  try {
    txHash = await enviarTransacao(
      { banco, cadeia },
      { perfilId: titular.perfil_id, carteiraId: carteira.id, tipo: "desabilitacao", dados: { endereco } },
      () => cadeia.registro.write.desabilitar([endereco, keccak256(toBytes(motivo))]),
    );
  } catch (erro) {
    const mensagem = `A desabilitação on-chain falhou: ${mensagemDeErro(erro)}`;
    await auditar({ erro: mensagem });
    return { erro: mensagem };
  }

  const { error } = await banco
    .from("carteiras")
    .update({ status: "desabilitada", desabilitada_em: agora.toISOString() })
    .eq("id", carteira.id);
  if (error) throw new Error(`falha ao marcar a carteira ${endereco} como desabilitada: ${error.message}`);
  await auditar({ txHash });

  return { txHash };
}

async function lerTitular({ banco }: Pick<Dependencias, "banco">, titularId: string) {
  const { data, error } = await banco.from("titulares").select().eq("id", titularId).maybeSingle();
  if (error) throw new Error(`falha ao ler o cadastro ${titularId}: ${error.message}`);
  return data;
}

async function lerCarteira({ banco }: Pick<Dependencias, "banco">, perfilId: string) {
  const { data, error } = await banco
    .from("carteiras")
    .select("id, endereco, status, erro_habilitacao")
    .eq("perfil_id", perfilId)
    .eq("tipo", "embutida")
    .single();
  if (error) throw new Error(`falha ao ler a carteira do perfil ${perfilId}: ${error.message}`);
  return data;
}

/**
 * Chama `RegistroHabilitados.habilitar` com a conta agente. Se falhar, a
 * carteira continua pendente com o erro, para o painel oferecer nova tentativa.
 * Se a carteira já estiver habilitada on-chain para o titular (uma tentativa
 * anterior confirmou depois de desistirmos de esperar), só acerta o banco.
 */
async function habilitar(
  { banco, cadeia }: Pick<Dependencias, "banco" | "cadeia">,
  ator: string,
  titular: { id: string; perfil_id: string; identificador: string },
  carteira: { id: string; endereco: string },
): Promise<Habilitacao> {
  const endereco = getAddress(carteira.endereco);
  const identificador = titular.identificador as Hex;
  const auditar = (dados: { txHash: Hex | null } | { erro: string }) =>
    registrarAuditoria(banco, {
      ator,
      acao: "habilitar_carteira",
      entidade: "titulares",
      entidadeId: titular.id,
      dados: { endereco, ...dados },
    });

  let txHash: Hex | null = null;
  try {
    if ((await cadeia.registro.read.titularDe([endereco])) !== identificador) {
      txHash = await enviarTransacao(
        { banco, cadeia },
        { perfilId: titular.perfil_id, carteiraId: carteira.id, tipo: "habilitacao", dados: { endereco } },
        () => cadeia.registro.write.habilitar([endereco, identificador]),
      );
    }
  } catch (erro) {
    const mensagem = `A habilitação on-chain falhou: ${mensagemDeErro(erro)}`;
    const { error } = await banco
      .from("carteiras")
      .update({ erro_habilitacao: mensagem })
      .eq("id", carteira.id)
      .eq("status", "pendente");
    if (error) throw new Error(`falha ao registrar o erro da habilitação de ${endereco}: ${error.message}`);
    await auditar({ erro: mensagem });
    return { erro: mensagem };
  }

  const { error } = await banco
    .from("carteiras")
    .update({ status: "habilitada", habilitada_em: new Date().toISOString(), erro_habilitacao: null })
    .eq("id", carteira.id);
  if (error) throw new Error(`falha ao marcar a carteira ${endereco} como habilitada: ${error.message}`);
  await auditar({ txHash });

  return { txHash };
}
