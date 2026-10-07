export const regrasConformidadeAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "administrador",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "registroHabilitados",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "AccessControlBadConfirmation",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "neededRole",
        "type": "bytes32"
      }
    ],
    "name": "AccessControlUnauthorizedAccount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "BeneficiosJaDefinidos",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "CheckpointUnorderedInsertion",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "destino",
        "type": "address"
      }
    ],
    "name": "DestinoForaDoSistema",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "destino",
        "type": "address"
      }
    ],
    "name": "DestinoNaoHabilitado",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "EnderecoZero",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "indice",
        "type": "uint256"
      }
    ],
    "name": "IndiceInexistente",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "autor",
        "type": "address"
      }
    ],
    "name": "OrigemNaoAutorizada",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint8",
        "name": "bits",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "SafeCastOverflowedUintDowncast",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "titular",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "saldoRestante",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "travado",
        "type": "uint256"
      }
    ],
    "name": "SaldoTravado",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "SomenteToken",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "noToken",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "informada",
        "type": "address"
      }
    ],
    "name": "TesourariaDivergente",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "titular",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "posicaoResultante",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "teto",
        "type": "uint256"
      }
    ],
    "name": "TetoExcedido",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TokenJaDefinido",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TokenNaoDefinido",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "titular",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "saldo",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "solicitado",
        "type": "uint256"
      }
    ],
    "name": "TravaExcedeSaldo",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "titular",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "travado",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "solicitado",
        "type": "uint256"
      }
    ],
    "name": "TravaInsuficiente",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "VigenciaEmCurso",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "VigenciaEncerrada",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "ibitiPass",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "quando",
        "type": "uint256"
      }
    ],
    "name": "BeneficiosDefinidos",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "endereco",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "autorizada",
        "type": "bool"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "quando",
        "type": "uint256"
      }
    ],
    "name": "OrigemAutorizada",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "previousAdminRole",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "newAdminRole",
        "type": "bytes32"
      }
    ],
    "name": "RoleAdminChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      }
    ],
    "name": "RoleGranted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      }
    ],
    "name": "RoleRevoked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "titular",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "travadoAgora",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "quando",
        "type": "uint256"
      }
    ],
    "name": "SaldoTravadoAlterado",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "quando",
        "type": "uint256"
      }
    ],
    "name": "TokenDefinido",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "CONTROLE_TRANSFERENCIA",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "CURADOR_BENEFICIOS",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "CURADOR_ORIGENS",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "DEFAULT_ADMIN_ROLE",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "FIM_DA_VIGENCIA",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "TETO_TOKENS",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "beneficios",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "ibitiPass",
        "type": "address"
      }
    ],
    "name": "definirBeneficios",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "endereco",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "autorizada",
        "type": "bool"
      }
    ],
    "name": "definirOrigemAutorizada",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "tokenDoRoyalty",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "carteiraDaTesouraria",
        "type": "address"
      }
    ],
    "name": "definirToken",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "titular",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "quantidade",
        "type": "uint256"
      }
    ],
    "name": "destravar",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "indice",
        "type": "uint256"
      }
    ],
    "name": "detentorDeSemprePorIndice",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "indice",
        "type": "uint256"
      }
    ],
    "name": "detentorPorIndice",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      }
    ],
    "name": "getRoleAdmin",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "grantRole",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "hasRole",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "endereco",
        "type": "address"
      }
    ],
    "name": "origemAutorizada",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "titular",
        "type": "bytes32"
      }
    ],
    "name": "posicaoDoTitular",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "endereco",
        "type": "address"
      },
      {
        "internalType": "uint48",
        "name": "instante",
        "type": "uint48"
      }
    ],
    "name": "posicaoEm",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint48",
        "name": "instante",
        "type": "uint48"
      }
    ],
    "name": "posicoesEm",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "enderecos",
        "type": "address[]"
      },
      {
        "internalType": "uint256[]",
        "name": "posicoes",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "registro",
    "outputs": [
      {
        "internalType": "contract IRegistroHabilitados",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "callerConfirmation",
        "type": "address"
      }
    ],
    "name": "renounceRole",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "revokeRole",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "titular",
        "type": "address"
      }
    ],
    "name": "saldoTravado",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes4",
        "name": "interfaceId",
        "type": "bytes4"
      }
    ],
    "name": "supportsInterface",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "tesouraria",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "token",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalDeDetentores",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalDeDetentoresDeSempre",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "titular",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "quantidade",
        "type": "uint256"
      }
    ],
    "name": "travar",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "origem",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "destino",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "quantidade",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "autor",
        "type": "address"
      }
    ],
    "name": "verificarERegistrar",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
