import { VERSAO_DA_DECLARACAO } from "@/declaracao-investidor-profissional";
import type { Dependencias } from "@/servidor/adaptadores";
import type { Database } from "@/servidor/adaptadores/tipos-do-banco";
import { exigirPapel } from "@/servidor/autorizacao";
import { consultarCarteira } from "@/servidor/operacoes/carteira";
import { liberarConvite, usarConvite, validarConvite } from "@/servidor/operacoes/convites";

export const TAMANHO_MINIMO_DA_SENHA = 8;

const RECUSA_DO_CONVITE = {
  usado: "Este convite já foi usado. Se o cadastro é seu, entre com seu e-mail e senha.",
  vencido: "Este convite venceu. Peça um novo convite ao Ibiti.",
  invalido: "Link de convite inválido.",
};

/**
 * Cria o acesso do investidor no Supabase Auth, só para o e-mail do convite.
 * O convite é marcado como usado antes de criar o usuário, para que dois
 * cadastros simultâneos não usem o mesmo link, e volta a pendente se a
 * criação falhar.
 */
export async function criarConta(
  { banco }: Pick<Dependencias, "banco">,
  { token, email, senha, agora = new Date() }: { token: string; email: string; senha: string; agora?: Date },
): Promise<{ perfilId: string } | { erro: string }> {
  const convite = await validarConvite({ banco }, token, { agora });
  if (convite.status !== "pendente") return { erro: RECUSA_DO_CONVITE[convite.status] };
  if (email.trim().toLowerCase() !== convite.email) {
    return { erro: "O cadastro só pode ser feito com o e-mail do convite." };
  }
  if (senha.length < TAMANHO_MINIMO_DA_SENHA) {
    return { erro: `A senha precisa ter pelo menos ${TAMANHO_MINIMO_DA_SENHA} caracteres.` };
  }

  if (!(await usarConvite({ banco }, token, agora))) return { erro: RECUSA_DO_CONVITE.usado };

  const { data, error } = await banco.auth.admin.createUser({ email: convite.email, password: senha, email_confirm: true });
  if (error) {
    await liberarConvite({ banco }, token);
    if (error.code === "email_exists") {
      return { erro: "Já existe uma conta com este e-mail. Entre com seu e-mail e senha." };
    }
    throw new Error(`falha ao criar a conta: ${error.message}`);
  }

  return { perfilId: data.user.id };
}

const apenasDigitos = (valor: string) => valor.replace(/\D/g, "");

function cpfValido(cpf: string) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const digitos = [...cpf].map(Number);
  const verificador = (quantidade: number) => {
    const soma = digitos.slice(0, quantidade).reduce((total, digito, i) => total + digito * (quantidade + 1 - i), 0);
    return ((soma * 10) % 11) % 10;
  };
  return verificador(9) === digitos[9] && verificador(10) === digitos[10];
}

function dataDeNascimentoValida(data: string, agora: Date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  const dia = new Date(`${data}T00:00:00Z`);
  return !Number.isNaN(dia.getTime()) && dia.toISOString().startsWith(data) && dia < agora;
}

export interface DadosDoCadastro {
  nomeCompleto: string;
  cpf: string;
  dataNascimento: string;
  telefone: string;
  declaracaoAceita: boolean;
  agora?: Date;
}

/**
 * Grava o cadastro em `titulares` já em análise, e só depois de a carteira
 * estar criada. O `identificador` on-chain é gerado aleatório pelo banco.
 */
export async function enviarCadastro(
  { banco }: Pick<Dependencias, "banco">,
  perfilId: string,
  { nomeCompleto, cpf, dataNascimento, telefone, declaracaoAceita, agora = new Date() }: DadosDoCadastro,
): Promise<{ status: "em_analise" } | { erro: string }> {
  await exigirPapel(banco, perfilId, "investidor");
  nomeCompleto = nomeCompleto.trim().replace(/\s+/g, " ");
  cpf = apenasDigitos(cpf);
  telefone = apenasDigitos(telefone);

  if (!nomeCompleto) return { erro: "Informe o nome completo." };
  if (!cpfValido(cpf)) return { erro: "CPF inválido. Confira os números." };
  if (!dataDeNascimentoValida(dataNascimento, agora)) return { erro: "Informe uma data de nascimento válida." };
  if (telefone.length < 10 || telefone.length > 13) return { erro: "Informe um telefone com DDD." };
  if (!declaracaoAceita) {
    return { erro: "A oferta é restrita a investidores profissionais: aceite a declaração para continuar." };
  }
  if (!(await consultarCarteira({ banco }, perfilId))) return { erro: "Crie sua carteira antes de enviar o cadastro." };

  const { error } = await banco.from("titulares").insert({
    perfil_id: perfilId,
    nome_completo: nomeCompleto,
    cpf,
    data_nascimento: dataNascimento,
    telefone,
    status: "em_analise",
    declaracao_profissional_versao: VERSAO_DA_DECLARACAO,
    declaracao_profissional_aceita_em: agora.toISOString(),
  });
  if (error?.code === "23505" && error.message.includes("titulares_cpf_key")) {
    return { erro: "Este CPF já está cadastrado. Se ele é seu, fale com o Ibiti." };
  }
  if (error?.code === "23505" && error.message.includes("titulares_perfil_id_key")) {
    return { erro: "Seu cadastro já foi enviado." };
  }
  if (error) throw new Error(`falha ao enviar o cadastro: ${error.message}`);

  return { status: "em_analise" };
}

export type StatusDoCadastro = Database["public"]["Enums"]["status_kyc"];

/** Status do cadastro do investidor, ou `null` se ele ainda não enviou. */
export async function consultarCadastro({ banco }: Pick<Dependencias, "banco">, perfilId: string) {
  const { data, error } = await banco
    .from("titulares")
    .select("status, motivo_reprovacao")
    .eq("perfil_id", perfilId)
    .maybeSingle();
  if (error) throw new Error(`falha ao consultar o cadastro: ${error.message}`);
  if (!data) return null;
  return { status: data.status, motivoReprovacao: data.motivo_reprovacao };
}
