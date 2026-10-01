export const distribuicaoAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "administrador",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "tokenDoRoyalty",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "ativoDePagamento",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "regrasDeConformidade",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "contratoDeOferta",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "tesourariaDoEmissor",
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
    "inputs": [
      {
        "internalType": "uint256",
        "name": "emCirculacao",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "exigida",
        "type": "uint256"
      }
    ],
    "name": "CirculacaoIncompleta",
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
        "name": "saldoNaOferta",
        "type": "uint256"
      }
    ],
    "name": "FloatNaoRecolhido",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint32",
        "name": "periodo",
        "type": "uint32"
      }
    ],
    "name": "MesInvalido",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint32",
        "name": "periodo",
        "type": "uint32"
      },
      {
        "internalType": "uint48",
        "name": "fechamento",
        "type": "uint48"
      },
      {
        "internalType": "uint256",
        "name": "agora",
        "type": "uint256"
      }
    ],
    "name": "PeriodoAindaAberto",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint32",
        "name": "periodo",
        "type": "uint32"
      }
    ],
    "name": "PeriodoForaDaVigencia",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint32",
        "name": "esperado",
        "type": "uint32"
      },
      {
        "internalType": "uint32",
        "name": "recebido",
        "type": "uint32"
      }
    ],
    "name": "PeriodoForaDeSequencia",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint32",
        "name": "periodo",
        "type": "uint32"
      }
    ],
    "name": "PeriodoJaRegistrado",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReentrancyGuardReentrantCall",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "faturamento",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "piso",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "teto",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "recebido",
        "type": "uint256"
      }
    ],
    "name": "RoyaltyDivergente",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "SafeERC20FailedOperation",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "detentor",
        "type": "address"
      }
    ],
    "name": "SemCreditoPendente",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint32",
        "name": "periodo",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "faturamento",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "royalty",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "valorPorToken",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "hashRelatorio",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "quando",
        "type": "uint256"
      }
    ],
    "name": "ApuracaoRegistrada",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "detentor",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "valor",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "quando",
        "type": "uint256"
      }
    ],
    "name": "CreditoPendenteSacado",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint32",
        "name": "periodo",
        "type": "uint32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "detentor",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "valor",
        "type": "uint256"
      }
    ],
    "name": "PagamentoFalhou",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint32",
        "name": "periodo",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "valor",
        "type": "uint256"
      }
    ],
    "name": "RestoParaTesouraria",
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
        "internalType": "uint32",
        "name": "periodo",
        "type": "uint32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "detentor",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "valor",
        "type": "uint256"
      }
    ],
    "name": "RoyaltyPago",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "ALIQUOTA_ROYALTY",
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
    "name": "EMISSAO_TOTAL",
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
    "name": "INICIO_DA_VIGENCIA",
    "outputs": [
      {
        "internalType": "uint48",
        "name": "",
        "type": "uint48"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "PRIMEIRO_PERIODO",
    "outputs": [
      {
        "internalType": "uint32",
        "name": "",
        "type": "uint32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "TESOURARIA",
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
    "name": "ULTIMO_PERIODO",
    "outputs": [
      {
        "internalType": "uint32",
        "name": "",
        "type": "uint32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint32",
        "name": "periodo",
        "type": "uint32"
      }
    ],
    "name": "apuracaoDe",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "faturamento",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "royalty",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "valorPorToken",
            "type": "uint256"
          },
          {
            "internalType": "bytes32",
            "name": "hashRelatorio",
            "type": "bytes32"
          },
          {
            "internalType": "uint64",
            "name": "quando",
            "type": "uint64"
          },
          {
            "internalType": "bool",
            "name": "registrada",
            "type": "bool"
          }
        ],
        "internalType": "struct Distribuicao.Apuracao",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "conformidade",
    "outputs": [
      {
        "internalType": "contract IRegrasConformidade",
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
        "name": "",
        "type": "address"
      }
    ],
    "name": "creditoPendente",
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
        "internalType": "uint32",
        "name": "periodo",
        "type": "uint32"
      },
      {
        "internalType": "uint256",
        "name": "faturamento",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "royalty",
        "type": "uint256"
      },
      {
        "internalType": "bytes32",
        "name": "hashRelatorio",
        "type": "bytes32"
      }
    ],
    "name": "depositarApuracao",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint32",
        "name": "periodo",
        "type": "uint32"
      }
    ],
    "name": "fechamentoDoPeriodo",
    "outputs": [
      {
        "internalType": "uint48",
        "name": "",
        "type": "uint48"
      }
    ],
    "stateMutability": "pure",
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
    "inputs": [],
    "name": "meioDePagamento",
    "outputs": [
      {
        "internalType": "contract IERC20",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "oferta",
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
    "name": "periodoPorIndice",
    "outputs": [
      {
        "internalType": "uint32",
        "name": "",
        "type": "uint32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "proximoPeriodo",
    "outputs": [
      {
        "internalType": "uint32",
        "name": "",
        "type": "uint32"
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
    "inputs": [],
    "name": "sacarPendente",
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
    "inputs": [],
    "name": "token",
    "outputs": [
      {
        "internalType": "contract IERC20",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalDePeriodos",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
