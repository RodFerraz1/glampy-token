"use client";

import { Circle, CircleCheck, FlaskConical, LoaderCircle } from "lucide-react";
import { useRef, useState } from "react";
import type { Hash } from "viem";
import { registrar } from "@/app/ibiti/apuracoes/acoes";
import { classeDeCampo } from "@/components/landing/base";
import { classeDoPrimario, classeDoSecundario, Erro } from "@/components/plataforma/formulario";
import { abreviarHash } from "@/explorador";
import { formatarReais, lerReais } from "@/formatacao";
import { hashDoRelatorio, TAMANHO_MAXIMO_DO_RELATORIO } from "@/relatorio-de-apuracao";
import { calcularApuracao } from "@/royalty";

const ETAPAS = {
  registro: "Relatório e faturamento registrados",
  deposito: "Depósito do royalty na tesouraria",
  autorizacao: "Autorização pela Safe de tesouraria",
  distribuicao: "Depósito no contrato de distribuição",
  pagamento: "Pagamento aos detentores",
};

type Etapa = keyof typeof ETAPAS;
type Situacao = "aguardando" | "andamento" | "concluida" | "simulada";

const SIMULADAS: Exclude<Etapa, "registro">[] = ["deposito", "autorizacao", "distribuicao", "pagamento"];

const ICONE: Record<Situacao, React.ReactNode> = {
  aguardando: <Circle className="size-5 text-borda" strokeWidth={2} aria-hidden />,
  andamento: <LoaderCircle className="size-5 animate-spin text-folha" strokeWidth={2} aria-hidden />,
  concluida: <CircleCheck className="size-5 text-folha" strokeWidth={2} aria-hidden />,
  simulada: <FlaskConical className="size-5 text-aviso-texto" strokeWidth={2} aria-hidden />,
};

const SITUACAO: Record<Situacao, string> = {
  aguardando: "aguardando",
  andamento: "em andamento",
  concluida: "concluída",
  simulada: "simulada",
};

const INICIO = Object.fromEntries(Object.keys(ETAPAS).map((etapa) => [etapa, "aguardando"])) as Record<Etapa, Situacao>;

type Leitura = { hash: string } | { erro: string };
type Registrada = { rotulo: string; faturamentoCentavos: number; royaltyCentavos: number; valorPorTokenCentavos: number; hashRelatorio: Hash };

const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

function detalhes({ rotulo, faturamentoCentavos, royaltyCentavos, valorPorTokenCentavos, hashRelatorio }: Registrada) {
  const royalty = formatarReais(royaltyCentavos);
  return {
    registro: `Apuração de ${rotulo} gravada com o hash ${abreviarHash(hashRelatorio)} do relatório.`,
    deposito: `Fora da demonstração, o Ibiti converte ${royalty} (15% de ${formatarReais(faturamentoCentavos)}) em stablecoin e deposita na Safe de tesouraria.`,
    autorizacao: `Fora da demonstração, 2 de 3 diretores assinam a transação que autoriza a distribuição a puxar ${royalty} da tesouraria.`,
    distribuicao:
      "Fora da demonstração, faturamento, royalty e hash ficam gravados on-chain, e o contrato recusa o depósito se o royalty não for 15% do faturamento.",
    pagamento: `Na mesma transação, cada detentor receberia ${formatarReais(valorPorTokenCentavos)} por token que tinha no fechamento do mês. Aqui o valor aparece nos rendimentos de cada investidor.`,
  } satisfies Record<Etapa, string>;
}

export function FormularioApuracao({ periodo, rotulo }: { periodo: number; rotulo: string }) {
  const formulario = useRef<HTMLFormElement>(null);
  const confirmacao = useRef<HTMLDialogElement>(null);
  const [fase, setFase] = useState<"preenchendo" | "registrando" | "distribuindo" | "concluida">("preenchendo");
  const [erro, setErro] = useState<string>();
  const [leitura, setLeitura] = useState<Leitura | null>(null);
  const [faturamentoCentavos, setFaturamentoCentavos] = useState<number | null>(null);
  const [registrada, setRegistrada] = useState<Registrada>();
  const [etapas, setEtapas] = useState(INICIO);

  const calculo = faturamentoCentavos ? calcularApuracao(faturamentoCentavos) : null;
  const marcar = (atualizacao: Partial<Record<Etapa, Situacao>>) => setEtapas((atual) => ({ ...atual, ...atualizacao }));

  async function ler(arquivo: File | undefined) {
    if (!arquivo) return setLeitura(null);
    if (arquivo.size > TAMANHO_MAXIMO_DO_RELATORIO) return setLeitura({ erro: "O relatório tem de ter até 4 MB." });
    setLeitura({ hash: hashDoRelatorio(new Uint8Array(await arquivo.arrayBuffer())) });
  }

  function revisar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const faturamento = lerReais(String(new FormData(evento.currentTarget).get("faturamento") ?? ""));
    if (!faturamento) return setErro("Informe o faturamento do mês.");
    setErro(undefined);
    setFaturamentoCentavos(faturamento);
    confirmacao.current?.showModal();
  }

  async function confirmar() {
    confirmacao.current?.close();
    if (!formulario.current) return;
    setEtapas({ ...INICIO, registro: "andamento" });
    setFase("registrando");

    const resultado = await registrar(periodo, new FormData(formulario.current)).catch(() => ({
      erro: "Não foi possível falar com o servidor.",
    }));
    if ("erro" in resultado) {
      setErro(resultado.erro);
      return setFase("preenchendo");
    }
    setRegistrada({ rotulo, ...resultado });
    marcar({ registro: "concluida" });
    setFase("distribuindo");
    for (const etapa of SIMULADAS) {
      marcar({ [etapa]: "andamento" });
      await esperar(700);
      marcar({ [etapa]: "simulada" });
    }
    setFase("concluida");
  }

  function proxima() {
    setFase("preenchendo");
    setLeitura(null);
    setFaturamentoCentavos(null);
    setRegistrada(undefined);
    setEtapas(INICIO);
  }

  const textos = registrada ? detalhes(registrada) : null;

  return (
    <>
      {(fase === "preenchendo" || fase === "registrando") && (
        <form ref={formulario} onSubmit={revisar} className="space-y-4">
          <p className="text-[15px] text-cinza">
            Período: <span className="font-medium text-tinta">{rotulo}</span>
          </p>
          <div>
            <label htmlFor="faturamento" className="block text-[15px] font-medium">
              Faturamento do mês (R$)
            </label>
            <input
              id="faturamento"
              name="faturamento"
              required
              inputMode="decimal"
              placeholder="1.000.000,00"
              className={`mt-2 ${classeDeCampo}`}
            />
            <p className="mt-1 text-sm text-cinza">O royalty é 15% deste valor, dividido pelos 300 tokens.</p>
          </div>
          <div>
            <label htmlFor="relatorio" className="block text-[15px] font-medium">
              Relatório de apuração (PDF)
            </label>
            <input
              id="relatorio"
              name="relatorio"
              type="file"
              required
              accept="application/pdf"
              onChange={(evento) => ler(evento.target.files?.[0])}
              className={`mt-2 ${classeDeCampo} file:mr-4 file:rounded-md file:border-0 file:bg-folha/10 file:px-3 file:py-1.5 file:text-[15px] file:font-medium file:text-folha`}
            />
            <p className="mt-1 text-sm text-cinza">
              O documento que fecha o faturamento do mês, com até 4 MB. Ele fica público para os investidores baixarem.
            </p>
            {leitura && "hash" in leitura && (
              <div className="mt-3 rounded-lg bg-creme px-4 py-3">
                <p className="text-sm text-cinza">Hash do relatório, calculado a partir do arquivo</p>
                <p className="mt-1 break-all font-mono text-sm">{leitura.hash}</p>
                <p className="mt-2 text-sm text-cinza">
                  É a impressão digital do arquivo e fica registrada com a apuração. Qualquer alteração no PDF muda o hash.
                </p>
              </div>
            )}
          </div>
          <Erro>{leitura && "erro" in leitura ? leitura.erro : erro}</Erro>
          <button
            type="submit"
            disabled={fase === "registrando" || (!!leitura && "erro" in leitura)}
            className={`w-full sm:w-auto ${classeDoPrimario}`}
          >
            {fase === "registrando" ? "Registrando…" : "Registrar apuração"}
          </button>
        </form>
      )}

      <dialog
        ref={confirmacao}
        aria-labelledby="titulo-da-confirmacao"
        className="m-auto w-[calc(100%-32px)] max-w-[520px] rounded-[20px] bg-white p-6 text-tinta backdrop:bg-tinta/40 sm:p-7"
      >
        <h2 id="titulo-da-confirmacao" className="text-xl font-semibold">
          Registrar a apuração de {rotulo}
        </h2>
        {calculo && faturamentoCentavos && (
          <dl className="mt-4 space-y-1.5 text-[15px]">
            <div className="flex justify-between gap-4">
              <dt className="text-cinza">Faturamento</dt>
              <dd className="font-medium">{formatarReais(faturamentoCentavos)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-cinza">Royalty (15%)</dt>
              <dd className="font-medium">{formatarReais(calculo.royaltyCentavos)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-cinza">Por token (÷ 300)</dt>
              <dd className="font-medium">{formatarReais(calculo.valorPorTokenCentavos)}</dd>
            </div>
          </dl>
        )}
        <div className="mt-5 rounded-lg bg-aviso px-4 py-4 text-[15px] leading-relaxed text-aviso-texto">
          <p className="flex items-center gap-2 font-medium">
            <FlaskConical className="size-4 shrink-0" strokeWidth={2} aria-hidden />
            Ao confirmar, haverá uma simulação de distribuição de dividendos.
          </p>
          <p className="mt-2">Nenhum dinheiro é movimentado: os valores aparecem nos rendimentos de cada investidor.</p>
        </div>
        <p className="mt-4 text-[15px] leading-relaxed text-cinza">
          Fora da demonstração, este é o momento do depósito financeiro: o Ibiti deposita o royalty em stablecoin na
          tesouraria, e o contrato de distribuição paga todos os detentores na mesma transação. Uma apuração registrada não
          pode ser desfeita.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => confirmacao.current?.close()} className={classeDoSecundario}>
            Cancelar
          </button>
          <button type="button" onClick={confirmar} className={classeDoPrimario}>
            Registrar e simular
          </button>
        </div>
      </dialog>

      {fase !== "preenchendo" && (
        <div className={fase === "registrando" ? "mt-6" : ""}>
          <h3 className="text-lg font-semibold">Distribuição de dividendos</h3>
          <ol className="mt-4" aria-live="polite">
            {(Object.keys(ETAPAS) as Etapa[]).map((etapa, i, todas) => {
              const situacao = etapas[etapa];
              return (
                <li key={etapa} className="relative flex gap-3 pb-5 last:pb-0">
                  {i < todas.length - 1 && <span className="absolute left-[9.5px] top-7 bottom-1 w-px bg-borda" aria-hidden />}
                  <span className="mt-0.5 shrink-0">{ICONE[situacao]}</span>
                  <div className="min-w-0">
                    <p className={`flex flex-wrap items-center gap-2 text-[15px] font-medium ${situacao === "aguardando" ? "text-cinza" : ""}`}>
                      {ETAPAS[etapa]}
                      {etapa !== "registro" && (
                        <span className="rounded-full bg-aviso px-2 py-0.5 text-xs font-medium text-aviso-texto">Simulada</span>
                      )}
                      <span className="sr-only">: {SITUACAO[situacao]}</span>
                    </p>
                    {textos && situacao !== "aguardando" && (
                      <p className="mt-1 text-sm leading-relaxed text-cinza">{textos[etapa]}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          {fase === "concluida" && (
            <>
              <p role="status" className="mt-6 rounded-lg bg-musgo px-4 py-4 text-[15px] leading-relaxed text-folha">
                Apuração registrada e distribuição simulada. Os investidores já veem o valor do mês nos rendimentos.
              </p>
              <button type="button" onClick={proxima} className={`mt-5 w-full sm:w-auto ${classeDoSecundario}`}>
                Registrar a próxima apuração
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
