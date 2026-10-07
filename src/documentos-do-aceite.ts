import type { Database } from "@/servidor/adaptadores/tipos-do-banco";

export type DocumentoDoAceite = Database["public"]["Enums"]["documento_aceite"];

// A `versao` é gravada em `aceites` junto com a data. Muda sempre que o texto
// mudar, e exige novo aceite.

export const MEMORANDO_DE_OFERTA = {
  titulo: "Memorando de Oferta",
  versao: "memorando-v2",
  arquivo: "/memorando-de-oferta-v2.pdf",
};

/** Síntese dos fatores de risco do Memorando V2 (§13) e da ausência de garantia de saída (§12.5). */
export const TERMO_DE_RISCOS = {
  titulo: "Termo de ciência de riscos",
  versao: "riscos-v1",
  texto: [
    "O Ibiti Glamping ainda não abriu. Estou comprando um recebível sobre um empreendimento que ainda não gerou receita, e toda projeção de ocupação é hipótese sem histórico operacional.",
    "Atraso na obra produz meses sem distribuição, e nenhum mecanismo on-chain compensa esse atraso. Cerca de 63% do preço depende da expansão de seis para vinte tendas.",
    "O emissor define os termos, distribui o royalty e exerce a preferência na revenda, e a receita é apurada pelo operador, parte interessada. O hash de cada apuração prova que o relatório não foi alterado, não que ele está correto.",
    "Não existe mercado secundário, obrigação de recompra nem garantia de preço, e a restrição a investidores profissionais reduz ainda mais os compradores possíveis. Se não houver comprador aprovado, fico com os tokens até 31/03/2031.",
    "Diárias resgatadas com o crédito de benefícios não geram royalty, e a demanda por resgate tende a se concentrar nos períodos de maior ocupação.",
    "O enquadramento regulatório é interpretação fundamentada, não manifestação da CVM. O tratamento tributário das distribuições ainda não está formalmente definido.",
    "Os contratos inteligentes e as peças de terceiros (conta inteligente, patrocinador de taxas, stablecoin) podem falhar, e nenhuma auditoria elimina esse risco.",
  ],
};

export const DOCUMENTOS_DO_ACEITE: Record<DocumentoDoAceite, { titulo: string; versao: string }> = {
  memorando_de_oferta: MEMORANDO_DE_OFERTA,
  termo_de_riscos: TERMO_DE_RISCOS,
};
