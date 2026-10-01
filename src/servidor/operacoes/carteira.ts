import { getAddress, type Address, type Hash, type Hex } from "viem";
import type { Passkey } from "@/carteira/safe";
import type { Dependencias } from "@/servidor/adaptadores";
import { exigirPapel } from "@/servidor/autorizacao";

export const passkeyValida = ({ id, chavePublica }: Passkey) =>
  typeof id === "string" &&
  typeof chavePublica === "string" &&
  /^[A-Za-z0-9_-]+$/.test(id) &&
  /^0x[0-9a-f]{128}$/.test(chavePublica);

/**
 * Grava a Safe da passkey como carteira embutida pendente. O endereço é
 * recalculado aqui a partir da chave pública, e não aceito do navegador.
 */
export async function criarCarteira(
  { banco, contaInteligente }: Pick<Dependencias, "banco" | "contaInteligente">,
  perfilId: string,
  passkey: Passkey,
): Promise<{ endereco: Address } | { erro: string }> {
  await exigirPapel(banco, perfilId, "investidor");
  if (!passkeyValida(passkey)) return { erro: "A passkey criada pelo aparelho não é válida. Tente de novo." };

  const endereco = await contaInteligente.enderecoDaCarteira(passkey);
  const { error } = await banco.from("carteiras").insert({
    perfil_id: perfilId,
    endereco: endereco.toLowerCase(),
    tipo: "embutida",
    status: "pendente",
    passkey_id: passkey.id,
    passkey_chave_publica: passkey.chavePublica,
  });
  if (error?.code === "23505" && error.message.includes("uma_carteira_embutida_por_perfil")) {
    return { erro: "Sua carteira já foi criada." };
  }
  if (error) throw new Error(`falha ao criar a carteira: ${error.message}`);

  return { endereco };
}

/** Carteira embutida do investidor, com o hash da habilitação, ou `null` se ele ainda não criou. */
export async function consultarCarteira({ banco }: Pick<Dependencias, "banco">, perfilId: string) {
  const { data, error } = await banco
    .from("carteiras")
    .select("endereco, status, transacoes(tx_hash)")
    .eq("perfil_id", perfilId)
    .eq("tipo", "embutida")
    .eq("transacoes.tipo", "habilitacao")
    .neq("transacoes.status", "revertida")
    .order("criado_em", { referencedTable: "transacoes", ascending: false })
    .limit(1, { referencedTable: "transacoes" })
    .maybeSingle();
  if (error) throw new Error(`falha ao consultar a carteira: ${error.message}`);
  if (!data) return null;
  return {
    endereco: getAddress(data.endereco),
    status: data.status,
    txHabilitacao: (data.transacoes[0]?.tx_hash ?? null) as Hash | null,
  };
}

export interface CarteiraHabilitada {
  carteiraId: string;
  carteira: Address;
  passkey: Passkey;
  identificador: Hex;
}

/** A carteira embutida do investidor aprovado, se estiver habilitada; senão `null`. */
export async function lerCarteiraHabilitada(
  { banco }: Pick<Dependencias, "banco">,
  perfilId: string,
): Promise<CarteiraHabilitada | null> {
  const [titular, carteira] = await Promise.all([
    banco.from("titulares").select("identificador, status").eq("perfil_id", perfilId).maybeSingle(),
    banco
      .from("carteiras")
      .select("id, endereco, status, passkey_id, passkey_chave_publica")
      .eq("perfil_id", perfilId)
      .eq("tipo", "embutida")
      .maybeSingle(),
  ]);
  if (titular.error) throw new Error(`falha ao ler o cadastro do perfil ${perfilId}: ${titular.error.message}`);
  if (carteira.error) throw new Error(`falha ao ler a carteira do perfil ${perfilId}: ${carteira.error.message}`);
  if (titular.data?.status !== "aprovado" || carteira.data?.status !== "habilitada") return null;
  const { id, endereco, passkey_id, passkey_chave_publica } = carteira.data;
  if (!passkey_id || !passkey_chave_publica) throw new Error(`a carteira embutida ${endereco} não tem passkey`);

  return {
    carteiraId: id,
    carteira: getAddress(endereco),
    passkey: { id: passkey_id, chavePublica: passkey_chave_publica as Hex },
    identificador: titular.data.identificador as Hex,
  };
}
