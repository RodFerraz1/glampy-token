"use client";

import { ChevronDown } from "lucide-react";
import { useRef, useState } from "react";
import { classeDeCampo } from "./base";
import { Dialogo } from "./Dialogo";
import { LinkPrivacidade } from "./LinkPrivacidade";

function Rotulo({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-[15px] font-medium">
      {children}
    </label>
  );
}

function Selecao({ id, placeholder, opcoes }: { id: string; placeholder: string; opcoes: string[] }) {
  return (
    <div className="relative">
      <select id={id} name={id} required defaultValue="" className={`${classeDeCampo} appearance-none pr-12 invalid:text-cinza`}>
        <option value="" disabled>
          {placeholder}
        </option>
        {opcoes.map((opcao) => (
          <option key={opcao} value={opcao} className="text-tinta">
            {opcao}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-tinta" strokeWidth={1.5} aria-hidden />
    </div>
  );
}

function Consentimento({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer gap-3 text-[15px] leading-relaxed">
      <input id={id} name={id} type="checkbox" required className="mt-0.5 size-5 shrink-0 cursor-pointer rounded accent-folha" />
      <span>{children}</span>
    </label>
  );
}

function porCanal(canal: string) {
  return canal === "WhatsApp" ? "pelo WhatsApp" : `por ${canal.toLowerCase()}`;
}

export function FormularioContato() {
  const formulario = useRef<HTMLFormElement>(null);
  const [enviado, setEnviado] = useState<{ nome: string; canal: string } | null>(null);

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    setEnviado({ nome: String(dados.get("nome")).trim().split(/\s+/)[0], canal: String(dados.get("canal")) });
  }

  function fechar() {
    setEnviado(null);
    formulario.current?.reset();
  }

  return (
    <>
      <form
        ref={formulario}
        onSubmit={enviar}
        className="space-y-5 rounded-3xl border border-borda bg-white p-6 sm:p-9"
      >
        <div>
          <Rotulo htmlFor="nome">Nome completo</Rotulo>
          <input id="nome" name="nome" required autoComplete="name" placeholder="Como você gostaria de ser chamado" className={classeDeCampo} />
        </div>
        <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
          <div>
            <Rotulo htmlFor="email">E-mail</Rotulo>
            <input id="email" name="email" type="email" required autoComplete="email" placeholder="voce@email.com" className={classeDeCampo} />
          </div>
          <div>
            <Rotulo htmlFor="telefone">Telefone</Rotulo>
            <input id="telefone" name="telefone" type="tel" required autoComplete="tel" placeholder="(00) 00000-0000" className={classeDeCampo} />
          </div>
        </div>
        <div>
          <Rotulo htmlFor="origem">Como você conhece o Ibiti?</Rotulo>
          <Selecao
            id="origem"
            placeholder="Selecione: hóspede, cliente, parceiro ou convite"
            opcoes={["Hóspede", "Cliente", "Parceiro", "Convite"]}
          />
        </div>
        <div>
          <Rotulo htmlFor="canal">Como prefere ser contatado?</Rotulo>
          <Selecao id="canal" placeholder="Selecione: telefone, WhatsApp ou e-mail" opcoes={["Telefone", "WhatsApp", "E-mail"]} />
        </div>
        <Consentimento id="ciente-restricao">
          Sei que o investimento é restrito a investidores profissionais e depende de aprovação do Ibiti.
        </Consentimento>
        <Consentimento id="autoriza-contato">
          Autorizo o Ibiti a usar estes dados para entrar em contato. Ver{" "}
          <LinkPrivacidade className="underline underline-offset-2 hover:text-folha">política de privacidade</LinkPrivacidade>
          .
        </Consentimento>
        <button
          type="submit"
          className="h-[52px] w-full rounded-lg bg-folha text-base font-semibold text-white transition-colors hover:bg-mata"
        >
          Quero ser um investidor
        </button>
      </form>
      <Dialogo aberto={enviado !== null} aoFechar={fechar} titulo={`Obrigado, ${enviado?.nome}.`} rotuloDoBotao="Entendi">
        <p>
          Recebemos o seu contato. Alguém da equipe do Ibiti vai falar com você {enviado && porCanal(enviado.canal)} em
          até 2 dias úteis, para uma conversa sem compromisso sobre o investimento.
        </p>
      </Dialogo>
    </>
  );
}
