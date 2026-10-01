import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { VERSAO_DA_DECLARACAO } from "@/declaracao-investidor-profissional";
import { AcessoNegado } from "@/servidor/autorizacao";
import { criarConvite } from "@/servidor/operacoes/convites";
import { consultarCadastro, criarConta, enviarCadastro } from "@/servidor/operacoes/cadastro";
import { entrar } from "@/servidor/operacoes/entrar";
import { investidorComCarteira as comCarteira } from "../ambiente";
import { cpfNovo } from "../ambiente/cpf";
import { bancoDeTeste, criarUsuario, novoClienteDeSessao } from "../ambiente/usuarios";
import { criarContaInteligenteFalsa } from "../falsos/conta-inteligente";

const SENHA = "senha-do-investidor";
const emailNovo = () => `convidado-${crypto.randomUUID()}@teste.local`;

describe("cadastro", () => {
  const banco = bancoDeTeste();

  async function convidar(email = emailNovo()) {
    const administrador = await criarUsuario(banco, "administrador");
    const convite = await criarConvite({ banco }, administrador.id, { email });
    if ("erro" in convite) throw new Error(convite.erro);
    return { ...convite, email };
  }

  const usadoEm = async (conviteId: string) =>
    (await banco.from("convites").select("usado_em").eq("id", conviteId).single().throwOnError()).data.usado_em;

  it("criar conta com o e-mail do convite abre acesso de investidor e usa o convite", async () => {
    const convite = await convidar();

    const conta = await criarConta({ banco }, { token: convite.token, email: convite.email, senha: SENHA });

    assert.ok(!("erro" in conta));
    assert.deepEqual(await entrar(novoClienteDeSessao(), { email: convite.email, senha: SENHA }), { papel: "investidor" });
    assert.notEqual(await usadoEm(convite.id), null);
  });

  it("criar conta com e-mail diferente do convite é recusado e o convite continua pendente", async () => {
    const convite = await convidar();
    const outroEmail = emailNovo();

    const conta = await criarConta({ banco }, { token: convite.token, email: outroEmail, senha: SENHA });

    assert.deepEqual(conta, { erro: "O cadastro só pode ser feito com o e-mail do convite." });
    assert.deepEqual(await entrar(novoClienteDeSessao(), { email: outroEmail, senha: SENHA }), { erro: "E-mail ou senha incorretos." });
    assert.equal(await usadoEm(convite.id), null);
  });

  it("sem convite não há cadastro direto no Supabase Auth pela chave pública", async () => {
    const email = emailNovo();

    const { error } = await novoClienteDeSessao().auth.signUp({ email, password: SENHA });

    assert.equal(error?.code, "signup_disabled");
    assert.deepEqual(await entrar(novoClienteDeSessao(), { email, senha: SENHA }), { erro: "E-mail ou senha incorretos." });
  });

  it("criar conta aceita o e-mail do convite com maiúsculas e espaços", async () => {
    const convite = await convidar();

    const conta = await criarConta({ banco }, { token: convite.token, email: ` ${convite.email.toUpperCase()} `, senha: SENHA });

    assert.ok(!("erro" in conta));
  });

  it("o mesmo convite não cria uma segunda conta", async () => {
    const convite = await convidar();
    await criarConta({ banco }, { token: convite.token, email: convite.email, senha: SENHA });

    const segunda = await criarConta({ banco }, { token: convite.token, email: convite.email, senha: "outra-senha-qualquer" });

    assert.ok("erro" in segunda);
    assert.match(segunda.erro, /já foi usado/);
  });

  it("criar conta recusa senha curta sem usar o convite", async () => {
    const convite = await convidar();

    const conta = await criarConta({ banco }, { token: convite.token, email: convite.email, senha: "1234567" });

    assert.deepEqual(conta, { erro: "A senha precisa ter pelo menos 8 caracteres." });
    assert.equal(await usadoEm(convite.id), null);
  });

  it("convite para e-mail que já tem conta é recusado e continua pendente", async () => {
    const existente = await criarUsuario(banco, "investidor");
    const convite = await convidar(existente.email);

    const conta = await criarConta({ banco }, { token: convite.token, email: existente.email, senha: SENHA });

    assert.ok("erro" in conta);
    assert.match(conta.erro, /Já existe uma conta/);
    assert.equal(await usadoEm(convite.id), null);
  });

  const dadosPessoais = (cpf = cpfNovo()) => ({
    nomeCompleto: "Maria da Silva",
    cpf,
    dataNascimento: "1980-05-17",
    telefone: "(11) 98765-4321",
    declaracaoAceita: true,
  });

  const contaInteligente = criarContaInteligenteFalsa();
  const investidorComCarteira = () => comCarteira({ banco, contaInteligente });

  const titularDe = async (perfilId: string) =>
    (await banco.from("titulares").select().eq("perfil_id", perfilId).maybeSingle().throwOnError()).data;

  it("enviar cadastro grava os dados e a declaração em titulares e deixa o cadastro em análise", async () => {
    const investidor = await investidorComCarteira();
    const cpf = cpfNovo();
    const agora = new Date("2026-10-02T15:00:00Z");

    const comMascara = `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;

    const resultado = await enviarCadastro({ banco }, investidor.id, { ...dadosPessoais(comMascara), agora });

    assert.deepEqual(resultado, { status: "em_analise" });
    const titular = await titularDe(investidor.id);
    assert.equal(titular?.nome_completo, "Maria da Silva");
    assert.equal(titular?.cpf, cpf);
    assert.equal(titular?.data_nascimento, "1980-05-17");
    assert.equal(titular?.telefone, "11987654321");
    assert.equal(titular?.status, "em_analise");
    assert.equal(titular?.declaracao_profissional_versao, VERSAO_DA_DECLARACAO);
    assert.equal(new Date(titular?.declaracao_profissional_aceita_em ?? "").toISOString(), agora.toISOString());
  });

  it("o identificador on-chain é aleatório, não derivado dos dados pessoais", async () => {
    const [primeiro, segundo] = [await investidorComCarteira(), await investidorComCarteira()];
    await enviarCadastro({ banco }, primeiro.id, dadosPessoais());
    await enviarCadastro({ banco }, segundo.id, dadosPessoais());

    const [a, b] = [await titularDe(primeiro.id), await titularDe(segundo.id)];
    assert.match(a?.identificador ?? "", /^0x[0-9a-f]{64}$/);
    assert.notEqual(a?.identificador, b?.identificador);
    assert.ok(!a?.identificador.includes(a.cpf));
  });

  it("consultar cadastro mostra em análise depois do envio", async () => {
    const investidor = await investidorComCarteira();
    assert.equal(await consultarCadastro({ banco }, investidor.id), null);

    await enviarCadastro({ banco }, investidor.id, dadosPessoais());

    assert.deepEqual(await consultarCadastro({ banco }, investidor.id), { status: "em_analise", motivoReprovacao: null });
  });

  for (const cpf of ["123.456.789-00", "111.111.111-11", "1234567890"]) {
    it(`enviar cadastro recusa o CPF inválido ${cpf}`, async () => {
      const investidor = await investidorComCarteira();

      const resultado = await enviarCadastro({ banco }, investidor.id, dadosPessoais(cpf));

      assert.deepEqual(resultado, { erro: "CPF inválido. Confira os números." });
      assert.equal(await titularDe(investidor.id), null);
    });
  }

  it("enviar cadastro recusa CPF já cadastrado", async () => {
    const cpf = cpfNovo();
    const primeiro = await investidorComCarteira();
    await enviarCadastro({ banco }, primeiro.id, dadosPessoais(cpf));
    const segundo = await investidorComCarteira();

    const resultado = await enviarCadastro({ banco }, segundo.id, dadosPessoais(cpf));

    assert.deepEqual(resultado, { erro: "Este CPF já está cadastrado. Se ele é seu, fale com o Ibiti." });
    assert.equal(await titularDe(segundo.id), null);
  });

  it("enviar cadastro exige a declaração de investidor profissional", async () => {
    const investidor = await investidorComCarteira();

    const resultado = await enviarCadastro({ banco }, investidor.id, { ...dadosPessoais(), declaracaoAceita: false });

    assert.deepEqual(resultado, { erro: "A oferta é restrita a investidores profissionais: aceite a declaração para continuar." });
    assert.equal(await titularDe(investidor.id), null);
  });

  it("enviar cadastro exige nome, data de nascimento e telefone", async () => {
    const investidor = await investidorComCarteira();

    for (const [campo, valor, erro] of [
      ["nomeCompleto", "  ", "Informe o nome completo."],
      ["dataNascimento", "2999-01-01", "Informe uma data de nascimento válida."],
      ["dataNascimento", "1980-02-30", "Informe uma data de nascimento válida."],
      ["telefone", "123", "Informe um telefone com DDD."],
    ] as const) {
      assert.deepEqual(await enviarCadastro({ banco }, investidor.id, { ...dadosPessoais(), [campo]: valor }), { erro });
    }
    assert.equal(await titularDe(investidor.id), null);
  });

  it("o cadastro só é enviado uma vez", async () => {
    const investidor = await investidorComCarteira();
    await enviarCadastro({ banco }, investidor.id, dadosPessoais());

    const segundo = await enviarCadastro({ banco }, investidor.id, dadosPessoais());

    assert.deepEqual(segundo, { erro: "Seu cadastro já foi enviado." });
  });

  it("enviar cadastro sem carteira é recusado", async () => {
    const investidor = await criarUsuario(banco, "investidor");

    const resultado = await enviarCadastro({ banco }, investidor.id, dadosPessoais());

    assert.deepEqual(resultado, { erro: "Crie sua carteira antes de enviar o cadastro." });
    assert.equal(await titularDe(investidor.id), null);
  });

  it("só investidor envia cadastro", async () => {
    const administrador = await criarUsuario(banco, "administrador");

    await assert.rejects(enviarCadastro({ banco }, administrador.id, dadosPessoais()), AcessoNegado);
  });
});
