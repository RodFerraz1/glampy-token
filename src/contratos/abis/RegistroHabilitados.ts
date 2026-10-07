export const registroHabilitadosAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "administrador",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "carteiraDaTesouraria",
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
    "name": "EnderecoZero",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "endereco",
        "type": "address"
      }
    ],
    "name": "IsencaoConflitaComTitular",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "endereco",
        "type": "address"
      }
    ],
    "name": "IsencaoFechada",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "endereco",
        "type": "address"
      }
    ],
    "name": "IsencaoForaDoSistema",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "endereco",
        "type": "address"
      }
    ],
    "name": "JaHabilitado",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "endereco",
        "type": "address"
      }
    ],
    "name": "NaoHabilitado",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "endereco",
        "type": "address"
      }
    ],
    "name": "PossuiSaldo",
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
        "name": "naPublicacao",
        "type": "address"
      }
    ],
    "name": "TesourariaDivergente",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TitularZero",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TokenJaDefinido",
    "type": "error"
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
        "indexed": true,
        "internalType": "bytes32",
        "name": "titular",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "motivo",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "quando",
        "type": "uint256"
      }
    ],
    "name": "EnderecoDesabilitado",
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
        "indexed": true,
        "internalType": "bytes32",
        "name": "titular",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "quando",
        "type": "uint256"
      }
    ],
    "name": "EnderecoHabilitado",
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
        "name": "isento",
        "type": "bool"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "quando",
        "type": "uint256"
      }
    ],
    "name": "IsencaoDefinida",
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
    "name": "AGENTE_REGISTRO",
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
    "name": "CURADOR_ISENCAO",
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
    "inputs": [
      {
        "internalType": "address",
        "name": "endereco",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "valor",
        "type": "bool"
      }
    ],
    "name": "definirIsencao",
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
        "name": "endereco",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "motivo",
        "type": "bytes32"
      }
    ],
    "name": "desabilitar",
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
        "internalType": "address",
        "name": "endereco",
        "type": "address"
      }
    ],
    "name": "habilitado",
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
      },
      {
        "internalType": "bytes32",
        "name": "titular",
        "type": "bytes32"
      }
    ],
    "name": "habilitar",
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
    "name": "isento",
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
    "inputs": [
      {
        "internalType": "address",
        "name": "endereco",
        "type": "address"
      }
    ],
    "name": "titularDe",
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
  }
] as const;
