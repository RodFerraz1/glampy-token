import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MEMORANDO_DE_OFERTA, TERMO_DE_RISCOS } from "@/documentos-do-aceite";
import { AcessoNegado } from "@/servidor/autorizacao";
import { consultarAceite, registrarAceite } from "@/servidor/operacoes/aceite";
import { bancoDeTeste, criarUsuario, novoClienteDeSessao } from "../ambiente/usuarios";

describe("aceite do Memorando de Oferta e do termo de riscos", () => {
  const banco = bancoDeTeste();
  const agora = new Date("2026-10-05T14:30:00Z");
  const ambosAceitos = { memorando: true, riscos: true, agora };

  const aceitesDe = async (perfilId: string) =>
    (
      await banco
        .from("aceites")
        .select("documento, versao, aceito_em")
        .eq("perfil_id", perfilId)
        .order("documento")
        .throwOnError()
    ).data.map(({ aceito_em, ...aceite }) => ({ ...aceite, aceitoEm: new Date(aceito_em).getTime() }));

  it("antes de aceitar, o investidor não tem aceite", async () => {
    const investidor = await criarUsuario(banco, "investidor");

    assert.equal(await consultarAceite({ banco }, investidor.id), null);
  });

  it("o aceite grava os dois documentos com a versão vigente e a data", async () => {
    const investidor = await criarUsuario(banco, "investidor");

    const resultado = await registrarAceite({ banco }, investidor.id, ambosAceitos);

    assert.ok(!("erro" in resultado));
    assert.equal(new Date(resultado.aceitoEm).getTime(), agora.getTime());
    assert.deepEqual(await aceitesDe(investidor.id), [
      { documento: "memorando_de_oferta", versao: MEMORANDO_DE_OFERTA.versao, aceitoEm: agora.getTime() },
      { documento: "termo_de_riscos", versao: TERMO_DE_RISCOS.versao, aceitoEm: agora.getTime() },
    ]);
    assert.equal(new Date((await consultarAceite({ banco }, investidor.id))!.aceitoEm).getTime(), agora.getTime());
  });

  it("sem aceitar os dois documentos, o aceite é recusado e nada é gravado", async () => {
    const investidor = await criarUsuario(banco, "investidor");

    assert.deepEqual(await registrarAceite({ banco }, investidor.id, { memorando: true, riscos: false }), {
      erro: "Aceite o Memorando de Oferta e o termo de ciência de riscos para continuar.",
    });
    assert.deepEqual(await registrarAceite({ banco }, investidor.id, { memorando: false, riscos: true }), {
      erro: "Aceite o Memorando de Oferta e o termo de ciência de riscos para continuar.",
    });
    assert.deepEqual(await aceitesDe(investidor.id), []);
  });

  it("aceitar de novo não duplica nem muda a data do primeiro aceite", async () => {
    const investidor = await criarUsuario(banco, "investidor");
    await registrarAceite({ banco }, investidor.id, ambosAceitos);

    const depois = new Date(agora.getTime() + 60_000);
    const resultado = await registrarAceite({ banco }, investidor.id, { ...ambosAceitos, agora: depois });

    assert.ok(!("erro" in resultado));
    assert.equal(new Date(resultado.aceitoEm).getTime(), agora.getTime());
    assert.equal((await aceitesDe(investidor.id)).length, 2);
  });

  it("o aceite de uma versão anterior não vale para a vigente", async () => {
    const investidor = await criarUsuario(banco, "investidor");
    await banco
      .from("aceites")
      .insert([
        { perfil_id: investidor.id, documento: "memorando_de_oferta", versao: "memorando-v1" },
        { perfil_id: investidor.id, documento: "termo_de_riscos", versao: TERMO_DE_RISCOS.versao },
      ])
      .throwOnError();

    assert.equal(await consultarAceite({ banco }, investidor.id), null);
  });

  it("o investidor lê os próprios aceites, e não os de outro", async () => {
    const investidor = await criarUsuario(banco, "investidor");
    const outro = await criarUsuario(banco, "investidor");
    await registrarAceite({ banco }, investidor.id, ambosAceitos);
    await registrarAceite({ banco }, outro.id, ambosAceitos);
    const sessao = novoClienteDeSessao();
    await sessao.auth.signInWithPassword({ email: investidor.email, password: investidor.senha });

    const { data } = await sessao.from("aceites").select("perfil_id").throwOnError();

    assert.deepEqual(
      data.map(({ perfil_id }) => perfil_id),
      [investidor.id, investidor.id],
    );
  });

  it("só o investidor registra aceite", async () => {
    const operador = await criarUsuario(banco, "operador");

    await assert.rejects(registrarAceite({ banco }, operador.id, ambosAceitos), AcessoNegado);
  });
});
