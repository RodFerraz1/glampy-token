import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { registrarAuditoria } from "@/servidor/auditoria";
import { criarBanco } from "@/servidor/adaptadores/banco";

describe("auditoria", () => {
  const banco = criarBanco({
    url: process.env.SUPABASE_URL_TESTE!,
    chaveSecreta: process.env.SUPABASE_CHAVE_SECRETA_TESTE!,
  });

  it("grava ator, ação, entidade e dados", async () => {
    const { data, error } = await banco.auth.admin.createUser({
      email: `admin-${crypto.randomUUID()}@teste.local`,
      email_confirm: true,
    });
    if (error) throw error;
    const ator = data.user.id;

    await registrarAuditoria(banco, {
      ator,
      acao: "aprovar_cadastro",
      entidade: "titulares",
      entidadeId: "123",
      dados: { motivo: "documentos conferidos" },
    });

    const { data: linhas } = await banco.from("auditoria").select().eq("ator_id", ator);
    assert.equal(linhas?.length, 1);
    assert.equal(linhas[0].acao, "aprovar_cadastro");
    assert.equal(linhas[0].entidade, "titulares");
    assert.equal(linhas[0].entidade_id, "123");
    assert.deepEqual(linhas[0].dados, { motivo: "documentos conferidos" });
  });

  it("falha quando o ator não existe", async () => {
    await assert.rejects(
      registrarAuditoria(banco, { ator: crypto.randomUUID(), acao: "x", entidade: "y" }),
      /falha ao registrar auditoria de x/,
    );
  });
});
