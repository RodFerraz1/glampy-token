import { encodeFunctionData, keccak256, toBytes, type Address, type Hash, type Hex } from "viem";
import { hardhat } from "viem/chains";
import type { Dependencias } from "@/servidor/adaptadores";
import { criarBanco } from "@/servidor/adaptadores/banco";
import { criarCadeia, type Cadeia } from "@/servidor/adaptadores/cadeia";
import { aprovarCadastro } from "@/servidor/operacoes/analise-de-cadastro";
import { enviarCadastro } from "@/servidor/operacoes/cadastro";
import { criarCarteira } from "@/servidor/operacoes/carteira";
import { criarBeneficio, publicarCatalogo } from "@/servidor/operacoes/catalogo";
import { criarContaInteligenteFalsa } from "../falsos/conta-inteligente";
import { criarGovernancaFalsa } from "../falsos/governanca";
import { criarPagamentoFalso } from "../falsos/pagamento";
import { cpfNovo } from "./cpf";
import { novaPasskey } from "./passkey";
import { contasLocais, publicarSistemaLocal, RPC_LOCAL } from "./rede-local";
import { criarUsuario } from "./usuarios";

export function exigir(variavel: string) {
  const valor = process.env[variavel];
  if (!valor) throw new Error(`${variavel} ausente: rode os testes com npm run test:operacoes`);
  return valor;
}

export const bancoDeTeste = () =>
  criarBanco({ url: exigir("SUPABASE_URL_TESTE"), chaveSecreta: exigir("SUPABASE_CHAVE_SECRETA_TESTE") });

/** Contratos recém-publicados na rede local, Supabase local, e falsos nas demais bordas. */
export async function prepararAmbiente() {
  const enderecos = await publicarSistemaLocal();
  return {
    banco: bancoDeTeste(),
    cadeia: criarCadeia({ chain: hardhat, rpcUrl: RPC_LOCAL, agente: contasLocais.agente, enderecos, blocoInicial: 0n }),
    contaInteligente: criarContaInteligenteFalsa(),
    pagamento: criarPagamentoFalso(),
    governanca: criarGovernancaFalsa(),
  } satisfies Dependencias;
}

export type Ambiente = Awaited<ReturnType<typeof prepararAmbiente>>;

export async function confirmar(cadeia: Cadeia, envio: Promise<Hash>) {
  const hash = await envio;
  const recibo = await cadeia.leitor.waitForTransactionReceipt({ hash });
  if (recibo.status !== "success") throw new Error(`transação reverteu: ${hash}`);
  return hash;
}

export const novoIdentificador = () => keccak256(toBytes(crypto.randomUUID()));

/** Habilita a carteira, abastece de stablecoin e compra na oferta, como `comprarNaOferta` da Sprint 04. */
export async function comprarNaOferta(ambiente: Ambiente, carteira: Address, quantidade: bigint) {
  await confirmar(ambiente.cadeia, ambiente.cadeia.registro.write.habilitar([carteira, novoIdentificador()]));
  await comprarComCarteiraHabilitada(ambiente, carteira, quantidade);
}

/** Abastece de stablecoin e compra na oferta com uma carteira que já está habilitada. */
export async function comprarComCarteiraHabilitada(
  { cadeia, contaInteligente }: Ambiente,
  carteira: Address,
  quantidade: bigint,
) {
  const custo = quantidade * (await cadeia.oferta.read.precoUnitario());
  await confirmar(cadeia, cadeia.stable.write.emitirPara([carteira, custo]));
  await contaInteligente.executar(carteira, [
    {
      to: cadeia.stable.address,
      data: encodeFunctionData({ abi: cadeia.stable.abi, functionName: "approve", args: [cadeia.oferta.address, custo] }),
    },
    {
      to: cadeia.oferta.address,
      data: encodeFunctionData({ abi: cadeia.oferta.abi, functionName: "comprar", args: [quantidade] }),
    },
  ]);
}

/** Investidor que já criou a carteira, pronto para enviar o cadastro. */
export async function investidorComCarteira(dependencias: Pick<Dependencias, "banco" | "contaInteligente">) {
  const investidor = await criarUsuario(dependencias.banco, "investidor");
  const carteira = await criarCarteira(dependencias, investidor.id, novaPasskey());
  if ("erro" in carteira) throw new Error(carteira.erro);
  return { ...investidor, carteira: carteira.endereco };
}

export async function investidorEmAnalise(
  dependencias: Pick<Dependencias, "banco" | "contaInteligente">,
  { nomeCompleto = "Maria da Silva" }: { nomeCompleto?: string } = {},
) {
  const investidor = await investidorComCarteira(dependencias);
  const envio = await enviarCadastro(dependencias, investidor.id, {
    nomeCompleto,
    cpf: cpfNovo(),
    dataNascimento: "1980-05-17",
    telefone: "11987654321",
    declaracaoAceita: true,
  });
  if ("erro" in envio) throw new Error(envio.erro);
  const { data } = await dependencias.banco
    .from("titulares")
    .select("id, identificador")
    .eq("perfil_id", investidor.id)
    .single()
    .throwOnError();
  return { ...investidor, titularId: data.id, identificador: data.identificador as Hex };
}

/** Investidor com o cadastro aprovado e a carteira habilitada on-chain. */
export async function investidorAprovado(
  dependencias: Pick<Dependencias, "banco" | "cadeia" | "contaInteligente">,
  cadastro?: { nomeCompleto?: string },
) {
  const investidor = await investidorEmAnalise(dependencias, cadastro);
  const administrador = await criarUsuario(dependencias.banco, "administrador");
  const aprovacao = await aprovarCadastro(dependencias, administrador.id, investidor.titularId);
  if ("erro" in aprovacao) throw new Error(aprovacao.erro);
  return investidor;
}

/**
 * Cada suíte publica contratos novos, cuja numeração de versões do catálogo
 * recomeça em 1; o banco é um só. Por isso o catálogo, e os resgates que
 * apontam para ele, são apagados antes de publicar de novo.
 */
export async function limparCatalogo(banco: Ambiente["banco"]) {
  await banco.from("resgates").delete().not("id", "is", null).throwOnError();
  await banco.from("precos_beneficio").delete().gt("versao", 0).throwOnError();
  await banco.from("catalogo_versoes").delete().gt("versao", 0).throwOnError();
  await banco.from("beneficios").delete().not("id", "is", null).throwOnError();
}

/** Um catálogo publicado na rede local com um benefício por preço de tabela, em centavos. */
export async function catalogoPublicado(ambiente: Ambiente, precosDeTabela: number[]) {
  await limparCatalogo(ambiente.banco);
  const administrador = await criarUsuario(ambiente.banco, "administrador");
  const beneficios = [];
  for (const [i, precoTabelaCentavos] of precosDeTabela.entries()) {
    const criado = await criarBeneficio(ambiente, administrador.id, {
      nome: `Benefício ${i + 1}`,
      descricao: "",
      categoria: i % 2 === 0 ? "Wellness" : "Hospedagem",
      imagemUrl: "",
      precoTabelaCentavos,
      ativo: true,
    });
    if ("erro" in criado) throw new Error(criado.erro);
    beneficios.push(criado.id);
  }
  const publicacao = await publicarCatalogo(ambiente, administrador.id);
  if ("erro" in publicacao) throw new Error(publicacao.erro);
  return { administrador, beneficios, versao: publicacao.versao };
}

/** Investidor aprovado que comprou tokens na oferta e, com eles, crédito IbitiPass no ciclo. */
export async function investidorComCredito(ambiente: Ambiente, tokens: bigint, cadastro?: { nomeCompleto?: string }) {
  const investidor = await investidorAprovado(ambiente, cadastro);
  await comprarComCarteiraHabilitada(ambiente, investidor.carteira, tokens);
  return investidor;
}

/** Um PDF mínimo, diferente a cada período, para o relatório de apuração. */
export const relatorioEmPdf = (periodo: number) => new TextEncoder().encode(`%PDF-1.4\n% relatório de ${periodo}\n%%EOF\n`);
