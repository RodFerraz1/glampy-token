"use client";

import { KeyRound } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { createWebAuthnCredential } from "viem/account-abstraction";
import { abrirPerdaDeAcesso, abrirSucessao, type EstadoDoPedido } from "@/app/investidor/recuperacao/acoes";
import { classeDeCampo } from "@/components/landing/base";
import { classeDoPrimario, classeDoTexto, Erro } from "@/components/plataforma/formulario";

const MOTIVOS = [
  ["perda_de_acesso", "Perdi o acesso à minha carteira", "Você cria uma passkey nova neste aparelho, e a posição vai para a carteira dela."],
  ["sucessao", "Sou herdeiro ou representante", "A posição do titular vem para a sua carteira."],
] as const;

function Justificativa({ valor, aoMudar }: { valor?: string; aoMudar?: (valor: string) => void }) {
  return (
    <div>
      <label htmlFor="justificativa" className="block text-[15px] font-medium">
        Justificativa
      </label>
      <p className="text-sm text-cinza">O Ibiti analisa o pedido e pode pedir documentos pelo canal de atendimento.</p>
      <textarea
        id="justificativa"
        name="justificativa"
        required
        rows={3}
        {...(aoMudar ? { value: valor, onChange: (evento) => aoMudar(evento.target.value) } : { defaultValue: valor })}
        className={`mt-2 ${classeDoTexto}`}
      />
    </div>
  );
}

const Aberto = () => (
  <p role="status" className="rounded-lg bg-musgo px-4 py-3 text-[15px] text-folha">
    Pedido aberto. Acompanhe o status abaixo.
  </p>
);

function PerdaDeAcesso({ email }: { email: string }) {
  const [justificativa, setJustificativa] = useState("");
  const [estado, setEstado] = useState<EstadoDoPedido>({});
  const [abrindo, iniciar] = useTransition();

  function abrir() {
    iniciar(async () => {
      let credencial;
      try {
        credencial = await createWebAuthnCredential({ name: email, rp: { id: window.location.hostname, name: "Ibiti Glamping" } });
      } catch {
        setEstado({ erro: "A confirmação foi cancelada ou este aparelho não cria passkeys. Tente de novo." });
        return;
      }
      const resultado = await abrirPerdaDeAcesso({ id: credencial.id, chavePublica: credencial.publicKey }, justificativa);
      setEstado(resultado);
      if (resultado.aberto) setJustificativa("");
    });
  }

  return (
    <div className="space-y-4">
      <Justificativa valor={justificativa} aoMudar={setJustificativa} />
      <Erro>{estado.erro}</Erro>
      {estado.aberto && <Aberto />}
      <button
        type="button"
        onClick={abrir}
        disabled={abrindo || !justificativa.trim()}
        className={`inline-flex w-full items-center justify-center gap-2 sm:w-auto ${classeDoPrimario}`}
      >
        <KeyRound className="size-5" strokeWidth={1.75} aria-hidden />
        {abrindo ? "Abrindo…" : "Criar a passkey nova e abrir o pedido"}
      </button>
    </div>
  );
}

function Sucessao() {
  const [estado, acao, abrindo] = useActionState(abrirSucessao, {});
  return (
    <form action={acao} className="space-y-4">
      <div>
        <label htmlFor="carteira" className="block text-[15px] font-medium">
          Carteira do titular
        </label>
        <input
          id="carteira"
          name="carteira"
          required
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="0x…"
          defaultValue={estado.carteira}
          className={`mt-2 font-mono ${classeDeCampo}`}
        />
      </div>
      <Justificativa valor={estado.justificativa} />
      <Erro>{estado.erro}</Erro>
      {estado.aberto && <Aberto />}
      <button type="submit" disabled={abrindo} className={`w-full sm:w-auto ${classeDoPrimario}`}>
        {abrindo ? "Abrindo…" : "Abrir pedido"}
      </button>
    </form>
  );
}

export function FormularioDeRecuperacao({ email }: { email: string }) {
  const [motivo, setMotivo] = useState<(typeof MOTIVOS)[number][0]>("perda_de_acesso");
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="text-[15px] font-medium">Motivo</legend>
        <div className="mt-2 space-y-2">
          {MOTIVOS.map(([valor, rotulo, nota]) => (
            <label key={valor} className="flex gap-3 rounded-lg border border-borda bg-white p-4 text-[15px]">
              <input
                type="radio"
                name="motivo"
                value={valor}
                checked={motivo === valor}
                onChange={() => setMotivo(valor)}
                className="mt-1 size-4 accent-folha"
              />
              <span>
                <span className="font-medium">{rotulo}</span>
                <span className="block text-sm text-cinza">{nota}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {motivo === "perda_de_acesso" ? <PerdaDeAcesso email={email} /> : <Sucessao />}
    </div>
  );
}
