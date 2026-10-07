import type { Hash, Hex } from "viem";
import { formatarPeriodo, PRIMEIRO_PERIODO, sucessorDe, ULTIMO_PERIODO } from "@/calendario-da-oferta";
import { BUCKET_DOS_RELATORIOS, ehPdf, hashDoRelatorio, TAMANHO_MAXIMO_DO_RELATORIO } from "@/relatorio-de-apuracao";
import { calcularApuracao, TOKENS_EMITIDOS } from "@/royalty";
import type { Dependencias } from "@/servidor/adaptadores";
import { registrarAuditoria } from "@/servidor/auditoria";
import { exigirPapel } from "@/servidor/autorizacao";
import type { Resultado } from "@/servidor/resultado";

/** Todas as apurações simuladas, a mais recente primeiro. São públicas, como a transparência mostra. */
export async function listarApuracoes({ banco }: Pick<Dependencias, "banco">) {
  const { data, error } = await banco.from("apuracoes_simuladas").select().order("periodo", { ascending: false });
  if (error) throw new Error(`falha ao listar as apurações: ${error.message}`);
  return data.map((apuracao) => ({
    periodo: apuracao.periodo,
    faturamentoCentavos: apuracao.faturamento_centavos,
    royaltyCentavos: apuracao.royalty_centavos,
    valorPorTokenCentavos: apuracao.valor_por_token_centavos,
    hashRelatorio: apuracao.hash_relatorio as Hash,
    relatorioUrl: apuracao.relatorio_caminho
      ? banco.storage.from(BUCKET_DOS_RELATORIOS).getPublicUrl(apuracao.relatorio_caminho).data.publicUrl
      : null,
    registradoEm: apuracao.registrado_em,
  }));
}

export async function proximoPeriodo({ banco }: Pick<Dependencias, "banco">) {
  const { data, error } = await banco
    .from("apuracoes_simuladas")
    .select("periodo")
    .order("periodo", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`falha ao ler a última apuração: ${error.message}`);
  const proximo = data ? sucessorDe(data.periodo) : PRIMEIRO_PERIODO;
  return proximo > ULTIMO_PERIODO ? null : proximo;
}

/**
 * Registra a apuração com o relatório do mês em PDF. O hash é calculado aqui,
 * dos bytes do arquivo, e o arquivo fica guardado para quem quiser conferir.
 */
export async function registrarApuracao(
  { banco }: Pick<Dependencias, "banco">,
  ator: string,
  { periodo, faturamentoCentavos, relatorio }: { periodo: number; faturamentoCentavos: number; relatorio: Uint8Array },
): Promise<
  Resultado<{
    periodo: number;
    faturamentoCentavos: number;
    royaltyCentavos: number;
    valorPorTokenCentavos: number;
    hashRelatorio: Hash;
  }>
> {
  await exigirPapel(banco, ator, "administrador");
  if (!Number.isSafeInteger(faturamentoCentavos) || faturamentoCentavos <= 0) {
    return { erro: "Informe o faturamento do mês." };
  }
  if (relatorio.length === 0 || !ehPdf(relatorio)) return { erro: "Anexe o relatório de apuração do mês em PDF." };
  if (relatorio.length > TAMANHO_MAXIMO_DO_RELATORIO) return { erro: "O relatório tem de ter até 4 MB." };
  const proximo = await proximoPeriodo({ banco });
  if (proximo === null) return { erro: "As 48 apurações da vigência já foram registradas." };
  if (periodo !== proximo) return { erro: `A próxima apuração é a de ${formatarPeriodo(proximo)}.` };

  const hashRelatorio = hashDoRelatorio(relatorio);
  const caminho = `${periodo}/${hashRelatorio}.pdf`;
  const arquivos = banco.storage.from(BUCKET_DOS_RELATORIOS);
  const envio = await arquivos.upload(caminho, relatorio, { contentType: "application/pdf", upsert: true });
  if (envio.error) throw new Error(`falha ao guardar o relatório de ${periodo}: ${envio.error.message}`);

  const calculo = calcularApuracao(faturamentoCentavos);
  const { error } = await banco.from("apuracoes_simuladas").insert({
    periodo,
    faturamento_centavos: faturamentoCentavos,
    royalty_centavos: calculo.royaltyCentavos,
    valor_por_token_centavos: calculo.valorPorTokenCentavos,
    hash_relatorio: hashRelatorio,
    relatorio_caminho: caminho,
    registrado_por: ator,
  });
  if (error) {
    await arquivos.remove([caminho]);
    // Outro registro do mesmo período chegou antes.
    if (error.code === "23505") return { erro: `A apuração de ${formatarPeriodo(periodo)} já foi registrada.` };
    throw new Error(`falha ao registrar a apuração de ${periodo}: ${error.message}`);
  }
  await registrarAuditoria(banco, {
    ator,
    acao: "registrar_apuracao",
    entidade: "apuracoes_simuladas",
    entidadeId: String(periodo),
    dados: { faturamentoCentavos, ...calculo, hashRelatorio, relatorio: caminho },
  });

  return { periodo, faturamentoCentavos, ...calculo, hashRelatorio };
}

/**
 * O royalty do investidor mês a mês: o valor por token de cada apuração vezes
 * a posição atual do titular, lida on-chain. É uma simplificação: o contrato
 * usa a posição no fechamento do período. `null` antes da aprovação.
 */
export async function consultarRendimentos({ banco, cadeia }: Pick<Dependencias, "banco" | "cadeia">, perfilId: string) {
  await exigirPapel(banco, perfilId, "investidor");
  const { data: titular, error } = await banco
    .from("titulares")
    .select("identificador, status")
    .eq("perfil_id", perfilId)
    .maybeSingle();
  if (error) throw new Error(`falha ao ler o cadastro do perfil ${perfilId}: ${error.message}`);
  if (titular?.status !== "aprovado") return null;

  const [posicao, apuracoes] = await Promise.all([
    cadeia.conformidade.read.posicaoDoTitular([titular.identificador as Hex]),
    listarApuracoes({ banco }),
  ]);
  const meses = apuracoes.map((apuracao) => ({
    ...apuracao,
    // Do royalty, e não do valor por token já arredondado, para não errar um centavo no empate.
    recebidoCentavos: Math.round((apuracao.royaltyCentavos * Number(posicao)) / TOKENS_EMITIDOS),
  }));
  return { posicao, meses, totalCentavos: meses.reduce((total, { recebidoCentavos }) => total + recebidoCentavos, 0) };
}
