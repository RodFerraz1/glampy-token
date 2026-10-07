import type { LucideIcon } from "lucide-react";
import { Check, ChartLine, CircleX, Eye, RotateCw, Star, Ticket } from "lucide-react";
import { Container, Icone, Rotulo, Titulo } from "./base";

export const tokens: {
  icone: LucideIcon;
  tipo: string;
  nome: string;
  destaque?: string;
  texto: string;
  pontos: string[];
}[] = [
  {
    icone: ChartLine,
    tipo: "Token de investimento",
    nome: "Glampy",
    texto: "É o que você compra. Cada Glampy dá direito, todo mês, a uma fração da receita do Glamping, por quatro anos.",
    pontos: [
      "Pagamento mensal sobre a receita real, que pode ser zero em algum mês",
      "Restrito a investidores profissionais, até 40 Glampy por pessoa",
      "Pode ser ofertado para revenda antes do fim dos direitos",
    ],
  },
  {
    icone: Ticket,
    tipo: "Token de benefícios",
    nome: "IbitiPass",
    destaque: "O membership",
    texto:
      "Vem com o Glampy, não se compra à parte. Todo abril, você recebe um IbitiPass para cada Glampy que tem e troca por experiências no Ibiti.",
    pontos: [
      "Hospedagem, gastronomia, passeios e bem-estar do catálogo do Ibiti",
      "40% abaixo do preço de tabela, e pode ser usado em frações",
      "Não acumula: o que não for usado no ciclo expira",
    ],
  },
];

export const ciclos = [
  { numero: 1, periodo: "abr 2027 – mar 2028" },
  { numero: 2, periodo: "abr 2028 – mar 2029" },
  { numero: 3, periodo: "abr 2029 – mar 2030" },
  { numero: 4, periodo: "abr 2030 – mar 2031" },
];

export const alemDosTokens = [
  {
    icone: Star,
    titulo: "Reconhecimento como membro",
    texto:
      "Você passa a fazer parte da comunidade que tornou o Glamping possível. O reconhecimento é o mesmo para todos os membros, qualquer que seja o valor investido.",
  },
  {
    icone: Eye,
    titulo: "Acompanhamento transparente",
    texto: "Relatório mensal da receita e registro público de cada pagamento, para conferir quando quiser.",
  },
];

export const naoE = [
  "Não é participação societária no Ibiti nem no Glamping.",
  "Não é propriedade de terra, de tenda ou de qualquer imóvel.",
  "Não tem retorno garantido: os pagamentos acompanham a receita real e podem ser zero em algum mês.",
  "Não dá acesso ilimitado ao Glamping: o IbitiPass tem saldo por ciclo e as experiências dependem de disponibilidade.",
];

export function Investimento() {
  return (
    <section id="investimento" className="bg-mata py-20 text-white lg:py-30">
      <Container>
        <div className="max-w-[860px]">
          <Rotulo className="text-white/85">Investimento e membership</Rotulo>
          <Titulo>Dois tokens, cada um com o seu papel.</Titulo>
          <p className="mt-6 text-lg leading-[1.55] text-white/85 sm:text-xl">
            Quem investe no Glamping financia parte do projeto e recebe o Glampy, o token de investimento. Cada Glampy
            dá direito, todo ano, ao IbitiPass, o token de benefícios para usar no território. É o IbitiPass que forma o
            membership.
          </p>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-2">
          {tokens.map((token) => (
            <article key={token.nome} className="flex flex-col rounded-[20px] bg-white p-7 text-tinta sm:p-9">
              <div className="flex items-start justify-between gap-4">
                <Icone icone={token.icone} />
                {token.destaque && (
                  <span className="rounded-full bg-musgo px-3 py-1 text-[13px] font-semibold text-folha">
                    {token.destaque}
                  </span>
                )}
              </div>
              <p className="mt-8 text-[13px] font-semibold uppercase tracking-[0.14em] text-broto">{token.tipo}</p>
              <h3 className="mt-1.5 text-[34px] font-bold leading-none tracking-[-0.02em]">{token.nome}</h3>
              <p className="mt-5 text-lg leading-[1.55] text-cinza">{token.texto}</p>
              <ul className="mt-6 space-y-3 border-t border-borda pt-6">
                {token.pontos.map((ponto) => (
                  <li key={ponto} className="flex gap-3 text-[15px] leading-relaxed">
                    <Check className="mt-0.5 size-5 shrink-0 text-folha" strokeWidth={2} aria-hidden />
                    {ponto}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <h3 className="mt-20 text-[21px] font-medium">Quatro ciclos, de abril a março</h3>
        <ol className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {ciclos.map((ciclo) => (
            <li key={ciclo.numero} className="rounded-xl border border-white/15 bg-mata-clara px-5 py-5">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/85">Ciclo {ciclo.numero}</p>
              <p className="mt-1.5 text-[21px] font-medium">{ciclo.periodo}</p>
              <p className="mt-2 flex items-center gap-2 text-[15px] text-white/85">
                <RotateCw className="size-4" strokeWidth={2} aria-hidden />
                Novo IbitiPass em abril
              </p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-[15px] text-white/85">
          O Glampy paga todo mês durante os quatro ciclos. O último pagamento acontece em abril de 2031, quando os
          direitos se encerram.
        </p>

        <h3 className="mt-20 text-[25px] font-medium">Além dos tokens</h3>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {alemDosTokens.map((item) => (
            <div key={item.titulo} className="flex gap-5 rounded-[20px] border border-white/15 bg-mata-clara p-7">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-[10px] bg-white/10">
                <item.icone className="size-5" strokeWidth={1.75} aria-hidden />
              </span>
              <div>
                <h4 className="text-[21px] font-medium leading-tight">{item.titulo}</h4>
                <p className="mt-2 text-[15px] leading-relaxed text-white/85">{item.texto}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-2">
          <div className="rounded-[20px] border border-white/15 bg-mata-clara p-8">
            <h3 className="text-2xl font-medium">Por que esse modelo</h3>
            <dl>
              <dt className="mt-5 text-xs font-medium uppercase tracking-[0.16em] text-white/85">Para o Ibiti</dt>
              <dd className="mt-1.5 text-lg leading-[1.55] text-white/90">
                Recursos para a regeneração e a infraestrutura do território, sem vender nenhuma parte da terra ou da
                organização.
              </dd>
              <dt className="mt-6 text-xs font-medium uppercase tracking-[0.16em] text-white/85">Para quem investe</dt>
              <dd className="mt-1.5 text-lg leading-[1.55] text-white/90">
                Uma fração da receita do Glamping e, pelo membership, um vínculo real com o território, com experiências
                todos os anos.
              </dd>
            </dl>
          </div>
          <div className="rounded-[20px] bg-white p-8 text-tinta">
            <h3 className="text-2xl font-medium">O que o investimento não é</h3>
            <ul className="mt-5 space-y-4">
              {naoE.map((item) => (
                <li key={item} className="flex gap-4 text-lg leading-[1.55]">
                  <CircleX className="mt-1 size-5 shrink-0 text-aviso-texto" strokeWidth={1.75} aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}
