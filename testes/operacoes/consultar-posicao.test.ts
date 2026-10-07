import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { AcessoNegado } from "@/servidor/autorizacao";
import { consultarPosicao } from "@/servidor/operacoes/consultar-posicao";
import {
  comprarComCarteiraHabilitada,
  confirmar,
  investidorAprovado,
  investidorComCarteira,
  investidorEmAnalise,
  prepararAmbiente,
  type Ambiente,
} from "../ambiente";
import { contasLocais } from "../ambiente/rede-local";
import { criarUsuario } from "../ambiente/usuarios";

const DEPOIS_DA_OFERTA = new Date("2027-01-01T00:00:00Z");

describe("consultar posição", () => {
  let ambiente: Ambiente;
  before(async () => {
    ambiente = await prepararAmbiente();
  });

  it("o investidor aprovado sem compras tem o teto inteiro e vê o float da oferta à venda", async () => {
    const investidor = await investidorAprovado(ambiente);

    assert.deepEqual(await consultarPosicao(ambiente, investidor.id), {
      carteira: investidor.carteira,
      glampy: 0n,
      ibitiPass: 0n,
      teto: 40n,
      tetoRestante: 40n,
      estoque: { origem: "oferta", quantidade: await ambiente.cadeia.oferta.read.floatDisponivel() },
    });
  });

  it("depois de comprar, mostra o Glampy, o crédito IbitiPass e o teto descontado", async () => {
    const investidor = await investidorAprovado(ambiente);
    await comprarComCarteiraHabilitada(ambiente, investidor.carteira, 3n);

    const posicao = await consultarPosicao(ambiente, investidor.id);

    assert.equal(posicao?.glampy, 3n);
    assert.equal(posicao?.tetoRestante, 37n);
    assert.equal(posicao?.ibitiPass, await ambiente.cadeia.ibitiPass.read.balanceOf([investidor.carteira]));
  });

  it("o teto é da pessoa: desconta a posição do titular em todas as carteiras dele", async () => {
    const investidor = await investidorAprovado(ambiente);
    const outra = await ambiente.contaInteligente.criarCarteira();
    await confirmar(ambiente.cadeia, ambiente.cadeia.registro.write.habilitar([outra, investidor.identificador]));
    await comprarComCarteiraHabilitada(ambiente, outra, 5n);
    await comprarComCarteiraHabilitada(ambiente, investidor.carteira, 2n);

    const posicao = await consultarPosicao(ambiente, investidor.id);

    assert.equal(posicao?.glampy, 2n);
    assert.equal(posicao?.tetoRestante, 33n);
  });

  it("com a posição no teto, não sobra nada a comprar", async () => {
    const investidor = await investidorAprovado(ambiente);
    await comprarComCarteiraHabilitada(ambiente, investidor.carteira, 40n);

    assert.equal((await consultarPosicao(ambiente, investidor.id))?.tetoRestante, 0n);
  });

  it("depois da oferta, o estoque vem da recolocação, e sem lote não há token à venda", async () => {
    const investidor = await investidorAprovado(ambiente);

    assert.equal((await consultarPosicao(ambiente, investidor.id, { agora: DEPOIS_DA_OFERTA }))?.estoque, null);

    await confirmar(
      ambiente.cadeia,
      ambiente.cadeia.token.write.transfer([ambiente.cadeia.recolocacao.address, 5n], {
        account: contasLocais.tesouraria,
      }),
    );

    assert.deepEqual((await consultarPosicao(ambiente, investidor.id, { agora: DEPOIS_DA_OFERTA }))?.estoque, {
      origem: "recolocacao",
      quantidade: 5n,
    });
    assert.equal((await consultarPosicao(ambiente, investidor.id))?.estoque?.origem, "oferta");
  });

  it("quem ainda não foi aprovado não tem posição", async () => {
    const semCadastro = await investidorComCarteira(ambiente);
    const emAnalise = await investidorEmAnalise(ambiente);

    assert.equal(await consultarPosicao(ambiente, semCadastro.id), null);
    assert.equal(await consultarPosicao(ambiente, emAnalise.id), null);
  });

  it("só o investidor consulta posição", async () => {
    const operador = await criarUsuario(ambiente.banco, "operador");

    await assert.rejects(consultarPosicao(ambiente, operador.id), AcessoNegado);
  });
});
