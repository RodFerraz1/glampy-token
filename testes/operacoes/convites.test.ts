import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AcessoNegado } from "@/servidor/autorizacao";
import { criarConvite, listarConvites, validarConvite } from "@/servidor/operacoes/convites";
import { bancoDeTeste, criarUsuario } from "../ambiente/usuarios";

const CRIADO_EM = new Date("2026-10-01T12:00:00Z");
const depoisDe = (milissegundos: number) => new Date(CRIADO_EM.getTime() + milissegundos);
const DIA = 24 * 60 * 60 * 1000;
const emailNovo = () => `convidado-${crypto.randomUUID()}@teste.local`;

describe("convites", () => {
  const banco = bancoDeTeste();

  async function convidar(ator: string, opcoes: { email: string; agora?: Date }) {
    const resultado = await criarConvite({ banco }, ator, opcoes);
    if ("erro" in resultado) throw new Error(resultado.erro);
    return resultado;
  }

  it("criar convite vale 7 dias e não guarda o token", async () => {
    const administrador = await criarUsuario(banco, "administrador");
    const email = emailNovo();

    const convite = await convidar(administrador.id, { email, agora: CRIADO_EM });

    assert.equal(convite.expiraEm, "2026-10-08T12:00:00.000Z");
    const { data: linha } = await banco.from("convites").select().eq("id", convite.id).single();
    assert.equal(linha?.email, email);
    assert.equal(linha?.criado_por, administrador.id);
    assert.equal(linha?.usado_em, null);
    assert.ok(!Object.values(linha ?? {}).includes(convite.token));
  });

  it("criar convite grava auditoria", async () => {
    const administrador = await criarUsuario(banco, "administrador");
    const email = emailNovo();

    const convite = await convidar(administrador.id, { email });

    const { data: linhas } = await banco.from("auditoria").select().eq("ator_id", administrador.id);
    assert.equal(linhas?.length, 1);
    assert.equal(linhas[0].acao, "criar_convite");
    assert.equal(linhas[0].entidade, "convites");
    assert.equal(linhas[0].entidade_id, convite.id);
    assert.deepEqual(linhas[0].dados, { email });
  });

  it("criar convite guarda o e-mail em minúsculas e sem espaços", async () => {
    const administrador = await criarUsuario(banco, "administrador");
    const email = emailNovo();

    const convite = await convidar(administrador.id, { email: `  ${email.toUpperCase()} ` });

    const { data: linha } = await banco.from("convites").select("email").eq("id", convite.id).single();
    assert.equal(linha?.email, email);
  });

  it("criar convite recusa e-mail inválido", async () => {
    const administrador = await criarUsuario(banco, "administrador");

    const resultado = await criarConvite({ banco }, administrador.id, { email: "sem-arroba" });

    assert.deepEqual(resultado, { erro: "Informe um e-mail válido." });
  });

  it("investidor não cria convite", async () => {
    const investidor = await criarUsuario(banco, "investidor");

    await assert.rejects(criarConvite({ banco }, investidor.id, { email: emailNovo() }), AcessoNegado);
  });

  it("validar convite pendente devolve o e-mail do convite", async () => {
    const administrador = await criarUsuario(banco, "administrador");
    const email = emailNovo();
    const { token } = await convidar(administrador.id, { email });

    assert.deepEqual(await validarConvite({ banco }, token), { status: "pendente", email });
  });

  // Marcar como usado é do cadastro; aqui o convite é marcado direto no banco.
  it("validar convite usado", async () => {
    const administrador = await criarUsuario(banco, "administrador");
    const { id, token } = await convidar(administrador.id, { email: emailNovo() });
    await banco.from("convites").update({ usado_em: new Date().toISOString() }).eq("id", id).throwOnError();

    assert.deepEqual(await validarConvite({ banco }, token), { status: "usado" });
  });

  it("validar convite vencido depois de 7 dias", async () => {
    const administrador = await criarUsuario(banco, "administrador");
    const { token } = await convidar(administrador.id, { email: emailNovo(), agora: CRIADO_EM });

    assert.deepEqual(await validarConvite({ banco }, token, { agora: depoisDe(7 * DIA) }), { status: "vencido" });
  });

  it("validar convite ainda pendente no fim do sétimo dia", async () => {
    const administrador = await criarUsuario(banco, "administrador");
    const email = emailNovo();
    const { token } = await convidar(administrador.id, { email, agora: CRIADO_EM });

    assert.deepEqual(await validarConvite({ banco }, token, { agora: depoisDe(7 * DIA - 1) }), { status: "pendente", email });
  });

  it("validar link que não corresponde a convite", async () => {
    assert.deepEqual(await validarConvite({ banco }, "token-inventado"), { status: "invalido" });
  });

  it("lista convites com status pendente, usado e vencido", async () => {
    const administrador = await criarUsuario(banco, "administrador");
    const vencido = await convidar(administrador.id, { email: emailNovo(), agora: CRIADO_EM });
    const pendente = await convidar(administrador.id, { email: emailNovo(), agora: depoisDe(2 * DIA) });
    const usado = await convidar(administrador.id, { email: emailNovo(), agora: depoisDe(2 * DIA) });
    await banco.from("convites").update({ usado_em: depoisDe(3 * DIA).toISOString() }).eq("id", usado.id).throwOnError();

    const convites = await listarConvites({ banco }, administrador.id, { agora: depoisDe(8 * DIA) });

    const statusPorId = new Map(convites.map((convite) => [convite.id, convite.status]));
    assert.equal(statusPorId.get(pendente.id), "pendente");
    assert.equal(statusPorId.get(usado.id), "usado");
    assert.equal(statusPorId.get(vencido.id), "vencido");
  });

  it("investidor não lista convites", async () => {
    const investidor = await criarUsuario(banco, "investidor");

    await assert.rejects(listarConvites({ banco }, investidor.id), AcessoNegado);
  });
});
