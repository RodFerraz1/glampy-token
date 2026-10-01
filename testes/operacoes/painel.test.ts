import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { getAddress } from "viem";
import { AcessoNegado } from "@/servidor/autorizacao";
import { consultarDetentores, consultarPainel } from "@/servidor/operacoes/painel";
import { confirmar, investidorComCredito, prepararAmbiente, type Ambiente } from "../ambiente";
import { contasLocais } from "../ambiente/rede-local";
import { criarUsuario } from "../ambiente/usuarios";

const UM_CREDITO = 10n ** 18n;

describe("painel do Ibiti", () => {
  let ambiente: Ambiente;
  let administrador: { id: string };
  let maria: Awaited<ReturnType<typeof investidorComCredito>>;
  let joao: Awaited<ReturnType<typeof investidorComCredito>>;
  before(async () => {
    ambiente = await prepararAmbiente();
    administrador = await criarUsuario(ambiente.banco, "administrador");
    maria = await investidorComCredito(ambiente, 3n);
    joao = await investidorComCredito(ambiente, 2n, { nomeCompleto: "João Souza" });
    // Quatro tokens da tesouraria vão para a recolocação.
    await confirmar(
      ambiente.cadeia,
      ambiente.cadeia.token.write.transfer([ambiente.cadeia.recolocacao.address, 4n], { account: contasLocais.tesouraria }),
    );
  });

  it("os detentores vêm do contrato, com a tesouraria, e os investidores são cruzados com o cadastro", async () => {
    const detentores = await consultarDetentores(ambiente, administrador.id);

    assert.deepEqual(
      detentores.map(({ endereco, tipo, nome, saldo }) => ({ endereco, tipo, nome, saldo })),
      [
        { endereco: getAddress(ambiente.cadeia.enderecos.Oferta), tipo: "oferta", nome: "Oferta", saldo: 195n },
        { endereco: getAddress(contasLocais.tesouraria.address), tipo: "tesouraria", nome: "Tesouraria", saldo: 96n },
        { endereco: getAddress(ambiente.cadeia.enderecos.Recolocacao), tipo: "recolocacao", nome: "Recolocação", saldo: 4n },
        { endereco: maria.carteira, tipo: "investidor", nome: "Maria da Silva", saldo: 3n },
        { endereco: joao.carteira, tipo: "investidor", nome: "João Souza", saldo: 2n },
      ],
    );
    assert.equal(detentores.length, Number(await ambiente.cadeia.conformidade.read.totalDeDetentores()));
    const [daMaria] = detentores.filter(({ endereco }) => endereco === maria.carteira);
    assert.equal(daMaria.titularId, maria.titularId);
  });

  it("abrir a lista nominal grava na auditoria quem consultou e quando", async () => {
    const antes = new Date();

    await consultarDetentores(ambiente, administrador.id);

    const { data } = await ambiente.banco
      .from("auditoria")
      .select("acao, entidade, criado_em")
      .eq("ator_id", administrador.id)
      .eq("acao", "consultar_detentores")
      .gte("criado_em", antes.toISOString())
      .throwOnError();
    assert.equal(data.length, 1);
    assert.equal(data[0].entidade, "detentores");
  });

  it("o painel mostra a oferta, a recolocação e o crédito do ciclo somado entre os detentores, sem nomes", async () => {
    const painel = await consultarPainel(ambiente, administrador.id);

    assert.equal(painel.detentores, 5);
    assert.equal(painel.emissaoTotal, 300n);
    assert.equal(painel.vendidosNaOferta, 5n);
    assert.equal(painel.vendidosNaRecolocacao, 0n);
    assert.equal(painel.disponivelNaOferta, 195n);
    assert.equal(painel.disponivelNaRecolocacao, 4n);
    assert.equal(painel.naTesouraria, 96n);
    assert.equal(painel.comInvestidores, 5n);
    assert.equal(painel.creditoDoCiclo.direito, 5n * UM_CREDITO);
    assert.equal(painel.creditoDoCiclo.consumido, 0n);
    assert.equal(painel.cicloDeBeneficios.atual, 1);
    assert.equal(
      painel.cicloDeBeneficios.fim?.getTime(),
      Number(await ambiente.cadeia.ibitiPass.read.fimDoCiclo()) * 1000,
    );
    assert.equal(painel.apuracoes.faltam, 48 - painel.apuracoes.registradas);
    assert.ok(!("nome" in painel));
  });

  it("só o administrador vê o painel e a lista nominal", async () => {
    const investidor = await criarUsuario(ambiente.banco, "investidor");

    await assert.rejects(consultarPainel(ambiente, investidor.id), AcessoNegado);
    await assert.rejects(consultarDetentores(ambiente, investidor.id), AcessoNegado);
  });
});
