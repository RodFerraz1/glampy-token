import { House, Leaf, Users } from "lucide-react";
import { Cartao, Container, Foto, Icone, Rotulo, Titulo } from "./base";

export const numeros = [
  { valor: "43 anos", descricao: "de trajetória do Ibiti Projeto" },
  { valor: "96%", descricao: "do território em regeneração ativa" },
  { valor: "6 mil ha", descricao: "de área em Minas Gerais" },
];

export const principios = [
  {
    icone: Leaf,
    titulo: "Regenerar antes de construir",
    texto: "Cada estrutura nova ocupa uma fração mínima do território e respeita o que está em recuperação.",
  },
  {
    icone: Users,
    titulo: "Pertencer, não só consumir",
    texto: "Quem frequenta o Ibiti é reconhecido pelo envolvimento com o território, e não pelo quanto gasta.",
  },
  {
    icone: House,
    titulo: "Crescer com quem vive aqui",
    texto: "A comunidade do entorno faz parte do projeto desde o início, com iniciativas próprias e independentes do Glamping.",
  },
];

export function OIbiti() {
  return (
    <section id="o-ibiti" className="bg-areia py-20 lg:py-30">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_480px] lg:gap-16">
          <div>
            <Rotulo>O Ibiti</Rotulo>
            <Titulo>Um território que se reconstrói há 43 anos.</Titulo>
            <p className="mt-6 text-lg leading-[1.55] text-cinza sm:text-xl">
              O Ibiti Projeto nasceu para devolver à terra o que foi tirado dela. Hoje, quase todo o território está em
              regeneração ativa, com nascentes monitoradas, brigada de incêndio própria e uma comunidade que faz parte
              da história do lugar.
            </p>
          </div>
          <Foto
            src="/fotos/vista-aerea-do-territorio.jpg"
            legenda="Mata em regeneração no território"
            sizes="(min-width: 1024px) 480px, 100vw"
            className="aspect-[480/340]"
          />
        </div>

        <dl className="mt-16 grid gap-6 sm:grid-cols-3 lg:mt-12">
          {numeros.map((numero) => (
            <div key={numero.valor} className="border-t-2 border-folha pt-5">
              <dt className="text-[40px] font-bold leading-none tracking-[-0.02em] text-folha sm:text-[48px]">
                {numero.valor}
              </dt>
              <dd className="mt-3 text-lg text-cinza">{numero.descricao}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {principios.map((principio) => (
            <Cartao key={principio.titulo}>
              <Icone icone={principio.icone} />
              <h3 className="mt-10 text-[22px] font-medium leading-tight">{principio.titulo}</h3>
              <p className="mt-4 text-[15px] leading-relaxed text-cinza">{principio.texto}</p>
            </Cartao>
          ))}
        </div>
      </Container>
    </section>
  );
}
