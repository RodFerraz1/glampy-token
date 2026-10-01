import { P256, PublicKey } from "ox";
import type { Passkey } from "@/carteira/safe";

/** Passkey com chave P-256 de verdade, como a que o navegador cria. */
export function novaPasskey(): Passkey {
  const chave = P256.getPublicKey({ privateKey: P256.randomPrivateKey() });
  return {
    id: Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64url"),
    chavePublica: PublicKey.toHex(chave, { includePrefix: false }),
  };
}
