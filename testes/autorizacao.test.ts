import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AcessoNegado, exigirPapel } from "@/servidor/autorizacao";
import { bancoDeTeste, criarUsuario } from "./ambiente/usuarios";

describe("autorização por papel", () => {
  const banco = bancoDeTeste();

  it("investidor não executa operação de administrador", async () => {
    const investidor = await criarUsuario(banco, "investidor");

    await assert.rejects(exigirPapel(banco, investidor.id, "administrador"), AcessoNegado);
  });

  it("operador não executa operação de administrador", async () => {
    const operador = await criarUsuario(banco, "operador");

    await assert.rejects(exigirPapel(banco, operador.id, "administrador"), AcessoNegado);
  });

  it("administrador executa operação de administrador", async () => {
    const administrador = await criarUsuario(banco, "administrador");

    await exigirPapel(banco, administrador.id, "administrador");
  });

  it("barra quem não tem perfil", async () => {
    await assert.rejects(exigirPapel(banco, crypto.randomUUID(), "investidor"), AcessoNegado);
  });
});
