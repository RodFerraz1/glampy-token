import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { zeroHash } from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";
import { VERSAO_DA_DECLARACAO } from "@/declaracao-investidor-profissional";
import { criarCadeia } from "@/servidor/adaptadores/cadeia";
import { AcessoNegado } from "@/servidor/autorizacao";
import {
  aprovarCadastro,
  desabilitarCarteira,
  detalharCadastro,
  habilitarCarteira,
  listarCadastros,
  reprovarCadastro,
} from "@/servidor/operacoes/analise-de-cadastro";
import { consultarCadastro } from "@/servidor/operacoes/cadastro";
import { consultarCarteira } from "@/servidor/operacoes/carteira";
import { investidorEmAnalise, prepararAmbiente, type Ambiente } from "../ambiente";
import { RPC_LOCAL } from "../ambiente/rede-local";
import { criarUsuario } from "../ambiente/usuarios";

describe("análise do cadastro e habilitação on-chain", () => {
  let ambiente: Ambiente;
  let administrador: string;
  before(async () => {
    ambiente = await prepararAmbiente();
    administrador = (await criarUsuario(ambiente.banco, "administrador")).id;
  });

  const cadastroEmAnalise = () => investidorEmAnalise(ambiente);

  /** Mesma rede e contratos, mas com uma conta agente sem `AGENTE_REGISTRO`. */
  const cadeiaSemPapel = () =>
    criarCadeia({
      chain: hardhat,
      rpcUrl: RPC_LOCAL,
      agente: mnemonicToAccount("test test test test test test test test test test test junk", { addressIndex: 9 }),
      enderecos: ambiente.cadeia.enderecos,
      blocoInicial: 0n,
    });

  const titular = async (id: string) =>
    (await ambiente.banco.from("titulares").select().eq("id", id).single().throwOnError()).data;

  const carteiraDe = async (perfilId: string) =>
    (await ambiente.banco.from("carteiras").select().eq("perfil_id", perfilId).single().throwOnError()).data;

  const transacoesDe = async (perfilId: string) =>
    (await ambiente.banco.from("transacoes").select().eq("perfil_id", perfilId).order("criado_em").throwOnError()).data;

  const auditoriaDe = async (entidadeId: string) =>
    (
      await ambiente.banco
        .from("auditoria")
        .select("ator_id, acao, dados")
        .eq("entidade_id", entidadeId)
        .order("id")
        .throwOnError()
    ).data;

  const titularOnChain = (endereco: `0x${string}`) => ambiente.cadeia.registro.read.titularDe([endereco]);

  it("a fila lista o cadastro em análise, e o detalhe traz os dados, a declaração e a carteira", async () => {
    const investidor = await cadastroEmAnalise();

    const fila = await listarCadastros(ambiente, administrador);
    const item = fila.find((cadastro) => cadastro.id === investidor.titularId);
    assert.equal(item?.status, "em_analise");
    assert.equal(item?.nomeCompleto, "Maria da Silva");

    const detalhe = await detalharCadastro(ambiente, administrador, investidor.titularId);
    assert.equal(detalhe?.email, investidor.email);
    assert.equal(detalhe?.dataNascimento, "1980-05-17");
    assert.equal(detalhe?.declaracao.versao, VERSAO_DA_DECLARACAO);
    assert.ok(detalhe?.declaracao.aceitaEm);
    assert.equal(detalhe?.carteira.endereco, investidor.carteira);
    assert.equal(detalhe?.carteira.status, "pendente");
  });

  it("aprovar habilita a carteira on-chain com o identificador do titular e registra a transação", async () => {
    const investidor = await cadastroEmAnalise();

    const resultado = await aprovarCadastro(ambiente, administrador, investidor.titularId);

    assert.ok(!("erro" in resultado));
    assert.equal(await titularOnChain(investidor.carteira), investidor.identificador);
    assert.equal((await titular(investidor.titularId)).status, "aprovado");
    assert.equal((await titular(investidor.titularId)).analisado_por, administrador);
    const carteira = await carteiraDe(investidor.id);
    assert.equal(carteira.status, "habilitada");
    assert.ok(carteira.habilitada_em);
    const [transacao, ...outras] = await transacoesDe(investidor.id);
    assert.equal(outras.length, 0);
    assert.equal(transacao.tipo, "habilitacao");
    assert.equal(transacao.status, "confirmada");
    assert.equal(transacao.tx_hash, resultado.txHash);
    assert.equal(transacao.carteira_id, carteira.id);
    assert.deepEqual(
      (await auditoriaDe(investidor.titularId)).map(({ ator_id, acao }) => [ator_id, acao]),
      [
        [administrador, "aprovar_cadastro"],
        [administrador, "habilitar_carteira"],
      ],
    );
  });

  it("o investidor aprovado vê o cadastro aprovado e o hash da habilitação", async () => {
    const investidor = await cadastroEmAnalise();
    const resultado = await aprovarCadastro(ambiente, administrador, investidor.titularId);
    assert.ok(!("erro" in resultado));

    assert.equal((await consultarCadastro(ambiente, investidor.id))?.status, "aprovado");
    const carteira = await consultarCarteira(ambiente, investidor.id);
    assert.equal(carteira?.status, "habilitada");
    assert.equal(carteira?.txHabilitacao, resultado.txHash);
  });

  it("o cadastro só é analisado uma vez", async () => {
    const investidor = await cadastroEmAnalise();
    await aprovarCadastro(ambiente, administrador, investidor.titularId);

    assert.deepEqual(await aprovarCadastro(ambiente, administrador, investidor.titularId), {
      erro: "Este cadastro não está em análise.",
    });
    assert.deepEqual(await reprovarCadastro(ambiente, administrador, investidor.titularId, { motivo: "qualquer" }), {
      erro: "Este cadastro não está em análise.",
    });
    assert.equal((await titular(investidor.titularId)).status, "aprovado");
  });

  it("reprovar sem motivo é recusado e o cadastro continua em análise", async () => {
    const investidor = await cadastroEmAnalise();

    const resultado = await reprovarCadastro(ambiente, administrador, investidor.titularId, { motivo: "   " });

    assert.deepEqual(resultado, { erro: "Informe o motivo da reprovação." });
    assert.equal((await titular(investidor.titularId)).status, "em_analise");
    assert.deepEqual(await auditoriaDe(investidor.titularId), []);
  });

  it("reprovar grava o motivo, o investidor vê o motivo e a carteira não é habilitada", async () => {
    const investidor = await cadastroEmAnalise();

    const resultado = await reprovarCadastro(ambiente, administrador, investidor.titularId, {
      motivo: "  Declaração de investidor profissional incompatível com o patrimônio.  ",
    });

    assert.deepEqual(resultado, { status: "reprovado" });
    assert.deepEqual(await consultarCadastro(ambiente, investidor.id), {
      status: "reprovado",
      motivoReprovacao: "Declaração de investidor profissional incompatível com o patrimônio.",
    });
    assert.equal((await carteiraDe(investidor.id)).status, "pendente");
    assert.equal(await titularOnChain(investidor.carteira), zeroHash);
    const [registro] = await auditoriaDe(investidor.titularId);
    assert.equal(registro.acao, "reprovar_cadastro");
    assert.deepEqual(registro.dados, { motivo: "Declaração de investidor profissional incompatível com o patrimônio." });
  });

  it("se a habilitação falha, o cadastro fica aprovado, a carteira pendente e o erro aparece no detalhe", async () => {
    const investidor = await cadastroEmAnalise();

    const resultado = await aprovarCadastro({ ...ambiente, cadeia: cadeiaSemPapel() }, administrador, investidor.titularId);

    assert.ok("erro" in resultado);
    assert.match(resultado.erro, /AccessControlUnauthorizedAccount/);
    assert.equal((await titular(investidor.titularId)).status, "aprovado");
    assert.equal((await carteiraDe(investidor.id)).status, "pendente");
    assert.equal(await titularOnChain(investidor.carteira), zeroHash);
    const detalhe = await detalharCadastro(ambiente, administrador, investidor.titularId);
    assert.equal(detalhe?.carteira.erroHabilitacao, resultado.erro);
    const fila = await listarCadastros(ambiente, administrador);
    assert.equal(fila.find((cadastro) => cadastro.id === investidor.titularId)?.habilitacaoFalhou, true);
    const tentativa = (await auditoriaDe(investidor.titularId)).at(-1);
    assert.equal(tentativa?.acao, "habilitar_carteira");
    assert.deepEqual(tentativa?.dados, { endereco: investidor.carteira, erro: resultado.erro });
  });

  it("tentar de novo depois da falha habilita a carteira e limpa o erro", async () => {
    const investidor = await cadastroEmAnalise();
    await aprovarCadastro({ ...ambiente, cadeia: cadeiaSemPapel() }, administrador, investidor.titularId);

    const resultado = await habilitarCarteira(ambiente, administrador, investidor.titularId);

    assert.ok(!("erro" in resultado));
    assert.equal(await titularOnChain(investidor.carteira), investidor.identificador);
    const carteira = await carteiraDe(investidor.id);
    assert.equal(carteira.status, "habilitada");
    assert.equal(carteira.erro_habilitacao, null);
    assert.deepEqual(
      (await transacoesDe(investidor.id)).map(({ tipo, status, tx_hash }) => [tipo, status, tx_hash]),
      [["habilitacao", "confirmada", resultado.txHash]],
    );
    assert.deepEqual(
      (await auditoriaDe(investidor.titularId)).map(({ acao }) => acao),
      ["aprovar_cadastro", "habilitar_carteira", "habilitar_carteira"],
    );
  });

  it("tentar de novo só vale para cadastro aprovado com a carteira pendente", async () => {
    const emAnalise = await cadastroEmAnalise();
    const habilitado = await cadastroEmAnalise();
    await aprovarCadastro(ambiente, administrador, habilitado.titularId);

    assert.deepEqual(await habilitarCarteira(ambiente, administrador, emAnalise.titularId), {
      erro: "Só um cadastro aprovado com a carteira pendente pode ser habilitado.",
    });
    assert.deepEqual(await habilitarCarteira(ambiente, administrador, habilitado.titularId), {
      erro: "Só um cadastro aprovado com a carteira pendente pode ser habilitado.",
    });
    assert.equal(await titularOnChain(emAnalise.carteira), zeroHash);
  });

  it("desabilitar exige motivo", async () => {
    const investidor = await cadastroEmAnalise();
    await aprovarCadastro(ambiente, administrador, investidor.titularId);

    const resultado = await desabilitarCarteira(ambiente, administrador, investidor.titularId, { motivo: "" });

    assert.deepEqual(resultado, { erro: "Informe o motivo da desabilitação." });
    assert.equal(await titularOnChain(investidor.carteira), investidor.identificador);
    assert.equal((await carteiraDe(investidor.id)).status, "habilitada");
  });

  it("desabilitar com motivo chama desabilitar on-chain, registra a transação e a auditoria", async () => {
    const investidor = await cadastroEmAnalise();
    await aprovarCadastro(ambiente, administrador, investidor.titularId);

    const resultado = await desabilitarCarteira(ambiente, administrador, investidor.titularId, {
      motivo: "Pedido do próprio investidor",
    });

    assert.ok(!("erro" in resultado));
    assert.equal(await titularOnChain(investidor.carteira), zeroHash);
    const carteira = await carteiraDe(investidor.id);
    assert.equal(carteira.status, "desabilitada");
    assert.ok(carteira.desabilitada_em);
    const desabilitacao = (await transacoesDe(investidor.id)).at(-1);
    assert.equal(desabilitacao?.tipo, "desabilitacao");
    assert.equal(desabilitacao?.status, "confirmada");
    assert.equal(desabilitacao?.tx_hash, resultado.txHash);
    const registro = (await auditoriaDe(investidor.titularId)).at(-1);
    assert.equal(registro?.acao, "desabilitar_carteira");
    assert.deepEqual(registro?.dados, {
      endereco: investidor.carteira,
      motivo: "Pedido do próprio investidor",
      txHash: resultado.txHash,
    });
  });

  it("desabilitar uma carteira que não está habilitada é recusado", async () => {
    const investidor = await cadastroEmAnalise();

    const resultado = await desabilitarCarteira(ambiente, administrador, investidor.titularId, { motivo: "Teste" });

    assert.deepEqual(resultado, { erro: "A carteira deste cadastro não está habilitada." });
  });

  it("só administrador analisa cadastros", async () => {
    const investidor = await cadastroEmAnalise();

    for (const operacao of [
      () => listarCadastros(ambiente, investidor.id),
      () => detalharCadastro(ambiente, investidor.id, investidor.titularId),
      () => aprovarCadastro(ambiente, investidor.id, investidor.titularId),
      () => reprovarCadastro(ambiente, investidor.id, investidor.titularId, { motivo: "x" }),
      () => habilitarCarteira(ambiente, investidor.id, investidor.titularId),
      () => desabilitarCarteira(ambiente, investidor.id, investidor.titularId, { motivo: "x" }),
    ]) {
      await assert.rejects(operacao(), AcessoNegado);
    }
    assert.equal((await titular(investidor.titularId)).status, "em_analise");
  });
});
