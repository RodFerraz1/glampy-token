import { encodeFunctionData, keccak256, toBytes, type Hash } from "viem";
import type { Dependencias } from "@/servidor/adaptadores";
import type { Chamada } from "@/servidor/adaptadores/conta-inteligente";
import type { SafeDeGovernanca } from "@/servidor/adaptadores/governanca";
import type { Json } from "@/servidor/adaptadores/tipos-do-banco";
import { registrarAuditoria } from "@/servidor/auditoria";
import { exigirPapel } from "@/servidor/autorizacao";
import { decidirPelaGovernanca, type Decisao } from "@/servidor/decisao-de-governanca";
import type { Resultado } from "@/servidor/resultado";
import { mensagemDeErro } from "@/servidor/transacoes";
import { agoraNaCadeia, lerOferta, listarOfertas, NAO_ENCONTRADA } from "./revenda";
import { titularesDosEnderecos } from "./titulares-na-cadeia";


/**
 * As ofertas de revenda para o Ibiti decidir, com vendedor e comprador
 * identificados pelo cadastro e as decisões já tomadas, lidas da auditoria.
 */
export async function listarRevendasParaDecisao({ banco, cadeia }: Pick<Dependencias, "banco" | "cadeia">, ator: string) {
  await exigirPapel(banco, ator, "administrador");
  const ofertas = await listarOfertas(cadeia);
  const [titulares, { data: decisoes, error }] = await Promise.all([
    titularesDosEnderecos(
      { banco, cadeia },
      ofertas.flatMap(({ vendedor, compradorIndicado }) => (compradorIndicado ? [vendedor, compradorIndicado] : [vendedor])),
    ),
    banco.from("auditoria").select("acao, dados, criado_em, entidade_id").eq("entidade", "revendas").order("id"),
  ]);
  if (error) throw new Error(`falha ao ler as decisões de revenda: ${error.message}`);

  return ofertas.map((oferta) => ({
    ...oferta,
    vendedorNome: titulares.get(oferta.vendedor)?.nome ?? null,
    compradorNome: oferta.compradorIndicado ? (titulares.get(oferta.compradorIndicado)?.nome ?? null) : null,
    decisoes: decisoes
      .filter(({ entidade_id }) => entidade_id === oferta.id.toString())
      .map(({ acao, dados, criado_em }) => ({
        acao: acao as AcaoDaRevenda,
        dados: dados as Partial<Decisao> & { motivo?: string; erro?: string },
        em: criado_em,
      })),
  }));
}

export type AcaoDaRevenda = "exercer_preferencia" | "recusar_preferencia" | "aprovar_comprador" | "vetar_comprador";

const executarDecisao = (
  dependencias: Pick<Dependencias, "banco" | "governanca">,
  ator: string,
  {
    id,
    ...decisao
  }: { id: bigint; acao: AcaoDaRevenda; safe: SafeDeGovernanca; chamadas: Chamada[]; dados?: { [chave: string]: Json } },
) => decidirPelaGovernanca(dependencias, { ator, entidade: "revendas", entidadeId: id.toString(), ...decisao });

/**
 * Exercer recompra o lote para a tesouraria pelo preço ofertado. A conta
 * agente emite para a tesouraria só a stablecoin que falta, e a Safe aprova o
 * pagamento e exerce numa transação só: ou a recompra acontece inteira, ou nada
 * muda além da stablecoin, que fica para a próxima tentativa. Recusar libera o
 * vendedor para indicar um comprador.
 */
export async function decidirPreferencia(
  { banco, cadeia, governanca }: Pick<Dependencias, "banco" | "cadeia" | "governanca">,
  ator: string,
  id: bigint,
  { decisao }: { decisao: "exercer" | "recusar" },
): Promise<Resultado<Decisao>> {
  await exigirPapel(banco, ator, "administrador");
  const oferta = await lerOferta(cadeia, id);
  if (!oferta) return NAO_ENCONTRADA;
  if (oferta.estado !== "ofertado") return { erro: "Esta oferta não está aguardando a preferência do Ibiti." };

  if (decisao === "recusar") {
    return executarDecisao({ banco, governanca }, ator, {
      id,
      acao: "recusar_preferencia",
      safe: "tesouraria",
      chamadas: [
        { to: cadeia.controle.address, data: encodeFunctionData({ abi: cadeia.controle.abi, functionName: "recusar", args: [id] }) },
      ],
    });
  }

  if ((await agoraNaCadeia(cadeia)) > oferta.preferenciaAte) return { erro: "O prazo de 30 dias da preferência acabou." };
  const tesouraria = await cadeia.token.read.tesouraria();
  const saldo = await cadeia.stable.read.balanceOf([tesouraria]);
  let emissao: Hash | null = null;
  if (saldo < oferta.preco) {
    try {
      emissao = await cadeia.stable.write.emitirPara([tesouraria, oferta.preco - saldo]);
      const recibo = await cadeia.leitor.waitForTransactionReceipt({ hash: emissao });
      if (recibo.status !== "success") throw new Error(`a emissão ${emissao} reverteu`);
    } catch (erro) {
      const mensagem = `Não foi possível abastecer a tesouraria com stablecoin: ${mensagemDeErro(erro)}`;
      await registrarAuditoria(banco, {
        ator,
        acao: "exercer_preferencia",
        entidade: "revendas",
        entidadeId: id.toString(),
        dados: { erro: mensagem, emissao },
      });
      return { erro: mensagem };
    }
  }
  return executarDecisao({ banco, governanca }, ator, {
    id,
    acao: "exercer_preferencia",
    safe: "tesouraria",
    dados: { emissao },
    chamadas: [
      {
        to: cadeia.stable.address,
        data: encodeFunctionData({ abi: cadeia.stable.abi, functionName: "approve", args: [cadeia.controle.address, oferta.preco] }),
      },
      {
        to: cadeia.controle.address,
        data: encodeFunctionData({ abi: cadeia.controle.abi, functionName: "exercerPreferencia", args: [id] }),
      },
    ],
  });
}

/**
 * O crivo decide sobre o comprador indicado pela Safe do crivo, 2 de 3. O
 * motivo do veto vai on-chain só como keccak256, porque pode ter dado pessoal;
 * o texto fica na auditoria.
 */
export async function decidirCrivo(
  { banco, cadeia, governanca }: Pick<Dependencias, "banco" | "cadeia" | "governanca">,
  ator: string,
  id: bigint,
  { decisao, motivo = "" }: { decisao: "aprovar" | "vetar"; motivo?: string },
): Promise<Resultado<Decisao>> {
  await exigirPapel(banco, ator, "administrador");
  const oferta = await lerOferta(cadeia, id);
  if (!oferta) return NAO_ENCONTRADA;
  if (oferta.estado !== "em_crivo") return { erro: "Esta oferta não tem comprador em análise no crivo." };
  const comprador = oferta.compradorIndicado ?? "";

  if (decisao === "aprovar") {
    if (oferta.crivoAte && (await agoraNaCadeia(cadeia)) > oferta.crivoAte) return { erro: "O prazo de 15 dias do crivo acabou." };
    return executarDecisao({ banco, governanca }, ator, {
      id,
      acao: "aprovar_comprador",
      safe: "crivo",
      dados: { comprador },
      chamadas: [
        { to: cadeia.controle.address, data: encodeFunctionData({ abi: cadeia.controle.abi, functionName: "aprovarComprador", args: [id] }) },
      ],
    });
  }

  motivo = motivo.trim();
  if (!motivo) return { erro: "Informe o motivo do veto." };
  return executarDecisao({ banco, governanca }, ator, {
    id,
    acao: "vetar_comprador",
    safe: "crivo",
    dados: { comprador, motivo },
    chamadas: [
      {
        to: cadeia.controle.address,
        data: encodeFunctionData({
          abi: cadeia.controle.abi,
          functionName: "vetarComprador",
          args: [id, keccak256(toBytes(motivo))],
        }),
      },
    ],
  });
}
