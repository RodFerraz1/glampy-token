import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import type { Passkey } from "@/carteira/safe";
import { AcessoNegado } from "@/servidor/autorizacao";
import { criarCarteira } from "@/servidor/operacoes/carteira";
import { prepararAmbiente, type Ambiente } from "../ambiente";
import { novaPasskey } from "../ambiente/passkey";
import { criarUsuario } from "../ambiente/usuarios";

describe("carteira com passkey", () => {
  let ambiente: Ambiente;
  before(async () => {
    ambiente = await prepararAmbiente();
  });

  const carteirasDe = async (perfilId: string) =>
    (await ambiente.banco.from("carteiras").select().eq("perfil_id", perfilId).throwOnError()).data;

  it("criar carteira grava o endereço contrafactual como carteira embutida pendente, com a passkey", async () => {
    const investidor = await criarUsuario(ambiente.banco, "investidor");
    const passkey = novaPasskey();

    const resultado = await criarCarteira(ambiente, investidor.id, passkey);

    assert.ok(!("erro" in resultado));
    const [carteira, ...outras] = await carteirasDe(investidor.id);
    assert.equal(outras.length, 0);
    assert.equal(carteira.endereco, resultado.endereco.toLowerCase());
    assert.equal(carteira.tipo, "embutida");
    assert.equal(carteira.status, "pendente");
    assert.equal(carteira.passkey_id, passkey.id);
    assert.equal(carteira.passkey_chave_publica, passkey.chavePublica);
  });

  it("o investidor tem uma carteira só: a segunda é recusada e a primeira fica", async () => {
    const investidor = await criarUsuario(ambiente.banco, "investidor");
    const primeira = await criarCarteira(ambiente, investidor.id, novaPasskey());

    const segunda = await criarCarteira(ambiente, investidor.id, novaPasskey());

    assert.deepEqual(segunda, { erro: "Sua carteira já foi criada." });
    const carteiras = await carteirasDe(investidor.id);
    assert.equal(carteiras.length, 1);
    assert.ok(!("erro" in primeira));
    assert.equal(carteiras[0].endereco, primeira.endereco.toLowerCase());
  });

  for (const [descricao, passkey] of [
    ["sem id", { ...novaPasskey(), id: "" }],
    ["com id fora de base64url", { ...novaPasskey(), id: "abc/def+==" }],
    ["com chave pública curta", { ...novaPasskey(), chavePublica: "0x1234" }],
    ["com chave pública com prefixo 04", { ...novaPasskey(), chavePublica: `0x04${"ab".repeat(64)}` }],
  ] as const) {
    it(`criar carteira recusa passkey ${descricao}`, async () => {
      const investidor = await criarUsuario(ambiente.banco, "investidor");

      const resultado = await criarCarteira(ambiente, investidor.id, passkey as Passkey);

      assert.deepEqual(resultado, { erro: "A passkey criada pelo aparelho não é válida. Tente de novo." });
      assert.equal((await carteirasDe(investidor.id)).length, 0);
    });
  }

  it("só investidor cria carteira", async () => {
    const operador = await criarUsuario(ambiente.banco, "operador");

    await assert.rejects(criarCarteira(ambiente, operador.id, novaPasskey()), AcessoNegado);
    assert.equal((await carteirasDe(operador.id)).length, 0);
  });
});
