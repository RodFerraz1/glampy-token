import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { encodeFunctionData } from "viem";
import { custoEmCredito } from "@/catalogo/resgate";
import { AcessoNegado } from "@/servidor/autorizacao";
import { editarBeneficio } from "@/servidor/operacoes/catalogo";
import {
  consultarLoja,
  consultarResgate,
  listarMeusResgates,
  prepararResgate,
  registrarResgate,
} from "@/servidor/operacoes/loja";
import { catalogoPublicado, investidorComCredito, prepararAmbiente, type Ambiente } from "../ambiente";
import { criarUsuario } from "../ambiente/usuarios";

const UM_CREDITO = 10n ** 18n;

describe("loja e resgate de benefícios", () => {
  let ambiente: Ambiente;
  let catalogo: Awaited<ReturnType<typeof catalogoPublicado>>;
  // Tabela de R$ 300 e de R$ 20.000: resgate de R$ 180, que cabe em 2 créditos, e de R$ 12.000, que não cabe.
  before(async () => {
    ambiente = await prepararAmbiente();
    catalogo = await catalogoPublicado(ambiente, [300_00, 20_000_00]);
  });
  const barato = () => catalogo.beneficios[0];
  const caro = () => catalogo.beneficios[1];

  /** Como a tela: prepara, a Safe executa e o servidor registra. */
  async function resgatar(investidor: { id: string; carteira: `0x${string}` }, beneficioId: string) {
    const preparo = await prepararResgate(ambiente, investidor.id, { beneficioId });
    assert.ok(!("erro" in preparo), "erro" in preparo ? preparo.erro : "");
    const txHash = await ambiente.contaInteligente.executar(investidor.carteira, preparo.chamadas);
    return { preparo, txHash, registro: await registrarResgate(ambiente, investidor.id, { txHash, beneficioId }) };
  }

  it("mostra o saldo e a validade do ciclo lidos do IbitiPass, e o custo de cada item em crédito", async () => {
    const investidor = await investidorComCredito(ambiente, 2n);
    const agora = new Date();

    const loja = await consultarLoja(ambiente, investidor.id, { agora });

    assert.ok(loja);
    assert.equal(loja.saldo, await ambiente.cadeia.ibitiPass.read.balanceOf([investidor.carteira]));
    assert.equal(loja.saldo, 2n * UM_CREDITO);
    const fim = await ambiente.cadeia.ibitiPass.read.fimDoCiclo();
    assert.equal(loja.fimDoCiclo?.getTime(), Number(fim) * 1000);
    assert.equal(loja.diasParaExpirar, Math.ceil((Number(fim) * 1000 - agora.getTime()) / 86_400_000));
    assert.equal(loja.versao, catalogo.versao);
    assert.deepEqual(
      loja.beneficios.map(({ id, precoCentavos, custo, disponivel }) => ({ id, precoCentavos, custo, disponivel })),
      [
        { id: barato(), precoCentavos: 180_00, custo: (180_00n * UM_CREDITO) / 66_313n, disponivel: true },
        { id: caro(), precoCentavos: 12_000_00, custo: (12_000_00n * UM_CREDITO) / 66_313n, disponivel: false },
      ],
    );
  });

  it("o custo em crédito é o preço de resgate dividido por 66.313, com 18 casas", () => {
    assert.equal(custoEmCredito(66_313), UM_CREDITO);
    assert.equal(custoEmCredito(180_00), 271_439_989_142_400_434n);
  });

  it("o resgate debita o crédito on-chain e gera um voucher confirmado", async () => {
    const investidor = await investidorComCredito(ambiente, 2n);
    const custo = custoEmCredito(180_00);

    const { preparo, txHash, registro } = await resgatar(investidor, barato());

    assert.ok(!("erro" in preparo));
    assert.equal(preparo.custo, custo);
    assert.ok(!("erro" in registro), "erro" in registro ? registro.erro : "");
    assert.equal(registro.status, "confirmado");
    assert.equal(await ambiente.cadeia.ibitiPass.read.balanceOf([investidor.carteira]), 2n * UM_CREDITO - custo);
    assert.equal(await ambiente.cadeia.ibitiPass.read.consumidoNoCiclo([investidor.carteira]), custo);

    const { data: resgate } = await ambiente.banco
      .from("resgates")
      .select("perfil_id, beneficio_id, versao, custo::text, status, tx_hash")
      .eq("id", registro.resgateId)
      .single()
      .throwOnError();
    assert.deepEqual(resgate, {
      perfil_id: investidor.id,
      beneficio_id: barato(),
      versao: catalogo.versao,
      custo: custo.toString(),
      status: "confirmado",
      tx_hash: txHash,
    });
    const { data: transacoes } = await ambiente.banco
      .from("transacoes")
      .select("tipo, status")
      .eq("tx_hash", txHash)
      .throwOnError();
    assert.deepEqual(transacoes, [{ tipo: "resgate_beneficio", status: "confirmada" }]);

    const voucher = await consultarResgate(ambiente, investidor.id, registro.resgateId);
    assert.ok(voucher);
    assert.equal(voucher.codigo, registro.resgateId);
    assert.equal(voucher.status, "confirmado");
    assert.equal(voucher.beneficio.nome, "Benefício 1");
    const meus = await listarMeusResgates(ambiente, investidor.id);
    assert.deepEqual(
      meus.map(({ id, status }) => ({ id, status })),
      [{ id: registro.resgateId, status: "confirmado" }],
    );
  });

  it("registrar o mesmo resgate de novo não duplica", async () => {
    const investidor = await investidorComCredito(ambiente, 2n);
    const { txHash, registro } = await resgatar(investidor, barato());

    assert.deepEqual(await registrarResgate(ambiente, investidor.id, { txHash, beneficioId: barato() }), registro);
    assert.equal((await listarMeusResgates(ambiente, investidor.id)).length, 1);
  });

  it("recusa o item acima do saldo, o que não está na versão vigente e o investidor sem carteira habilitada", async () => {
    const investidor = await investidorComCredito(ambiente, 2n);

    assert.deepEqual(await prepararResgate(ambiente, investidor.id, { beneficioId: caro() }), {
      erro: "Seu crédito não cobre este benefício.",
    });
    assert.deepEqual(await prepararResgate(ambiente, investidor.id, { beneficioId: crypto.randomUUID() }), {
      erro: "Este benefício não está no catálogo vigente.",
    });

    await editarBeneficio(ambiente, catalogo.administrador.id, barato(), {
      nome: "Benefício 1",
      descricao: "",
      categoria: "Wellness",
      imagemUrl: "",
      precoTabelaCentavos: 300_00,
      ativo: false,
    });
    try {
      assert.deepEqual(await prepararResgate(ambiente, investidor.id, { beneficioId: barato() }), {
        erro: "Este benefício não está no catálogo vigente.",
      });
      assert.ok(!(await consultarLoja(ambiente, investidor.id))?.beneficios.some(({ id }) => id === barato()));
    } finally {
      await editarBeneficio(ambiente, catalogo.administrador.id, barato(), {
        nome: "Benefício 1",
        descricao: "",
        categoria: "Wellness",
        imagemUrl: "",
        precoTabelaCentavos: 300_00,
        ativo: true,
      });
    }

    const semCarteira = await criarUsuario(ambiente.banco, "investidor");
    assert.deepEqual(await prepararResgate(ambiente, semCarteira.id, { beneficioId: barato() }), {
      erro: "Sua carteira não está habilitada para resgatar.",
    });
    assert.equal(await consultarLoja(ambiente, semCarteira.id), null);
  });

  it("uma operação que não resgatou é gravada como falha, com o erro", async () => {
    const investidor = await investidorComCredito(ambiente, 2n);
    const txHash = await ambiente.contaInteligente.executar(investidor.carteira, [
      {
        to: ambiente.cadeia.ibitiPass.address,
        data: encodeFunctionData({
          abi: ambiente.cadeia.ibitiPass.abi,
          functionName: "balanceOf",
          args: [investidor.carteira],
        }),
      },
    ]);

    const registro = await registrarResgate(ambiente, investidor.id, { txHash, beneficioId: barato() });

    assert.deepEqual(registro, { erro: "O resgate não aconteceu: o contrato não registrou o consumo." });
    const [falha] = await listarMeusResgates(ambiente, investidor.id);
    assert.equal(falha.status, "falhou");
    assert.equal(falha.erro, registro.erro);
  });

  it("o resgate de outra carteira não é registrado", async () => {
    const investidor = await investidorComCredito(ambiente, 2n);
    const outro = await investidorComCredito(ambiente, 2n);
    const { txHash } = await resgatar(outro, barato());

    assert.deepEqual(await registrarResgate(ambiente, investidor.id, { txHash, beneficioId: barato() }), {
      erro: "Esta transação não é da sua carteira.",
    });
    assert.deepEqual(await listarMeusResgates(ambiente, investidor.id), []);
  });

  it("um consumo com custo ou item fora do catálogo não gera voucher", async () => {
    const investidor = await investidorComCredito(ambiente, 2n);
    const [{ item }] = (await consultarLoja(ambiente, investidor.id))!.beneficios;
    const txHash = await ambiente.contaInteligente.executar(investidor.carteira, [
      {
        to: ambiente.cadeia.ibitiPass.address,
        data: encodeFunctionData({ abi: ambiente.cadeia.ibitiPass.abi, functionName: "resgatar", args: [1n, item] }),
      },
    ]);

    const registro = await registrarResgate(ambiente, investidor.id, { txHash, beneficioId: barato() });

    assert.ok("erro" in registro);
    assert.match(registro.erro, /não confere com o catálogo/);
    const [falha] = await listarMeusResgates(ambiente, investidor.id);
    assert.equal(falha.status, "falhou");
  });

  it("o investidor só vê o próprio voucher", async () => {
    const investidor = await investidorComCredito(ambiente, 2n);
    const outro = await investidorComCredito(ambiente, 2n);
    const { registro } = await resgatar(investidor, barato());
    assert.ok(!("erro" in registro));

    assert.equal(await consultarResgate(ambiente, outro.id, registro.resgateId), null);
    assert.equal(await consultarResgate(ambiente, outro.id, "não é uuid"), null);
  });

  it("só o investidor usa a loja", async () => {
    const operador = await criarUsuario(ambiente.banco, "operador");

    for (const operacao of [
      () => consultarLoja(ambiente, operador.id),
      () => prepararResgate(ambiente, operador.id, { beneficioId: barato() }),
      () => registrarResgate(ambiente, operador.id, { txHash: `0x${"0".repeat(64)}`, beneficioId: barato() }),
      () => listarMeusResgates(ambiente, operador.id),
      () => consultarResgate(ambiente, operador.id, crypto.randomUUID()),
    ]) {
      await assert.rejects(operacao(), AcessoNegado);
    }
  });
});
