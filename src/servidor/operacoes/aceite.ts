import { DOCUMENTOS_DO_ACEITE, type DocumentoDoAceite } from "@/documentos-do-aceite";
import type { Dependencias } from "@/servidor/adaptadores";
import { exigirPapel } from "@/servidor/autorizacao";

const VERSOES_VIGENTES = Object.entries(DOCUMENTOS_DO_ACEITE).map(([documento, { versao }]) => ({
  documento: documento as DocumentoDoAceite,
  versao,
}));

/**
 * Quando o investidor aceitou as versões vigentes do Memorando de Oferta e do
 * termo de riscos, ou `null` se falta aceitar alguma delas.
 */
export async function consultarAceite({ banco }: Pick<Dependencias, "banco">, perfilId: string) {
  const { data, error } = await banco
    .from("aceites")
    .select("documento, versao, aceito_em")
    .eq("perfil_id", perfilId)
    .order("aceito_em", { ascending: false });
  if (error) throw new Error(`falha ao consultar o aceite do perfil ${perfilId}: ${error.message}`);

  const vigentes = data.filter(({ documento, versao }) => DOCUMENTOS_DO_ACEITE[documento].versao === versao);
  if (VERSOES_VIGENTES.some(({ documento }) => !vigentes.some((aceite) => aceite.documento === documento))) return null;
  return { aceitoEm: vigentes[0].aceito_em };
}

/**
 * Grava o aceite de cada documento na versão vigente. Aceitar de novo a mesma
 * versão não muda a data do primeiro aceite.
 */
export async function registrarAceite(
  { banco }: Pick<Dependencias, "banco">,
  perfilId: string,
  { memorando, riscos, agora = new Date() }: { memorando: boolean; riscos: boolean; agora?: Date },
): Promise<{ aceitoEm: string } | { erro: string }> {
  await exigirPapel(banco, perfilId, "investidor");
  if (!memorando || !riscos) {
    return { erro: "Aceite o Memorando de Oferta e o termo de ciência de riscos para continuar." };
  }

  const { error } = await banco.from("aceites").upsert(
    VERSOES_VIGENTES.map(({ documento, versao }) => ({
      perfil_id: perfilId,
      documento,
      versao,
      aceito_em: agora.toISOString(),
    })),
    { onConflict: "perfil_id,documento,versao", ignoreDuplicates: true },
  );
  if (error) throw new Error(`falha ao registrar o aceite do perfil ${perfilId}: ${error.message}`);

  const aceite = await consultarAceite({ banco }, perfilId);
  if (!aceite) throw new Error(`o aceite do perfil ${perfilId} não foi gravado`);
  return aceite;
}
