import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { keccak256, toBytes } from "viem";
import { CONTEUDO_DA_VERSAO_1 } from "@/catalogo/versao-1";
import { AcessoNegado } from "@/servidor/autorizacao";
import {
  criarBeneficio,
  editarBeneficio,
  importarVersaoInicial,
  listarBeneficios,
  listarVersoes,
  publicarCatalogo,
} from "@/servidor/operacoes/catalogo";
import { confirmar, limparCatalogo, prepararAmbiente, type Ambiente } from "../ambiente";
import { criarUsuario } from "../ambiente/usuarios";

const HASH_DA_VERSAO_1 = "0xbe694337fdbd92e1eb33bd8f0e7573166378fed7559ba439fc5a2dd571270a3e";

const NOVO = {
  nome: "Trilha do Pico do Pião",
  descricao: "Com guia, até 4 pessoas",
  categoria: "Passeios",
  imagemUrl: "https://ibiti.com.br/pico.jpg",
  precoTabelaCentavos: 123_45,
  ativo: true,
};

describe("catálogo de benefícios", () => {
  let ambiente: Ambiente;
  let administrador: { id: string };
  beforeEach(async () => {
    ambiente = await prepararAmbiente();
    await limparCatalogo(ambiente.banco);
    administrador = await criarUsuario(ambiente.banco, "administrador");
  });

  /** Como a Sprint 04 fez na Sepolia: o hash do arquivo do catálogo como versão 1. */
  const publicarVersao1NaCadeia = (hash = keccak256(toBytes(CONTEUDO_DA_VERSAO_1))) =>
    confirmar(ambiente.cadeia, ambiente.cadeia.ibitiPass.write.publicarCatalogo([hash]));

  const versaoNoBanco = async (versao: number) =>
    (await ambiente.banco.from("catalogo_versoes").select().eq("versao", versao).single().throwOnError()).data;

  const acoesAuditadas = async () =>
    (await ambiente.banco.from("auditoria").select("acao").eq("ator_id", administrador.id).order("id").throwOnError()).data.map(
      ({ acao }) => acao,
    );

  it("o hash da versão 1 é o que a Sprint 04 publicou na Sepolia", () => {
    assert.equal(keccak256(toBytes(CONTEUDO_DA_VERSAO_1)), HASH_DA_VERSAO_1);
  });

  it("importa a versão 1 publicada, com o hash igual ao do contrato e os preços da tabela", async () => {
    const txPublicacao = await publicarVersao1NaCadeia();

    const importacao = await importarVersaoInicial(ambiente, administrador.id);

    assert.deepEqual(importacao, { versao: 1, beneficios: 120 });
    const versao = await versaoNoBanco(1);
    assert.equal(versao.hash_tabela, await ambiente.cadeia.ibitiPass.read.catalogoDaVersao([1]));
    assert.equal(versao.hash_tabela, HASH_DA_VERSAO_1);
    assert.equal(versao.conteudo, CONTEUDO_DA_VERSAO_1);
    assert.equal(versao.tx_publicacao, txPublicacao);

    const beneficios = await listarBeneficios(ambiente, administrador.id);
    assert.equal(beneficios.length, 120);
    const craniossacral = beneficios.find(({ nome }) => nome === "Quick craniossacral (30 min)");
    assert.ok(craniossacral);
    assert.equal(craniossacral.categoria, "Wellness");
    assert.equal(craniossacral.descricao, "Village Spa, por pessoa");
    assert.equal(craniossacral.precoTabelaCentavos, 300_00);
    assert.equal(craniossacral.precoCentavos, 180_00);
    const { data: precos } = await ambiente.banco
      .from("precos_beneficio")
      .select("preco_centavos")
      .eq("versao", 1)
      .eq("beneficio_id", craniossacral.id)
      .throwOnError();
    assert.deepEqual(precos, [{ preco_centavos: 180_00 }]);
    assert.deepEqual(await acoesAuditadas(), ["importar_catalogo"]);
  });

  it("a importação é recusada se o hash on-chain não confere ou se já foi feita", async () => {
    assert.deepEqual(await importarVersaoInicial(ambiente, administrador.id), {
      erro: "A versão 1 do catálogo não está publicada no contrato.",
    });

    await publicarVersao1NaCadeia(keccak256(toBytes("outra tabela")));
    const recusa = await importarVersaoInicial(ambiente, administrador.id);
    assert.ok("erro" in recusa);
    assert.match(recusa.erro, /não confere/);
    assert.deepEqual(await listarVersoes(ambiente), []);
  });

  it("importar duas vezes é recusado", async () => {
    await publicarVersao1NaCadeia();
    await importarVersaoInicial(ambiente, administrador.id);

    assert.deepEqual(await importarVersaoInicial(ambiente, administrador.id), {
      erro: "O catálogo já tem versões importadas ou publicadas.",
    });
  });

  it("cria, edita e desativa benefícios, com o resgate a 60% da tabela", async () => {
    const criado = await criarBeneficio(ambiente, administrador.id, NOVO);
    assert.ok(!("erro" in criado));

    let [beneficio] = await listarBeneficios(ambiente, administrador.id);
    assert.equal(beneficio.id, criado.id);
    assert.equal(beneficio.nome, NOVO.nome);
    assert.equal(beneficio.imagemUrl, NOVO.imagemUrl);
    assert.equal(beneficio.precoTabelaCentavos, 123_45);
    assert.equal(beneficio.precoCentavos, 74_07);
    assert.match(beneficio.item, /^0x[0-9a-f]{64}$/);

    const edicao = await editarBeneficio(ambiente, administrador.id, criado.id, {
      ...NOVO,
      nome: "Trilha do Pião",
      precoTabelaCentavos: 200_00,
    });
    assert.ok(!("erro" in edicao));
    [beneficio] = await listarBeneficios(ambiente, administrador.id);
    assert.equal(beneficio.nome, "Trilha do Pião");
    assert.equal(beneficio.precoCentavos, 120_00);

    await editarBeneficio(ambiente, administrador.id, criado.id, { ...NOVO, precoTabelaCentavos: 200_00, ativo: false });
    [beneficio] = await listarBeneficios(ambiente, administrador.id);
    assert.equal(beneficio.ativo, false);
    assert.deepEqual(await acoesAuditadas(), ["criar_beneficio", "editar_beneficio", "editar_beneficio"]);
  });

  it("recusa benefício sem nome, com categoria fora da lista, preço inválido ou imagem que não é link", async () => {
    for (const [dados, erro] of [
      [{ ...NOVO, nome: " " }, "Informe o nome do benefício."],
      [{ ...NOVO, categoria: "Compras" }, "Escolha uma categoria da lista."],
      [{ ...NOVO, precoTabelaCentavos: 0 }, "Informe o preço de tabela."],
      [{ ...NOVO, precoTabelaCentavos: 10.5 }, "Informe o preço de tabela."],
      [{ ...NOVO, imagemUrl: "javascript:alert(1)" }, "A imagem precisa ser um link http ou https."],
    ] as const) {
      assert.deepEqual(await criarBeneficio(ambiente, administrador.id, dados), { erro });
    }
    assert.deepEqual(await listarBeneficios(ambiente, administrador.id), []);
  });

  it("publicar grava no banco o mesmo hash que ficou no contrato, com os preços dos ativos", async () => {
    await publicarVersao1NaCadeia();
    await importarVersaoInicial(ambiente, administrador.id);
    const [primeiro] = await listarBeneficios(ambiente, administrador.id);
    await editarBeneficio(ambiente, administrador.id, primeiro.id, {
      nome: primeiro.nome,
      descricao: primeiro.descricao ?? "",
      categoria: primeiro.categoria,
      imagemUrl: "",
      precoTabelaCentavos: primeiro.precoTabelaCentavos,
      ativo: false,
    });
    const novo = await criarBeneficio(ambiente, administrador.id, NOVO);
    assert.ok(!("erro" in novo));

    const publicacao = await publicarCatalogo(ambiente, administrador.id);

    assert.ok(!("erro" in publicacao));
    assert.equal(publicacao.versao, 2);
    assert.equal(await ambiente.cadeia.ibitiPass.read.versaoDoCatalogo(), 2);
    const versao = await versaoNoBanco(2);
    assert.equal(versao.hash_tabela, await ambiente.cadeia.ibitiPass.read.catalogoDaVersao([2]));
    assert.equal(versao.hash_tabela, keccak256(toBytes(versao.conteudo)));
    assert.equal(versao.tx_publicacao, publicacao.txHash);

    const { data: precos } = await ambiente.banco
      .from("precos_beneficio")
      .select("beneficio_id, preco_centavos")
      .eq("versao", 2)
      .throwOnError();
    assert.equal(precos.length, 120);
    assert.ok(!precos.some(({ beneficio_id }) => beneficio_id === primeiro.id));
    assert.ok(precos.some(({ beneficio_id, preco_centavos }) => beneficio_id === novo.id && preco_centavos === 74_07));

    assert.deepEqual(
      (await listarVersoes(ambiente)).map(({ versao, hashTabela, txPublicacao }) => ({
        versao,
        hashTabela,
        txPublicacao,
      })),
      [
        { versao: 2, hashTabela: versao.hash_tabela, txPublicacao: publicacao.txHash },
        { versao: 1, hashTabela: HASH_DA_VERSAO_1, txPublicacao: (await versaoNoBanco(1)).tx_publicacao },
      ],
    );
    assert.deepEqual((await acoesAuditadas()).at(-1), "publicar_catalogo");
  });

  it("publicar sem mudança desde a versão vigente, ou sem benefício ativo, é recusado", async () => {
    assert.deepEqual(await publicarCatalogo(ambiente, administrador.id), {
      erro: "Não há benefício ativo para publicar.",
    });

    await criarBeneficio(ambiente, administrador.id, NOVO);
    const primeira = await publicarCatalogo(ambiente, administrador.id);
    assert.ok(!("erro" in primeira));
    assert.equal(primeira.versao, 1);

    assert.deepEqual(await publicarCatalogo(ambiente, administrador.id), {
      erro: "Nada mudou desde a versão 1.",
    });
    assert.equal(await ambiente.cadeia.ibitiPass.read.versaoDoCatalogo(), 1);
  });

  it("publicar é recusado quando o contrato tem uma versão que o banco não tem", async () => {
    await publicarVersao1NaCadeia();
    await importarVersaoInicial(ambiente, administrador.id);
    await publicarVersao1NaCadeia(keccak256(toBytes("publicada por fora")));

    assert.deepEqual(await publicarCatalogo(ambiente, administrador.id), {
      erro: "O contrato está na versão 2 do catálogo e o banco, na 1. Resolva a divergência antes de publicar.",
    });
    assert.equal(await ambiente.cadeia.ibitiPass.read.versaoDoCatalogo(), 2);
  });

  it("só o administrador mexe no catálogo", async () => {
    const investidor = await criarUsuario(ambiente.banco, "investidor");

    for (const operacao of [
      () => listarBeneficios(ambiente, investidor.id),
      () => criarBeneficio(ambiente, investidor.id, NOVO),
      () => editarBeneficio(ambiente, investidor.id, crypto.randomUUID(), NOVO),
      () => publicarCatalogo(ambiente, investidor.id),
      () => importarVersaoInicial(ambiente, investidor.id),
    ]) {
      await assert.rejects(operacao(), AcessoNegado);
    }
  });
});
