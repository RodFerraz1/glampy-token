import { Aviso, BotaoPrimario, BotaoSecundario, Container, Foto, Rotulo } from "./base";

export function Hero() {
  return (
    <section id="inicio" className="py-16 lg:py-24">
      <Container className="grid items-start gap-12 lg:grid-cols-[1fr_560px] lg:gap-14">
        <div>
          <Rotulo>Ibiti Glamping · Minas Gerais</Rotulo>
          <h1 className="mt-6 text-[44px] font-bold leading-[1.1] tracking-[-0.025em] sm:text-[60px]">
            Um glamping no coração de 6 mil hectares em regeneração.
          </h1>
          <p className="mt-8 text-lg leading-[1.55] text-cinza sm:text-xl">
            O Ibiti está abrindo o investimento no Glamping, que abre em abril de 2027. Por quatro anos, quem investe
            recebe todo mês uma fração da receita do Glamping e, todo ano, o membership: tokens de benefício para
            trocar por experiências no território.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <BotaoPrimario href="#contato">Quero ser um investidor</BotaoPrimario>
            <BotaoSecundario href="#investimento" className="h-[52px] text-base">
              Entender o investimento
            </BotaoSecundario>
          </div>
          <div className="mt-6">
            <Aviso>
              Conversa sem compromisso. O investimento é restrito a investidores profissionais e depende de aprovação do
              Ibiti.
            </Aviso>
          </div>
        </div>
        <Foto
          src="/fotos/tendas-ao-entardecer.jpg"
          legenda="Projeto das tendas do Glamping"
          sizes="(min-width: 1024px) 560px, 100vw"
          preload
          className="aspect-[4/5] lg:aspect-auto lg:h-[620px]"
        />
      </Container>
    </section>
  );
}
