import type { Address, Hash } from "viem";

export const linkDaTransacao = (hash: Hash) => `https://sepolia.etherscan.io/tx/${hash}`;

export const abreviarHash = (hash: Hash) => `${hash.slice(0, 10)}…${hash.slice(-8)}`;

export const linkDoEndereco = (endereco: Address) => `https://sepolia.etherscan.io/address/${endereco}`;

export const abreviarEndereco = (endereco: Address) => `${endereco.slice(0, 8)}…${endereco.slice(-6)}`;
