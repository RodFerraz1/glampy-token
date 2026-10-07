import { toSafeSmartAccount } from "permissionless/accounts";
import {
  concat,
  decodeFunctionData,
  encodeFunctionData,
  encodePacked,
  getAddress,
  hexToBigInt,
  hexToNumber,
  isAddressEqual,
  parseAbi,
  size,
  slice,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { entryPoint07Address, toWebAuthnAccount } from "viem/account-abstraction";

/** Credencial WebAuthn do aparelho do investidor. A chave privada nunca sai dele. */
export interface Passkey {
  /** Id da credencial, em base64url. */
  id: string;
  /** Coordenadas x e y da chave pública P-256, sem o prefixo 0x04. */
  chavePublica: Hex;
}

export const VERSAO_DA_SAFE = "1.4.1";
export const ENTRY_POINT = { address: entryPoint07Address, version: "0.7" } as const;

/**
 * Safe cuja única dona é a passkey. O navegador e o servidor montam a mesma
 * conta, e por isso chegam ao mesmo endereço contrafactual. Quem já sabe o
 * endereço o informa e evita recalculá-lo pela rede.
 */
export function contaSafe(client: PublicClient, passkey: Passkey, endereco?: Address) {
  return toSafeSmartAccount({
    client,
    address: endereco,
    owners: [toWebAuthnAccount({ credential: { id: passkey.id, publicKey: passkey.chavePublica } })],
    version: VERSAO_DA_SAFE,
    entryPoint: ENTRY_POINT,
  });
}

/** MultiSendCallOnly da Safe 1.4.1: é por ele que a Safe manda várias chamadas numa operação só. */
const MULTI_SEND_CALL_ONLY: Address = "0x9641d764fc13c8B624c04430C7356C1C7C8102e2";

const abiDoModulo4337 = parseAbi([
  "function executeUserOpWithErrorString(address to, uint256 value, bytes data, uint8 operation)",
]);
const abiDoMultiSend = parseAbi(["function multiSend(bytes transactions)"]);

const CALL = 0 as const;
const DELEGATECALL = 1 as const;

export interface ChamadaDaSafe {
  to: Address;
  value: bigint;
  data: Hex;
}

/**
 * Várias chamadas numa transação só da Safe: delegatecall ao MultiSendCallOnly
 * com as chamadas empacotadas. Uma chamada só vai direta.
 */
export function empacotarChamadas(chamadas: ChamadaDaSafe[]): ChamadaDaSafe & { operacao: 0 | 1 } {
  if (chamadas.length === 1) return { ...chamadas[0], operacao: CALL };
  const pacote = concat(
    chamadas.map(({ to, value, data }) =>
      encodePacked(["uint8", "address", "uint256", "uint256", "bytes"], [CALL, to, value, BigInt(size(data)), data]),
    ),
  );
  return {
    to: MULTI_SEND_CALL_ONLY,
    value: 0n,
    data: encodeFunctionData({ abi: abiDoMultiSend, functionName: "multiSend", args: [pacote] }),
    operacao: DELEGATECALL,
  };
}

/**
 * Chamadas de uma operação montada por `contaSafe`: uma chamada direta, ou
 * várias pelo MultiSendCallOnly. Qualquer outro formato, inclusive
 * delegatecall para outro contrato, devolve `null`.
 */
export function chamadasDaOperacao(callData: Hex): ChamadaDaSafe[] | null {
  try {
    const {
      args: [to, value, data, operacao],
    } = decodeFunctionData({ abi: abiDoModulo4337, data: callData });
    if (operacao === CALL) return [{ to, value, data }];
    if (operacao !== DELEGATECALL || !isAddressEqual(to, MULTI_SEND_CALL_ONLY) || value !== 0n) return null;

    const {
      args: [pacote],
    } = decodeFunctionData({ abi: abiDoMultiSend, data });
    const chamadas: ChamadaDaSafe[] = [];
    // Cada chamada vem empacotada: operação (1 byte), alvo (20), valor (32), tamanho (32) e dados.
    for (let i = 0; i < size(pacote); ) {
      const campo = (tamanho: number) => slice(pacote, i, (i += tamanho), { strict: true });
      if (hexToNumber(campo(1)) !== CALL) return null;
      const alvo = getAddress(campo(20));
      const valor = hexToBigInt(campo(32));
      const tamanho = hexToNumber(campo(32));
      chamadas.push({ to: alvo, value: valor, data: tamanho === 0 ? "0x" : campo(tamanho) });
    }
    return chamadas;
  } catch {
    return null;
  }
}
