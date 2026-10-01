export const ofertaAbi = [
  {
    "inputs": [
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
        "name": "tesourariaDoEmissor",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "precoPorToken",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
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
        "name": "disponivel",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "solicitado",
        "type": "uint256"
      }
    ],
    "name": "FloatInsuficiente",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NadaARecolher",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "OfertaEmCurso",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "OfertaEncerrada",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "PrecoZero",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "QuantidadeZero",
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
        "name": "autor",
        "type": "address"
      }
    ],
    "name": "SomenteTesouraria",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "quantidade",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "quando",
        "type": "uint256"
      }
    ],
    "name": "NaoVendidoRecolhido",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "comprador",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "quantidade",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "valorPago",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "quando",
        "type": "uint256"
      }
    ],
    "name": "TokensVendidos",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "FIM_DA_OFERTA",
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
        "internalType": "uint256",
        "name": "quantidade",
        "type": "uint256"
      }
    ],
    "name": "comprar",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "floatDisponivel",
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
    "name": "precoUnitario",
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
    "name": "recolherNaoVendido",
    "outputs": [],
    "stateMutability": "nonpayable",
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
  }
] as const;
