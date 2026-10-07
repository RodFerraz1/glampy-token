import type { Address } from "viem";

// Sepolia, sepolia-v2 (Sprint 04/Implementação do Contrato Inteligente ERC-20 - versão 2/ignition/deployments)
export const enderecos = {
  RegistroHabilitados: "0x83dcfd98c2fc01e96b9ee643d37ba3e567c86c2b",
  RegrasConformidade: "0xeeebca8550d1db92b320bf6ef58bfb45398994c9",
  TokenRoyalty: "0x630fba5be4e2762701b0e64a6de0700e9ac9df8f",
  BRLStableMock: "0xee3f7acc41dc031d95b77f1f3f95bda5584e41e6",
  Oferta: "0xe5dc386ee45be7a38b93863925651ff96b9f3479",
  Recolocacao: "0xc027c81775115a40eed1230973572c0cc6b4ab85",
  Distribuicao: "0x338be14d1e95b9ee04cd725a8af9039544dbbf21",
  ControleTransferencia: "0xa4f0017c5ca2bf9bea4ab11b43ed958dbc902f33",
  IbitiPass: "0xa4230480f3b970552c43df5ea8e3a378c2efddaa",
} as const satisfies Record<string, Address>;

/** Bloco do primeiro evento dos contratos v2 na Sepolia. */
export const BLOCO_DA_PUBLICACAO = 11_766_390n;
