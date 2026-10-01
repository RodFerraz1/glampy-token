import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { encodeFunctionData, keccak256, numberToHex, parseAbi, toBytes, type Address } from "viem";
import { contaSafe, ENTRY_POINT } from "@/carteira/safe";
import type { Chamada } from "@/servidor/adaptadores/conta-inteligente";
import { AcessoNegado } from "@/servidor/autorizacao";
import { autorizarRequisicaoAoPimlico } from "@/servidor/operacoes/pimlico";
import { investidorComCarteira as comCarteira, prepararAmbiente, type Ambiente } from "../ambiente";
import { novaPasskey } from "../ambiente/passkey";
import { criarUsuario } from "../ambiente/usuarios";

describe("requisições ao bundler e ao paymaster da Pimlico", () => {
  let ambiente: Ambiente;
  before(async () => {
    ambiente = await prepararAmbiente();
  });

  const investidorComCarteira = () => comCarteira(ambiente);

  /** Operação montada como o navegador monta, pela Safe do permissionless. */
  async function operacao(sender: Address, chamadas: Chamada[]) {
    const conta = await contaSafe(ambiente.cadeia.leitor, novaPasskey(), sender);
    return { sender, nonce: "0x0", callData: await conta.encodeCalls(chamadas) };
  }

  const patrocinio = (userOp: object) => ({
    jsonrpc: "2.0" as const,
    id: 1,
    method: "pm_getPaymasterData",
    params: [userOp, ENTRY_POINT.address, numberToHex(ambiente.cadeia.leitor.chain.id), {}],
  });

  const aprovarECompra = () => [
    {
      to: ambiente.cadeia.stable.address,
      data: encodeFunctionData({
        abi: ambiente.cadeia.stable.abi,
        functionName: "approve",
        args: [ambiente.cadeia.oferta.address, 1n],
      }),
    },
    {
      to: ambiente.cadeia.oferta.address,
      data: encodeFunctionData({ abi: ambiente.cadeia.oferta.abi, functionName: "comprar", args: [1n] }),
    },
  ];

  it("patrocina a própria carteira aprovando a stablecoin e comprando na oferta", async () => {
    const investidor = await investidorComCarteira();

    const resultado = await autorizarRequisicaoAoPimlico(
      ambiente,
      investidor.id,
      patrocinio(await operacao(investidor.carteira, aprovarECompra())),
    );

    assert.deepEqual(resultado, { autorizada: true });
  });

  it("recusa patrocinar chamada a contrato fora da v2 e do BRLStableMock", async () => {
    const investidor = await investidorComCarteira();
    const chamadas = [...aprovarECompra(), { to: ambiente.cadeia.agente.account.address, data: "0x" as const }];

    const resultado = await autorizarRequisicaoAoPimlico(
      ambiente,
      investidor.id,
      patrocinio(await operacao(investidor.carteira, chamadas)),
    );

    assert.deepEqual(resultado, { erro: "O patrocínio de gas só cobre os contratos da plataforma." });
  });

  it("patrocina uma chamada única da própria carteira a um contrato da v2", async () => {
    const investidor = await investidorComCarteira();
    const resgate = {
      to: ambiente.cadeia.ibitiPass.address,
      data: encodeFunctionData({
        abi: ambiente.cadeia.ibitiPass.abi,
        functionName: "resgatar",
        args: [1n, keccak256(toBytes("passeio"))],
      }),
    };

    const resultado = await autorizarRequisicaoAoPimlico(
      ambiente,
      investidor.id,
      patrocinio(await operacao(investidor.carteira, [resgate])),
    );

    assert.deepEqual(resultado, { autorizada: true });
  });

  it("recusa patrocinar delegatecall, mesmo para um contrato da plataforma", async () => {
    const investidor = await investidorComCarteira();
    const callData = encodeFunctionData({
      abi: parseAbi(["function executeUserOpWithErrorString(address to, uint256 value, bytes data, uint8 operation)"]),
      args: [ambiente.cadeia.stable.address, 0n, aprovarECompra()[0].data, 1],
    });

    const resultado = await autorizarRequisicaoAoPimlico(
      ambiente,
      investidor.id,
      patrocinio({ sender: investidor.carteira, nonce: "0x0", callData }),
    );

    assert.deepEqual(resultado, { erro: "O patrocínio de gas só cobre os contratos da plataforma." });
  });

  for (const method of ["pm_getPaymasterStubData", "pm_getPaymasterData", "pm_sponsorUserOperation", "eth_sendUserOperation", "eth_estimateUserOperationGas"]) {
    it(`${method} recusa operação da carteira de outro investidor`, async () => {
      const [investidor, outro] = [await investidorComCarteira(), await investidorComCarteira()];

      const resultado = await autorizarRequisicaoAoPimlico(ambiente, investidor.id, {
        ...patrocinio(await operacao(outro.carteira, aprovarECompra())),
        method,
      });

      assert.deepEqual(resultado, { erro: "A operação não é da sua carteira." });
    });
  }

  it("recusa patrocinar carteira desabilitada", async () => {
    const investidor = await investidorComCarteira();
    await ambiente.banco
      .from("carteiras")
      .update({ status: "desabilitada", desabilitada_em: new Date().toISOString() })
      .eq("perfil_id", investidor.id)
      .throwOnError();

    const resultado = await autorizarRequisicaoAoPimlico(
      ambiente,
      investidor.id,
      patrocinio(await operacao(investidor.carteira, aprovarECompra())),
    );

    assert.deepEqual(resultado, { erro: "Sua carteira está desabilitada. Fale com o Ibiti." });
  });

  it("recusa operação de quem ainda não criou a carteira", async () => {
    const investidor = await criarUsuario(ambiente.banco, "investidor");
    const outro = await investidorComCarteira();

    const resultado = await autorizarRequisicaoAoPimlico(
      ambiente,
      investidor.id,
      patrocinio(await operacao(outro.carteira, aprovarECompra())),
    );

    assert.deepEqual(resultado, { erro: "A operação não é da sua carteira." });
  });

  it("encaminha as consultas do bundler que não levam operação", async () => {
    const investidor = await investidorComCarteira();

    for (const method of ["eth_chainId", "eth_supportedEntryPoints", "eth_getUserOperationReceipt", "pimlico_getUserOperationGasPrice"]) {
      assert.deepEqual(
        await autorizarRequisicaoAoPimlico(ambiente, investidor.id, { jsonrpc: "2.0", id: 1, method, params: [] }),
        { autorizada: true },
        method,
      );
    }
  });

  it("recusa métodos fora do bundler e do paymaster", async () => {
    const investidor = await investidorComCarteira();

    for (const method of ["eth_sendRawTransaction", "eth_call", "pimlico_sendUserOperationNow"]) {
      assert.deepEqual(
        await autorizarRequisicaoAoPimlico(ambiente, investidor.id, { jsonrpc: "2.0", id: 1, method, params: [] }),
        { erro: `O método ${method} não é permitido.` },
      );
    }
  });

  it("só investidor fala com a Pimlico", async () => {
    const administrador = await criarUsuario(ambiente.banco, "administrador");

    await assert.rejects(
      autorizarRequisicaoAoPimlico(ambiente, administrador.id, { jsonrpc: "2.0", id: 1, method: "eth_chainId" }),
      AcessoNegado,
    );
  });
});
