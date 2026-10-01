import { getAddress, isAddressEqual } from "viem";
import { TOTAL_DE_PERIODOS } from "@/calendario-da-oferta";
import type { Dependencias } from "@/servidor/adaptadores";
import type { Cadeia } from "@/servidor/adaptadores/cadeia";
import { registrarAuditoria } from "@/servidor/auditoria";
import { exigirPapel } from "@/servidor/autorizacao";
import { listarApuracoes } from "./apuracoes";
import { distribuicaoDosTokens } from "./circulacao";
import { titularesDosEnderecos } from "./titulares-na-cadeia";

export type TipoDeDetentor = "tesouraria" | "oferta" | "recolocacao" | "investidor";

async function enderecosDosDetentores(cadeia: Cadeia) {
  const total = await cadeia.conformidade.read.totalDeDetentores();
  return Promise.all(
    Array.from({ length: Number(total) }, (_, i) => cadeia.conformidade.read.detentorPorIndice([BigInt(i)])),
  );
}

/** Quem já deteve cota alguma vez: quem consumiu crédito e depois vendeu tudo continua contando no ciclo. */
async function enderecosDosDetentoresDeSempre(cadeia: Cadeia) {
  const total = await cadeia.conformidade.read.totalDeDetentoresDeSempre();
  return Promise.all(
    Array.from({ length: Number(total) }, (_, i) => cadeia.conformidade.read.detentorDeSemprePorIndice([BigInt(i)])),
  );
}

async function contasDoSistema(cadeia: Cadeia) {
  const tesouraria = await cadeia.token.read.tesouraria();
  return [
    { endereco: tesouraria, tipo: "tesouraria" as const, nome: "Tesouraria" },
    { endereco: cadeia.oferta.address, tipo: "oferta" as const, nome: "Oferta" },
    { endereco: cadeia.recolocacao.address, tipo: "recolocacao" as const, nome: "Recolocação" },
  ];
}

const somar = (valores: bigint[]) => valores.reduce((total, valor) => total + valor, 0n);

/**
 * A lista nominal de quem detém o token agora, lida do contrato e cruzada com
 * o cadastro pelo titular habilitado. Cada consulta fica na auditoria, como
 * o Memorando promete.
 */
export async function consultarDetentores({ banco, cadeia }: Pick<Dependencias, "banco" | "cadeia">, ator: string) {
  await exigirPapel(banco, ator, "administrador");

  const [enderecos, sistema] = await Promise.all([enderecosDosDetentores(cadeia), contasDoSistema(cadeia)]);
  const [saldos, titulares] = await Promise.all([
    Promise.all(enderecos.map((endereco) => cadeia.token.read.balanceOf([endereco]))),
    titularesDosEnderecos({ banco, cadeia }, enderecos),
  ]);
  const lidos = enderecos.map((endereco, i) => ({ endereco: getAddress(endereco), saldo: saldos[i] }));

  await registrarAuditoria(banco, {
    ator,
    acao: "consultar_detentores",
    entidade: "detentores",
    dados: { detentores: lidos.length },
  });

  return lidos
    .map(({ endereco, saldo }) => {
      const conta = sistema.find((conta) => isAddressEqual(conta.endereco, endereco));
      const titular = titulares.get(endereco);
      return {
        endereco,
        saldo,
        tipo: conta?.tipo ?? ("investidor" as TipoDeDetentor),
        nome: conta?.nome ?? titular?.nome ?? "Titular sem cadastro na plataforma",
        titularId: titular?.id ?? null,
      };
    })
    .sort((a, b) => (a.saldo === b.saldo ? 0 : a.saldo > b.saldo ? -1 : 1));
}

/**
 * Os números do programa, sem identificar ninguém: detentores, captação,
 * apurações simuladas, crédito de benefícios do ciclo e o catálogo.
 */
export async function consultarPainel({ banco, cadeia }: Pick<Dependencias, "banco" | "cadeia">, ator: string) {
  await exigirPapel(banco, ator, "administrador");

  const [enderecos, deSempre, tokens, ciclo, fimDoCiclo] = await Promise.all([
    enderecosDosDetentores(cadeia),
    enderecosDosDetentoresDeSempre(cadeia),
    distribuicaoDosTokens(cadeia),
    cadeia.ibitiPass.read.cicloAtual(),
    cadeia.ibitiPass.read.fimDoCiclo(),
  ]);
  const [direitos, consumos, vendas, recolocacoes, beneficios, apuracoes] = await Promise.all([
    Promise.all(deSempre.map((endereco) => cadeia.ibitiPass.read.direitoDoCiclo([endereco]))),
    Promise.all(deSempre.map((endereco) => cadeia.ibitiPass.read.consumidoNoCiclo([endereco]))),
    cadeia.emJanelas((janela) => cadeia.oferta.getEvents.TokensVendidos({}, janela)),
    cadeia.emJanelas((janela) => cadeia.recolocacao.getEvents.LoteRecolocado({}, janela)),
    banco.from("beneficios").select("ativo"),
    listarApuracoes({ banco }),
  ]);
  if (beneficios.error) throw new Error(`falha ao contar os benefícios: ${beneficios.error.message}`);

  return {
    detentores: enderecos.length,
    ...tokens,
    vendidosNaOferta: somar(vendas.map(({ args }) => args.quantidade ?? 0n)),
    vendidosNaRecolocacao: somar(recolocacoes.map(({ args }) => args.quantidade ?? 0n)),
    creditoDoCiclo: { direito: somar(direitos), consumido: somar(consumos) },
    cicloDeBeneficios: { atual: ciclo, fim: fimDoCiclo === 0n ? null : new Date(Number(fimDoCiclo) * 1000) },
    apuracoes: {
      registradas: apuracoes.length,
      faltam: TOTAL_DE_PERIODOS - apuracoes.length,
      royaltyCentavos: apuracoes.reduce((total, { royaltyCentavos }) => total + royaltyCentavos, 0),
    },
    beneficios: {
      ativos: beneficios.data.filter(({ ativo }) => ativo).length,
      inativos: beneficios.data.filter(({ ativo }) => !ativo).length,
    },
  };
}

export type Detentor = Awaited<ReturnType<typeof consultarDetentores>>[number];
