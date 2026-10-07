import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { getAddress } from "viem";
import { AcessoNegado } from "@/servidor/autorizacao";
import {
  abrirPedido,
  analisarPedido,
  anunciarReatribuicao,
  cancelarAnunciada,
  executarReatribuicao,
  listarMeusPedidos,
  listarPedidos,
} from "@/servidor/operacoes/reatribuicao";
import { investidorAprovado, investidorComCredito, prepararAmbiente, type Ambiente } from "../ambiente";
import { novaPasskey } from "../ambiente/passkey";
import { comRelogioAdiantado } from "../ambiente/rede-local";
import { criarUsuario } from "../ambiente/usuarios";

const SETE_DIAS = 7 * 86_400;

describe("reatribuição: pedido e execução on-chain", () => {
  let ambiente: Ambiente;
  let administrador: { id: string };
  before(async () => {
    ambiente = await prepararAmbiente();
    administrador = await criarUsuario(ambiente.banco, "administrador");
  });

  /** O herdeiro, com conta e carteira habilitada, pede a posição do titular falecido. */
  async function pedidoDeSucessao() {
    const falecido = await investidorComCredito(ambiente, 4n, { nomeCompleto: "Otávio Original" });
    const herdeiro = await investidorComCredito(ambiente, 1n, { nomeCompleto: "Helena Herdeira" });
    const pedido = await abrirPedido(ambiente, herdeiro.id, {
      motivo: "sucessao",
      carteiraDeOrigem: falecido.carteira,
      justificativa: "Inventário concluído; sou a única herdeira.",
    });
    assert.ok(!("erro" in pedido), "erro" in pedido ? pedido.erro : "");
    return { falecido, herdeiro, id: pedido.id };
  }

  const linha = async (id: string) =>
    (await ambiente.banco.from("reatribuicoes").select().eq("id", id).single().throwOnError()).data;

  const acoesAuditadas = async (id: string) =>
    (
      await ambiente.banco.from("auditoria").select("acao").eq("entidade", "reatribuicoes").eq("entidade_id", id).order("id").throwOnError()
    ).data.map(({ acao }) => acao);

  describe("pedido de recuperação ou sucessão", () => {
    it("abrir cria o pedido aberto com a posição on-chain, o motivo e a justificativa", async () => {
      const { falecido, herdeiro, id } = await pedidoDeSucessao();

      const pedido = await linha(id);
      assert.equal(pedido.status, "aberta");
      assert.equal(pedido.motivo, "sucessao");
      assert.equal(pedido.titular_id, falecido.titularId);
      assert.equal(pedido.aberto_por, herdeiro.id);
      assert.equal(pedido.carteira_origem, falecido.carteira.toLowerCase());
      assert.equal(pedido.carteira_destino, herdeiro.carteira.toLowerCase());
      assert.equal(pedido.quantidade, 4);
      assert.equal(pedido.justificativa, "Inventário concluído; sou a única herdeira.");
      assert.deepEqual(
        (await listarMeusPedidos(ambiente, falecido.id)).map((meu) => ({ id: meu.id, status: meu.status, titular: meu.titular })),
        [{ id, status: "aberta", titular: "Otávio Original" }],
      );
      // Quem pede a sucessão de outro não descobre por aqui o nome do titular.
      assert.deepEqual(
        (await listarMeusPedidos(ambiente, herdeiro.id)).map((meu) => ({ id: meu.id, titular: meu.titular })),
        [{ id, titular: null }],
      );
    });

    it("na perda de acesso, a origem é a própria carteira e o destino é a Safe de uma passkey nova", async () => {
      const titular = await investidorComCredito(ambiente, 2n);
      const passkey = novaPasskey();

      const pedido = await abrirPedido(ambiente, titular.id, {
        motivo: "perda_de_acesso",
        passkey,
        justificativa: "Perdi o aparelho com a passkey.",
      });

      assert.ok(!("erro" in pedido));
      const aberto = await linha(pedido.id);
      assert.equal(aberto.carteira_origem, titular.carteira.toLowerCase());
      assert.notEqual(aberto.carteira_destino, titular.carteira.toLowerCase());
      assert.equal(aberto.passkey_id, passkey.id);
      assert.equal(aberto.titular_id, titular.titularId);
    });

    it("recusa pedido sem justificativa, sem posição ou com passkey inválida, sem revelar quem é da plataforma", async () => {
      const titular = await investidorComCredito(ambiente, 1n);
      const semPosicao = await investidorAprovado(ambiente);
      const semPosicaoNaPlataforma = { erro: "Não há posição na plataforma para reatribuir a partir desta carteira." };

      assert.deepEqual(
        await abrirPedido(ambiente, titular.id, { motivo: "sucessao", carteiraDeOrigem: semPosicao.carteira, justificativa: " " }),
        { erro: "Explique o pedido na justificativa." },
      );
      for (const carteiraDeOrigem of ["0x000000000000000000000000000000000000dEaD", semPosicao.carteira]) {
        assert.deepEqual(
          await abrirPedido(ambiente, titular.id, { motivo: "sucessao", carteiraDeOrigem, justificativa: "x" }),
          semPosicaoNaPlataforma,
        );
      }
      assert.deepEqual(
        await abrirPedido(ambiente, titular.id, { motivo: "sucessao", carteiraDeOrigem: titular.carteira, justificativa: "x" }),
        { erro: "Informe a carteira do titular, não a sua." },
      );
      assert.deepEqual(
        await abrirPedido(ambiente, titular.id, {
          motivo: "perda_de_acesso",
          passkey: { id: "x", chavePublica: "0x1234" },
          justificativa: "x",
        }),
        { erro: "A passkey criada pelo aparelho não é válida. Tente de novo." },
      );
    });

    it("o Ibiti põe em análise e recusa com parecer, e o pedido recusado não volta", async () => {
      const { herdeiro, id } = await pedidoDeSucessao();

      assert.ok(!("erro" in (await analisarPedido(ambiente, administrador.id, id, { status: "em_analise", parecer: "" }))));
      assert.deepEqual(await analisarPedido(ambiente, administrador.id, id, { status: "recusada", parecer: " " }), {
        erro: "Informe o parecer da decisão.",
      });
      const recusa = await analisarPedido(ambiente, administrador.id, id, {
        status: "recusada",
        parecer: "Falta a certidão de óbito.",
      });

      assert.deepEqual(recusa, { status: "recusada" });
      const recusado = await linha(id);
      assert.equal(recusado.parecer, "Falta a certidão de óbito.");
      assert.equal(recusado.analisado_por, administrador.id);
      assert.ok(recusado.analisado_em);
      assert.deepEqual(await analisarPedido(ambiente, administrador.id, id, { status: "cancelada", parecer: "x" }), {
        erro: "Este pedido já foi encerrado.",
      });
      const [meu] = await listarMeusPedidos(ambiente, herdeiro.id);
      assert.equal(meu.status, "recusada");
      assert.equal(meu.parecer, "Falta a certidão de óbito.");
      assert.deepEqual(await acoesAuditadas(id), ["abrir_reatribuicao", "analisar_reatribuicao", "analisar_reatribuicao"]);
    });

    it("só o investidor abre e só o administrador analisa", async () => {
      const { herdeiro, id } = await pedidoDeSucessao();

      await assert.rejects(analisarPedido(ambiente, herdeiro.id, id, { status: "em_analise", parecer: "" }), AcessoNegado);
      await assert.rejects(listarPedidos(ambiente, herdeiro.id), AcessoNegado);
      await assert.rejects(
        abrirPedido(ambiente, administrador.id, { motivo: "perda_de_acesso", passkey: novaPasskey(), justificativa: "x" }),
        AcessoNegado,
      );
    });
  });

  describe("anúncio e execução on-chain", () => {
    async function emAnalise() {
      const pedido = await pedidoDeSucessao();
      await analisarPedido(ambiente, administrador.id, pedido.id, { status: "em_analise", parecer: "" });
      return pedido;
    }

    it("anunciar grava o id on-chain, a transação e a data a partir da qual pode executar", async () => {
      const { id } = await emAnalise();

      const anuncio = await anunciarReatribuicao(ambiente, administrador.id, id);

      assert.ok(!("erro" in anuncio), "erro" in anuncio ? anuncio.erro : "");
      assert.equal(anuncio.assinaturas, 3);
      const anunciado = await linha(id);
      assert.equal(anunciado.status, "anunciada");
      assert.equal(anunciado.tx_anuncio, anuncio.txHash);
      const noContrato = await ambiente.cadeia.token.read.reatribuicaoDe([BigInt(anunciado.id_on_chain!)]);
      assert.equal(noContrato.quantidade, 4n);
      assert.equal(new Date(anunciado.executavel_apos!).getTime(), (Number(noContrato.anunciadaEm) + SETE_DIAS) * 1000);
      assert.deepEqual((await acoesAuditadas(id)).at(-1), "anunciar_reatribuicao");
    });

    it("executar antes dos 7 dias é recusado; depois, move a posição e grava a transação", async () => {
      const { falecido, herdeiro, id } = await emAnalise();
      await anunciarReatribuicao(ambiente, administrador.id, id);

      const cedo = await executarReatribuicao(ambiente, administrador.id, id);
      assert.ok("erro" in cedo);
      assert.match(cedo.erro, /^A espera de 7 dias termina em /);
      assert.equal((await linha(id)).status, "anunciada");

      await comRelogioAdiantado(SETE_DIAS + 1, async () => {
        const execucao = await executarReatribuicao(ambiente, administrador.id, id);

        assert.ok(!("erro" in execucao), "erro" in execucao ? execucao.erro : "");
        const executado = await linha(id);
        assert.equal(executado.status, "executada");
        assert.equal(executado.tx_execucao, execucao.txHash);
        assert.equal(await ambiente.cadeia.token.read.balanceOf([falecido.carteira]), 0n);
        assert.equal(await ambiente.cadeia.token.read.balanceOf([herdeiro.carteira]), 5n);
      });
      assert.deepEqual((await acoesAuditadas(id)).at(-1), "executar_reatribuicao");
    });

    it("na perda de acesso, a Safe nova é habilitada no anúncio e vira a carteira do titular na execução", async () => {
      const titular = await investidorComCredito(ambiente, 3n);
      const pedido = await abrirPedido(ambiente, titular.id, {
        motivo: "perda_de_acesso",
        passkey: novaPasskey(),
        justificativa: "Perdi o aparelho.",
      });
      assert.ok(!("erro" in pedido));
      const nova = getAddress((await linha(pedido.id)).carteira_destino);
      await analisarPedido(ambiente, administrador.id, pedido.id, { status: "em_analise", parecer: "" });

      assert.ok(!("erro" in (await anunciarReatribuicao(ambiente, administrador.id, pedido.id))));
      assert.equal(await ambiente.cadeia.registro.read.titularDe([nova]), titular.identificador);

      await comRelogioAdiantado(SETE_DIAS + 1, async () => {
        assert.ok(!("erro" in (await executarReatribuicao(ambiente, administrador.id, pedido.id))));
        assert.equal(await ambiente.cadeia.token.read.balanceOf([nova]), 3n);
        assert.equal(await ambiente.cadeia.token.read.balanceOf([titular.carteira]), 0n);
        assert.equal(await ambiente.cadeia.registro.read.habilitado([titular.carteira]), false);
        const { data } = await ambiente.banco
          .from("carteiras")
          .select("endereco, status")
          .eq("perfil_id", titular.id)
          .single()
          .throwOnError();
        assert.deepEqual(data, { endereco: nova.toLowerCase(), status: "habilitada" });
      });
    });

    it("uma reatribuição anunciada é cancelada on-chain com parecer", async () => {
      const { id } = await emAnalise();
      await anunciarReatribuicao(ambiente, administrador.id, id);

      assert.deepEqual(await cancelarAnunciada(ambiente, administrador.id, id, { parecer: " " }), {
        erro: "Informe o parecer da decisão.",
      });
      const cancelamento = await cancelarAnunciada(ambiente, administrador.id, id, { parecer: "Contestação procedente." });

      assert.ok(!("erro" in cancelamento));
      const cancelado = await linha(id);
      assert.equal(cancelado.status, "cancelada");
      assert.equal(cancelado.parecer, "Contestação procedente.");
      assert.equal((await ambiente.cadeia.token.read.reatribuicaoDe([BigInt(cancelado.id_on_chain!)])).encerrada, true);
    });

    it("só anuncia pedido em análise e só executa pedido anunciado", async () => {
      const { id } = await pedidoDeSucessao();

      assert.deepEqual(await anunciarReatribuicao(ambiente, administrador.id, id), {
        erro: "Só um pedido em análise pode ser anunciado.",
      });
      assert.deepEqual(await executarReatribuicao(ambiente, administrador.id, id), {
        erro: "Só uma reatribuição anunciada pode ser executada.",
      });
    });
  });

  it("o pedido do investidor mostra a data em que pode ser executado", async () => {
    const pedido = await pedidoDeSucessao();
    await analisarPedido(ambiente, administrador.id, pedido.id, { status: "em_analise", parecer: "" });
    await anunciarReatribuicao(ambiente, administrador.id, pedido.id);

    const [meu] = await listarMeusPedidos(ambiente, pedido.herdeiro.id);

    assert.equal(meu.status, "anunciada");
    assert.ok(meu.executavelApos instanceof Date);
  });
});
