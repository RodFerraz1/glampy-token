#!/usr/bin/env node
/**
 * Roda a suíte das operações contra Supabase local e uma rede Hardhat local.
 *
 *     npm run test:operacoes
 *     npm run test:operacoes -- testes/operacoes/consultar-posicao.test.ts
 *
 * Sobe o Supabase se estiver parado, aplica migrações pendentes, compila os
 * contratos da Sprint 04 se faltarem artefatos, sobe um nó Hardhat só para a
 * suíte e o derruba no fim.
 */
import { execFileSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const RAIZ = process.cwd();
const SPRINT_04 = join(RAIZ, "..", "..", "Sprint 04", "Implementação do Contrato Inteligente ERC-20 - versão 2");
const PORTA = 8546;
const RPC_LOCAL = `http://127.0.0.1:${PORTA}`;
const SERVICOS_DISPENSADOS =
  "studio,imgproxy,logflare,vector,supavisor,edge-runtime,realtime,mailpit,postgres-meta";

const npx = (args, opcoes = {}) => execFileSync("npx", args, { encoding: "utf8", ...opcoes });

function supabase() {
  let status;
  try {
    status = npx(["supabase", "status", "-o", "json"], { stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    console.log("Subindo o Supabase local…");
    npx(["supabase", "start", "-x", SERVICOS_DISPENSADOS], { stdio: "inherit" });
    status = npx(["supabase", "status", "-o", "json"], { stdio: ["ignore", "pipe", "ignore"] });
  }
  npx(["supabase", "migration", "up", "--local"], { stdio: "inherit" });
  const { API_URL, SECRET_KEY, PUBLISHABLE_KEY } = JSON.parse(status.slice(status.indexOf("{")));
  return { url: API_URL, chaveSecreta: SECRET_KEY, chavePublica: PUBLISHABLE_KEY };
}

function artefatos() {
  if (!existsSync(join(SPRINT_04, "node_modules"))) {
    throw new Error(`instale as dependências da Sprint 04 antes: cd "${SPRINT_04}" && npm install`);
  }
  if (!existsSync(join(SPRINT_04, "artifacts", "contracts", "IbitiPass.sol", "IbitiPass.json"))) {
    console.log("Compilando os contratos da Sprint 04…");
    npx(["hardhat", "compile"], { cwd: SPRINT_04, stdio: "inherit" });
  }
}

async function responde() {
  try {
    const resposta = await fetch(RPC_LOCAL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId" }),
    });
    return resposta.ok;
  } catch {
    return false;
  }
}

async function subirNo() {
  if (await responde()) throw new Error(`a porta ${PORTA} já está em uso; derrube o nó que está nela`);
  const no = spawn("npx", ["hardhat", "node", "--port", String(PORTA)], {
    cwd: SPRINT_04,
    stdio: "ignore",
    detached: true,
  });
  // O npx deixa o nó num processo filho; derrubar o grupo leva os dois.
  const derrubar = () => process.kill(-no.pid);
  for (let tentativa = 0; tentativa < 120; tentativa++) {
    if (await responde()) return derrubar;
    await new Promise((resolver) => setTimeout(resolver, 500));
  }
  derrubar();
  throw new Error("o nó Hardhat não respondeu em 60 segundos");
}

const banco = supabase();
artefatos();
const derrubarNo = await subirNo();

const arquivos = process.argv.slice(2);
const testes = spawn(
  process.execPath,
  [
    "--import",
    "tsx",
    "--conditions=react-server",
    "--test",
    "--test-concurrency=1",
    ...(arquivos.length > 0 ? arquivos : ["testes/**/*.test.ts"]),
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "test",
      RPC_LOCAL,
      SUPABASE_URL_TESTE: banco.url,
      SUPABASE_CHAVE_SECRETA_TESTE: banco.chaveSecreta,
      SUPABASE_CHAVE_PUBLICA_TESTE: banco.chavePublica,
    },
  },
);
const codigo = await new Promise((resolver) => testes.on("exit", resolver));
derrubarNo();
process.exit(codigo ?? 1);
