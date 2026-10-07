"use client";

import { Fingerprint } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Address } from "viem";
import {
  pagarALiquidacao,
  prepararAIndicacao,
  prepararAOferta,
  prepararOCancelamento,
  registrarAIndicacao,
  registrarALiquidacao,
  registrarAOferta,
  registrarOCancelamento,
} from "@/app/investidor/revenda/acoes";
import type { Passkey } from "@/carteira/safe";
import { useOperacaoNaSafe } from "@/carteira/use-operacao-na-safe";
import { classeDeCampo } from "@/components/landing/base";
import { classeDoPrimario, classeDoSecundario, Erro } from "@/components/plataforma/formulario";
import { formatarReais, lerReais } from "@/formatacao";

interface Carteira {
  carteira: Address;
  passkey: Passkey;
}

function BotaoDaSafe({
  executar,
  executando,
  executada,
  rotulo,
  andamento,
  secundario,
  desabilitado,
}: {
  executar: () => void;
  executando: boolean;
  executada: boolean;
  rotulo: string;
  andamento: string;
  secundario?: boolean;
  desabilitado?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={executar}
      disabled={executando || desabilitado}
      className={`inline-flex w-full items-center justify-center gap-2 sm:w-auto ${secundario ? classeDoSecundario : classeDoPrimario}`}
    >
      <Fingerprint className="size-5" strokeWidth={1.75} aria-hidden />
      {executando ? andamento : executada ? "Registrar de novo" : rotulo}
    </button>
  );
}

export function FormularioDeOferta({
  livre,
  referenciaPorTokenCentavos,
  carteira,
  passkey,
}: Carteira & { livre: number; referenciaPorTokenCentavos: number }) {
  const router = useRouter();
  const [quantidade, setQuantidade] = useState(Math.min(1, livre));
  const [preco, setPreco] = useState("");
  const operacao = useOperacaoNaSafe({
    passkey,
    carteira,
    preparar: () => prepararAOferta(quantidade, preco),
    registrar: registrarAOferta,
    aoConcluir: () => {
      setPreco("");
      router.refresh();
    },
  });
  const quantidadeValida = Number.isSafeInteger(quantidade) && quantidade >= 1 && quantidade <= livre;
  const referencia = quantidadeValida ? referenciaPorTokenCentavos * quantidade : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="quantidade" className="block text-[15px] font-medium">
            Quantidade
          </label>
          <input
            id="quantidade"
            type="number"
            min={1}
            max={livre}
            step={1}
            inputMode="numeric"
            value={Number.isNaN(quantidade) ? "" : quantidade}
            onChange={(evento) => setQuantidade(evento.target.valueAsNumber)}
            className={`mt-2 ${classeDeCampo}`}
          />
          <p className="mt-1 text-sm text-cinza">Até {livre} livres na sua carteira.</p>
        </div>
        <div>
          <label htmlFor="preco" className="block text-[15px] font-medium">
            Preço do lote (R$)
          </label>
          <input
            id="preco"
            inputMode="decimal"
            placeholder={referencia ? formatarReais(referencia).replace(/^R\$\s/, "") : "0,00"}
            value={preco}
            onChange={(evento) => setPreco(evento.target.value)}
            className={`mt-2 ${classeDeCampo}`}
          />
          <p className="mt-1 text-sm text-cinza">Referência para este lote: {formatarReais(referencia)}</p>
        </div>
      </div>
      <Erro>{operacao.erro}</Erro>
      <BotaoDaSafe
        {...operacao}
        rotulo="Ofertar com biometria"
        andamento="Ofertando…"
        desabilitado={!quantidadeValida || !lerReais(preco)}
      />
    </div>
  );
}

export function CancelarOferta({ id, carteira, passkey }: Carteira & { id: string }) {
  const router = useRouter();
  const operacao = useOperacaoNaSafe({
    passkey,
    carteira,
    preparar: () => prepararOCancelamento(id),
    registrar: registrarOCancelamento,
    aoConcluir: () => router.refresh(),
  });
  return (
    <div className="mt-4 space-y-3">
      <Erro>{operacao.erro}</Erro>
      <BotaoDaSafe {...operacao} rotulo="Cancelar a oferta" andamento="Cancelando…" secundario />
    </div>
  );
}

export function IndicarComprador({ id, carteira, passkey }: Carteira & { id: string }) {
  const router = useRouter();
  const [comprador, setComprador] = useState("");
  const operacao = useOperacaoNaSafe({
    passkey,
    carteira,
    preparar: () => prepararAIndicacao(id, comprador),
    registrar: registrarAIndicacao,
    aoConcluir: () => router.refresh(),
  });
  const campo = `comprador-${id}`;
  return (
    <div className="mt-4 space-y-3">
      <label htmlFor={campo} className="block text-[15px] font-medium">
        Endereço da carteira do comprador
      </label>
      <p className="text-sm text-cinza">O comprador precisa ser investidor habilitado na plataforma. Ele encontra o endereço na tela de revenda dele.</p>
      <input
        id={campo}
        value={comprador}
        onChange={(evento) => setComprador(evento.target.value)}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="0x…"
        className={`font-mono ${classeDeCampo}`}
      />
      <Erro>{operacao.erro}</Erro>
      <BotaoDaSafe {...operacao} rotulo="Indicar com biometria" andamento="Indicando…" desabilitado={!comprador.trim()} />
    </div>
  );
}

export function LiquidarRevenda({ id, precoMinimo, carteira, passkey }: Carteira & { id: string; precoMinimo: string }) {
  const router = useRouter();
  const [preco, setPreco] = useState(precoMinimo);
  const operacao = useOperacaoNaSafe({
    passkey,
    carteira,
    preparar: () => pagarALiquidacao(id, preco),
    registrar: registrarALiquidacao,
    aoConcluir: () => router.refresh(),
  });
  const campo = `preco-final-${id}`;
  return (
    <div className="mt-4 space-y-3">
      <label htmlFor={campo} className="block text-[15px] font-medium">
        Preço final combinado (R$)
      </label>
      <input
        id={campo}
        inputMode="decimal"
        value={preco}
        onChange={(evento) => setPreco(evento.target.value)}
        className={classeDeCampo}
      />
      <p className="text-sm text-cinza">
        Não pode ficar abaixo do ofertado. O pagamento é via PIX (simulado), convertido em stablecoin para a sua carteira.
      </p>
      <Erro>{operacao.erro}</Erro>
      <BotaoDaSafe {...operacao} rotulo="Pagar e liquidar com biometria" andamento="Liquidando…" desabilitado={!lerReais(preco)} />
    </div>
  );
}
