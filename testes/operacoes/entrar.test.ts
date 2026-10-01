import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { entrar } from "@/servidor/operacoes/entrar";
import type { Papel } from "@/servidor/autorizacao";
import { bancoDeTeste, criarUsuario, novoClienteDeSessao } from "../ambiente/usuarios";

describe("entrar", () => {
  const banco = bancoDeTeste();

  for (const papel of ["investidor", "operador", "administrador"] satisfies Papel[]) {
    it(`devolve o papel ${papel} registrado em perfis`, async () => {
      const usuario = await criarUsuario(banco, papel);

      const resultado = await entrar(novoClienteDeSessao(), { email: usuario.email, senha: usuario.senha });

      assert.deepEqual(resultado, { papel });
    });
  }

  it("deixa a sessão aberta no cliente usado", async () => {
    const usuario = await criarUsuario(banco, "investidor");
    const sessao = novoClienteDeSessao();

    await entrar(sessao, { email: usuario.email, senha: usuario.senha });

    const { data } = await sessao.auth.getClaims();
    assert.equal(data?.claims.sub, usuario.id);
  });

  it("recusa senha errada sem abrir sessão", async () => {
    const usuario = await criarUsuario(banco, "investidor");
    const sessao = novoClienteDeSessao();

    const resultado = await entrar(sessao, { email: usuario.email, senha: "senha-errada" });

    assert.deepEqual(resultado, { erro: "E-mail ou senha incorretos." });
    const { data } = await sessao.auth.getClaims();
    assert.equal(data, null);
  });
});
