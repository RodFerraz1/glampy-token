import { Container, Rotulo, Titulo } from "./base";

export const etapas = [
  {
    titulo: "Conversa",
    quando: "Primeiro passo",
    texto: "Você fala com a equipe do Ibiti e tira suas dúvidas sobre o investimento e o membership.",
    quem: "Quem decide: você",
  },
  {
    titulo: "Qualificação",
    quando: "Depois da conversa",
    texto: "O Ibiti confirma sua identidade e se você se qualifica como investidor profissional.",
    quem: "Quem decide: o Ibiti",
  },
  {
    titulo: "Termos e decisão",
    quando: "Após a aprovação",
    texto: "Aprovado, você recebe os termos completos, os riscos e as regras de saída, e decide com calma.",
    quem: "Quem decide: você",
  },
  {
    titulo: "Entrada",
    quando: "Até dezembro de 2026",
    texto: "Você confirma com a biometria ou o bloqueio de tela do celular. A conta é aberta em seu nome, sem criptomoeda.",
    quem: "Quem confirma: você",
  },
  {
    titulo: "Durante os quatro ciclos",
    quando: "Abril de 2027 a março de 2031",
    texto: "Pagamento mensal do Glampy, relatório da receita e novo IbitiPass todo abril.",
    quem: "Quem apura a receita: o operador",
  },
  {
    titulo: "Encerramento ou saída",
    quando: "Até março de 2031",
    texto: "Os direitos terminam em março de 2031. Antes disso, é possível ofertar seus Glampy para revenda: o Ibiti tem 30 dias de preferência e o comprador precisa ser aprovado.",
    quem: "Sem garantia de comprador",
  },
];

export function ComoFunciona() {
  return (
    <section id="como-funciona" className="py-20 lg:py-30">
      <Container>
        <div className="max-w-[790px]">
          <Rotulo>Como funciona</Rotulo>
          <Titulo>Da primeira conversa ao último ciclo.</Titulo>
          <p className="mt-6 text-lg leading-[1.55] text-cinza sm:text-xl">
            Cada etapa diz quem decide. Termos, riscos e regras de saída são apresentados antes de qualquer compromisso.
          </p>
        </div>

        <ol className="relative mx-auto mt-16 max-w-[980px]">
          <span aria-hidden className="absolute top-0 bottom-0 left-[19px] w-px bg-folha/30 lg:left-1/2" />
          {etapas.map((etapa, i) => {
            const esquerda = i % 2 === 0;
            return (
              <li
                key={etapa.titulo}
                className={`relative pb-12 pl-16 last:pb-0 lg:w-1/2 lg:pl-0 ${
                  esquerda ? "lg:pr-16 lg:text-right" : "lg:ml-auto lg:pl-16"
                }`}
              >
                <span
                  className={`absolute top-0 left-0 flex size-10 items-center justify-center rounded-full border border-folha bg-creme text-base text-folha ${
                    esquerda ? "lg:right-0 lg:left-auto lg:translate-x-1/2" : "lg:-translate-x-1/2"
                  }`}
                >
                  {i + 1}
                </span>
                <p className="pt-2 text-[13px] font-semibold uppercase tracking-[0.14em] text-broto">{etapa.quando}</p>
                <h3 className="mt-2 text-[21px] font-medium text-folha">{etapa.titulo}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-cinza">{etapa.texto}</p>
                <p className="mt-3 text-[13px] font-semibold text-folha">{etapa.quem}</p>
              </li>
            );
          })}
        </ol>
      </Container>
    </section>
  );
}
