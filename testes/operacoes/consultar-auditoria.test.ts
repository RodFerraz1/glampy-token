import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { registrarAuditoria } from "@/servidor/auditoria";
import { AcessoNegado } from "@/servidor/autorizacao";
import { consultarAuditoria, opcoesDaAuditoria } from "@/servidor/operacoes/consultar-auditoria";
import { bancoDeTeste } from "../ambiente";
import { criarUsuario } from "../ambiente/usuarios";

describe("consulta da auditoria", () => {
  const banco = bancoDeTeste();
  let administrador: { id: string; email: string };
  const acaoUnica = `acao_de_teste_${crypto.randomUUID().slice(0, 8)}`;
  const entidadeUnica = `entidade_de_teste_${crypto.randomUUID().slice(0, 8)}`;
  before(async () => {
    administrador = await criarUsuario(banco, "administrador");
    await registrarAuditoria(banco, { ator: administrador.id, acao: acaoUnica, entidade: "convites", entidadeId: "1" });
    await registrarAuditoria(banco, { ator: administrador.id, acao: acaoUnica, entidade: entidadeUnica, entidadeId: "2" });
    await registrarAuditoria(banco, {
      ator: administrador.id,
      acao: "outra_acao",
      entidade: entidadeUnica,
      entidadeId: "3",
      dados: { motivo: "teste" },
    });
  });

  it("lista as mais recentes primeiro, com o autor e os dados", async () => {
    const registros = (await consultarAuditoria({ banco }, administrador.id)).filter(
      ({ autor }) => autor === administrador.email,
    );

    assert.deepEqual(
      registros.map(({ acao, entidadeId }) => [acao, entidadeId]),
      [
        ["outra_acao", "3"],
        [acaoUnica, "2"],
        [acaoUnica, "1"],
      ],
    );
    assert.deepEqual(registros[0].dados, { motivo: "teste" });
    assert.ok(!Number.isNaN(Date.parse(registros[0].em)));
  });

  it("filtra por ação, por entidade e pelas duas", async () => {
    const porAcao = await consultarAuditoria({ banco }, administrador.id, { acao: acaoUnica });
    assert.deepEqual(porAcao.map(({ entidadeId }) => entidadeId), ["2", "1"]);

    const porEntidade = await consultarAuditoria({ banco }, administrador.id, { entidade: entidadeUnica });
    assert.deepEqual(porEntidade.map(({ entidadeId }) => entidadeId), ["3", "2"]);

    const pelasDuas = await consultarAuditoria({ banco }, administrador.id, { acao: acaoUnica, entidade: entidadeUnica });
    assert.deepEqual(pelasDuas.map(({ entidadeId }) => entidadeId), ["2"]);
  });

  it("oferece como filtro as ações e entidades já registradas", async () => {
    const { acoes, entidades } = await opcoesDaAuditoria({ banco }, administrador.id);

    assert.ok(acoes.includes(acaoUnica) && acoes.includes("outra_acao"));
    assert.ok(entidades.includes(entidadeUnica));
    assert.deepEqual(acoes, [...acoes].sort());
  });

  it("é somente leitura: o banco recusa alterar ou apagar", async () => {
    const { error: alteracao } = await banco.from("auditoria").update({ acao: "x" }).eq("acao", acaoUnica);
    const { error: remocao } = await banco.from("auditoria").delete().eq("acao", acaoUnica);

    assert.match(alteracao?.message ?? "", /somente inserção/);
    assert.match(remocao?.message ?? "", /somente inserção/);
  });

  it("só o administrador consulta", async () => {
    const operador = await criarUsuario(banco, "operador");

    await assert.rejects(consultarAuditoria({ banco }, operador.id), AcessoNegado);
    await assert.rejects(opcoesDaAuditoria({ banco }, operador.id), AcessoNegado);
  });
});
