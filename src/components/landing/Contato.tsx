import { Aviso, Container, Rotulo, Titulo } from "./base";
import { FormularioContato } from "./FormularioContato";

export const proximosPassos = [
  "Uma conversa com a equipe do Ibiti, no canal que você preferir.",
  "Se fizer sentido, a qualificação como investidor profissional.",
  "Aprovado, os termos completos para você decidir com calma.",
];

export function Contato() {
  return (
    <section id="contato" className="py-20 lg:py-24">
      <Container className="grid items-start gap-12 lg:grid-cols-[1fr_620px] lg:gap-16">
        <div>
          <Rotulo>Vamos conversar</Rotulo>
          <Titulo>Conte um pouco sobre você.</Titulo>
          <p className="mt-6 text-lg leading-[1.55] text-cinza sm:text-xl">
            Alguém da equipe do Ibiti entra em contato em até 2 dias úteis para uma conversa sem compromisso sobre o
            investimento.
          </p>
          <h3 className="mt-10 text-[21px] font-medium">O que acontece depois</h3>
          <ol className="mt-5 space-y-5">
            {proximosPassos.map((passo, i) => (
              <li key={passo} className="flex gap-3 text-lg leading-[1.55] text-cinza sm:text-xl">
                <span className="mt-0.5 flex size-[26px] shrink-0 items-center justify-center rounded-full bg-musgo text-[13px] font-semibold text-folha">
                  {i + 1}
                </span>
                {passo}
              </li>
            ))}
          </ol>
          <div className="mt-10">
            <Aviso>
              Nesta etapa não pedimos documentos, patrimônio nem valores. A qualificação acontece depois da conversa.
            </Aviso>
          </div>
        </div>
        <FormularioContato />
      </Container>
    </section>
  );
}
