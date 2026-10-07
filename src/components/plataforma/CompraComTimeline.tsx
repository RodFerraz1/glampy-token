"use client";

import { Circle, CircleCheck, CircleX, Fingerprint, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Address, Hash } from "viem";
import { converter, pagarViaPix, registrar } from "@/app/investidor/comprar/acoes";
import { classeDeCampo } from "@/components/landing/base";
import { LinkDaTransacao } from "@/components/plataforma/LinkDaTransacao";
import { executarNaSafe, mensagemDaCarteira } from "@/carteira/executar-na-safe";
import { ETAPAS_DA_COMPRA, type EtapaDaCompra } from "@/etapas-da-compra";
import type { Passkey } from "@/carteira/safe";
import { formatarStable, formatarTokens } from "@/formatacao";
import type { OrigemDoEstoque } from "@/servidor/operacoes/consultar-posicao";

const ORIGEM: Record<OrigemDoEstoque, string> = { oferta: "Oferta inicial", recolocacao: "Lote recolocado" };

type Situacao = "aguardando" | "andamento" | "concluida" | "falhou";
type EstadoDaEtapa = { situacao: Situacao; detalhe?: string; hash?: Hash };

const INICIO = Object.fromEntries(Object.keys(ETAPAS_DA_COMPRA).map((etapa) => [etapa, { situacao: "aguardando" }])) as Record<
  EtapaDaCompra,
  EstadoDaEtapa
>;

type Falha = { mensagem: string; cobrado: string | null };

const ICONE: Record<Situacao, React.ReactNode> = {
  aguardando: <Circle className="size-5 text-borda" strokeWidth={2} aria-hidden />,
  andamento: <LoaderCircle className="size-5 animate-spin text-folha" strokeWidth={2} aria-hidden />,
  concluida: <CircleCheck className="size-5 text-folha" strokeWidth={2} aria-hidden />,
  falhou: <CircleX className="size-5 text-aviso-texto" strokeWidth={2} aria-hidden />,
};

const SITUACAO: Record<Situacao, string> = {
  aguardando: "aguardando",
  andamento: "em andamento",
  concluida: "concluída",
  falhou: "falhou",
};

export function CompraComTimeline({
  origem,
  precoUnitario,
  limite,
  carteira,
  passkey,
}: {
  origem: OrigemDoEstoque;
  precoUnitario: bigint;
  limite: bigint;
  carteira: Address;
  passkey: Passkey;
}) {
  const router = useRouter();
  const [quantidade, setQuantidade] = useState(1);
  const [etapas, setEtapas] = useState(INICIO);
  const [fase, setFase] = useState<"escolhendo" | "comprando" | "concluida" | "falhou">("escolhendo");
  const [falha, setFalha] = useState<Falha>();
  const [origemDaCompra, setOrigemDaCompra] = useState(origem);

  const quantidadeValida = Number.isSafeInteger(quantidade) && quantidade >= 1 && quantidade <= limite;
  const total = quantidadeValida ? precoUnitario * BigInt(quantidade) : 0n;

  const marcar = (atualizacao: Partial<Record<EtapaDaCompra, EstadoDaEtapa>>) =>
    setEtapas((atual) => ({ ...atual, ...atualizacao }));

  function falhar(atualizacao: Partial<Record<EtapaDaCompra, EstadoDaEtapa>>, mensagem: string, cobrado: string | null) {
    marcar(atualizacao);
    setFalha({ mensagem, cobrado });
    setFase("falhou");
  }

  async function comprar() {
    setEtapas({ ...INICIO, pix: { situacao: "andamento", detalhe: "Aguardando a aprovação do PIX." } });
    setFalha(undefined);
    setOrigemDaCompra(origem);
    setFase("comprando");

    const pagamento = await pagarViaPix(quantidade).catch(() => ({ erro: "Não foi possível falar com o servidor." }));
    if ("erro" in pagamento) return falhar({ pix: { situacao: "falhou", detalhe: pagamento.erro } }, pagamento.erro, null);
    const { compra } = pagamento;
    setOrigemDaCompra(compra.origem);
    const valor = formatarStable(compra.valor);
    marcar({
      pix: { situacao: "concluida", detalhe: `${valor} aprovados. Demonstração: nenhum dinheiro real foi movimentado.` },
      conversao: { situacao: "andamento", detalhe: "Emitindo a stablecoin para a sua carteira." },
    });

    const conversao = await converter(quantidade).catch(() => ({ erro: "Não foi possível falar com o servidor." }));
    if ("erro" in conversao) {
      return falhar({ conversao: { situacao: "falhou", detalhe: conversao.erro } }, conversao.erro, valor);
    }
    marcar({
      conversao: { situacao: "concluida", detalhe: `${valor} em stablecoin na sua carteira.`, hash: conversao.txHash },
      autorizacao: { situacao: "andamento", detalhe: "Confirme com a biometria ou o bloqueio de tela do aparelho." },
      compra: { situacao: "andamento" },
    });

    let operacao: { txHash: Hash; sucesso: boolean };
    try {
      operacao = await executarNaSafe({ passkey, carteira, chamadas: compra.chamadas });
    } catch (erro) {
      const mensagem = mensagemDaCarteira(erro);
      return falhar(
        { autorizacao: { situacao: "falhou", detalhe: mensagem }, compra: { situacao: "aguardando" } },
        mensagem,
        valor,
      );
    }

    const { txHash } = operacao;
    const registro = await registrar(txHash, compra.origem).catch(() => null);
    if (!operacao.sucesso) {
      const mensagem = registro && "erro" in registro ? registro.erro : "A compra não aconteceu.";
      return falhar(
        {
          autorizacao: { situacao: "falhou", hash: txHash },
          compra: { situacao: "falhou", detalhe: mensagem, hash: txHash },
        },
        mensagem,
        valor,
      );
    }

    marcar({
      autorizacao: { situacao: "concluida", detalhe: `${valor} autorizados ao contrato de venda.`, hash: txHash },
      compra: { situacao: "concluida", detalhe: `${formatarTokens(compra.quantidade)} entregues.`, hash: txHash },
    });
    if (!registro || "erro" in registro) {
      const mensagem = "A compra foi feita, mas não conseguimos reler o saldo agora. Confira a transação no explorador.";
      return falhar({ carteira: { situacao: "falhou", detalhe: mensagem } }, mensagem, valor);
    }
    marcar({ carteira: { situacao: "concluida", detalhe: `Você tem ${formatarTokens(registro.glampy)} Glampy.` } });
    setFase("concluida");
  }

  function recomecar() {
    setEtapas(INICIO);
    setFalha(undefined);
    setFase("escolhendo");
    router.refresh();
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="rounded-[20px] border border-borda bg-white p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Sua compra</h2>
          <span className="rounded-full bg-musgo px-3 py-1 text-sm font-medium text-folha">{ORIGEM[origem]}</span>
        </div>
        <dl className="mt-5 space-y-2 text-[15px]">
          <div className="flex flex-wrap justify-between gap-x-4">
            <dt className="text-cinza">Preço por token</dt>
            <dd className="font-medium">{formatarStable(precoUnitario)}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-x-4">
            <dt className="text-cinza">Você pode comprar até</dt>
            <dd className="font-medium">{formatarTokens(limite)}</dd>
          </div>
        </dl>
        <label className="mt-5 block text-[15px] font-medium" htmlFor="quantidade">
          Quantidade
        </label>
        <input
          id="quantidade"
          type="number"
          inputMode="numeric"
          min={1}
          max={Number(limite)}
          step={1}
          value={Number.isNaN(quantidade) ? "" : quantidade}
          onChange={(evento) => setQuantidade(evento.target.valueAsNumber)}
          disabled={fase !== "escolhendo"}
          className={`mt-2 ${classeDeCampo}`}
        />
        <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-4 border-t border-borda pt-5">
          <span className="text-[15px] text-cinza">Total</span>
          <span className="text-2xl font-semibold">{formatarStable(total)}</span>
        </div>
        {fase === "escolhendo" && (
          <>
            <p className="mt-4 text-sm leading-relaxed text-cinza">
              O PIX é simulado: esta é uma demonstração e nenhum dinheiro real é movimentado. Você confirma a compra uma vez
              só, com a biometria ou o bloqueio de tela, e não paga gas.
            </p>
            <button
              type="button"
              onClick={comprar}
              disabled={!quantidadeValida}
              className="mt-5 inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-folha text-base font-semibold text-white transition-colors hover:bg-mata disabled:opacity-60"
            >
              <Fingerprint className="size-5" strokeWidth={1.75} aria-hidden />
              Comprar
            </button>
          </>
        )}
      </div>

      {fase !== "escolhendo" && (
        <div className="rounded-[20px] border border-borda bg-white p-6 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Acompanhe a compra</h2>
            <span className="rounded-full bg-musgo px-3 py-1 text-sm font-medium text-folha">{ORIGEM[origemDaCompra]}</span>
          </div>
          <ol className="mt-5" aria-live="polite">
            {(Object.keys(ETAPAS_DA_COMPRA) as EtapaDaCompra[]).map((etapa, i, todas) => {
              const { situacao, detalhe, hash } = etapas[etapa];
              return (
                <li key={etapa} className="relative flex gap-3 pb-5 last:pb-0">
                  {i < todas.length - 1 && (
                    <span className="absolute left-[9.5px] top-7 bottom-1 w-px bg-borda" aria-hidden />
                  )}
                  <span className="mt-0.5 shrink-0">{ICONE[situacao]}</span>
                  <div className="min-w-0">
                    <p className={`text-[15px] font-medium ${situacao === "aguardando" ? "text-cinza" : ""}`}>
                      {ETAPAS_DA_COMPRA[etapa]}
                      <span className="sr-only">: {SITUACAO[situacao]}</span>
                    </p>
                    {detalhe && <p className="mt-1 text-sm leading-relaxed text-cinza">{detalhe}</p>}
                    {hash && (
                      <LinkDaTransacao hash={hash} className="mt-1 text-sm">
                        Transação
                      </LinkDaTransacao>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          {fase === "falhou" && falha && (
            <div role="alert" className="mt-6 rounded-lg bg-aviso px-4 py-4 text-[15px] leading-relaxed text-aviso-texto">
              <p className="font-medium">A compra parou: {falha.mensagem}</p>
              <p className="mt-2">
                {falha.cobrado
                  ? `Houve cobrança simulada de ${falha.cobrado} via PIX. Como é demonstração, nenhum dinheiro real saiu da sua conta.`
                  : "Nenhuma cobrança foi feita."}
              </p>
            </div>
          )}
          {fase === "concluida" && (
            <p role="status" className="mt-6 rounded-lg bg-musgo px-4 py-4 text-[15px] leading-relaxed text-folha">
              Compra concluída. Os tokens já estão na sua carteira.
            </p>
          )}
          {fase !== "comprando" && (
            <button
              type="button"
              onClick={recomecar}
              className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-lg border-[1.5px] border-folha text-base font-semibold text-folha transition-colors hover:bg-folha hover:text-white"
            >
              {fase === "concluida" ? "Comprar mais" : "Tentar de novo"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
