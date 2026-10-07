import { getAddress, zeroHash, type Address } from "viem";
import type { Dependencias } from "@/servidor/adaptadores";

/**
 * O titular cadastrado de cada endereço, pelo identificador que o
 * `RegistroHabilitados` guarda para ele. Endereço sem titular habilitado fica de fora.
 */
export async function titularesDosEnderecos(
  { banco, cadeia }: Pick<Dependencias, "banco" | "cadeia">,
  enderecos: Address[],
) {
  const unicos = [...new Set(enderecos.map((endereco) => getAddress(endereco)))];
  const identificadores = await Promise.all(unicos.map((endereco) => cadeia.registro.read.titularDe([endereco])));
  const { data, error } = await banco
    .from("titulares")
    .select("id, identificador, nome_completo")
    .in(
      "identificador",
      identificadores.filter((identificador) => identificador !== zeroHash),
    );
  if (error) throw new Error(`falha ao cruzar os endereços com o cadastro: ${error.message}`);

  const titulares = new Map<Address, { id: string; nome: string }>();
  unicos.forEach((endereco, i) => {
    const titular = data.find(({ identificador }) => identificador === identificadores[i]);
    if (titular) titulares.set(endereco, { id: titular.id, nome: titular.nome_completo });
  });
  return titulares;
}
