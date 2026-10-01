export const recolocacaoAbi = [
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
    "name": "LoteInsuficiente",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NadaADevolver",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NadaARepassar",
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
    "name": "LoteDevolvido",
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
    "name": "LoteRecolocado",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
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
    "name": "ValorRepassado",
    "type": "event"
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
    "name": "devolverATesouraria",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "loteDisponivel",
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
    "name": "repassar",
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
