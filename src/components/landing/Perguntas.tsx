import { Minus, Plus } from "lucide-react";
import { Container, Rotulo, Titulo } from "./base";

export const perguntas = [
  {
    pergunta: "O que é o Glampy, o token de investimento?",
    resposta:
      "É o token que registra o seu investimento no Glamping, em seu nome. De abril de 2027 a março de 2031, cada Glampy dá direito a uma fração da receita do Glamping, paga todo mês. O pagamento acompanha a receita real e pode ser zero em algum mês.",
  },
  {
    pergunta: "Para quem é o investimento?",
    resposta:
      "Para investidores profissionais, nos termos da regulamentação da CVM, com limite de 40 Glampy por pessoa. A entrada depende de aprovação do Ibiti, que confirma a identidade e a qualificação depois da primeira conversa.",
  },
  {
    pergunta: "Quanto custa?",
    resposta:
      "O valor do Glampy e as condições são apresentados junto com os termos completos, os riscos e as regras de saída, depois da qualificação. Na primeira conversa não pedimos documentos, patrimônio nem valores.",
  },
  {
    pergunta: "O que é o membership?",
    resposta:
      "É o IbitiPass, o token de benefícios. Todo abril, quem tem Glampy recebe um IbitiPass para cada Glampy e troca por hospedagem, gastronomia, passeios e bem-estar no Ibiti, pagando 40% a menos que o preço de tabela. O IbitiPass não acumula: o que não for usado no ciclo expira.",
  },
  {
    pergunta: "Qual a diferença entre o Glampy e o IbitiPass?",
    resposta:
      "O Glampy é o investimento: é o que você compra, dá direito à receita do Glamping e pode ser ofertado para revenda. O IbitiPass é o membership: vem com o Glampy, não é vendido à parte, não vira dinheiro e serve só para experiências no território. Quanto mais Glampy, mais IbitiPass por ano.",
  },
  {
    pergunta: "Posso sair antes dos quatro anos?",
    resposta:
      "Sim. Antes de os direitos terminarem, em março de 2031, é possível ofertar seus Glampy para revenda. O Ibiti tem 30 dias de preferência e o comprador precisa ser aprovado. Não há garantia de comprador.",
  },
  {
    pergunta: "E se o Glamping faturar menos do que o esperado?",
    resposta:
      "O pagamento mensal do Glampy é calculado sobre a receita real do Glamping. Se a receita cai, o pagamento cai junto, e pode ser zero em algum mês. Não há retorno garantido. O IbitiPass não depende da receita: são sempre um por Glampy, todo ano.",
  },
  {
    pergunta: "Preciso entender de blockchain?",
    resposta:
      "Não. A conta é aberta em seu nome e você confirma com a biometria ou o bloqueio de tela do celular, sem criptomoeda. Os tokens ficam em segundo plano e servem para que cada pagamento e cada uso do IbitiPass tenham registro.",
  },
];

export function Perguntas() {
  return (
    <section id="perguntas" className="bg-areia py-20 lg:py-24">
      <Container className="grid items-start gap-10 lg:grid-cols-[1fr_735px] lg:gap-16">
        <div>
          <Rotulo>Perguntas frequentes</Rotulo>
          <Titulo>O que costumam perguntar antes de conversar.</Titulo>
          <p className="mt-6 text-lg leading-[1.55] text-cinza sm:text-xl">
            Respostas curtas, com as restrições ditas de frente.
          </p>
        </div>
        <div className="space-y-3">
          {perguntas.map((item, i) => (
            <details
              key={item.pergunta}
              name="perguntas"
              open={i === 0}
              className="group rounded-2xl border border-borda bg-white"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 px-6 py-5 text-xl font-medium [&::-webkit-details-marker]:hidden">
                {item.pergunta}
                <Plus className="size-6 shrink-0 text-folha group-open:hidden" strokeWidth={1.5} aria-hidden />
                <Minus className="hidden size-6 shrink-0 text-folha group-open:block" strokeWidth={1.5} aria-hidden />
              </summary>
              <p className="-mt-1 px-6 pb-6 text-lg leading-[1.55] text-cinza">{item.resposta}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
