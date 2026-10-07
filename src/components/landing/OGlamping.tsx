import { ArrowRight, Compass, Droplet, Tent, Utensils } from "lucide-react";
import { Container, Foto, Rotulo, Titulo } from "./base";

export const marcos = [
  { quando: "Abril de 2027", oque: "Abertura com 6 tendas" },
  { quando: "A partir de 2028", oque: "20 tendas, como prevê o contrato" },
];

export const experiencias = [
  {
    icone: Tent,
    titulo: "Hospedagem nas tendas",
    texto: "Cama, banho e deck privativos, no meio da mata.",
    foto: { src: "/fotos/interior-da-tenda.jpg", legenda: "Projeto do interior da tenda" },
  },
  {
    icone: Utensils,
    titulo: "Gastronomia do território",
    texto: "Cozinha com ingredientes da região.",
    foto: { src: "/fotos/varanda-do-restaurante.jpg", legenda: "Varanda com vista para a serra" },
  },
  {
    icone: Compass,
    titulo: "Trilhas, bike e cavalo",
    texto: "Passeios guiados pelo território.",
    foto: { src: "/fotos/passeio-a-cavalo.jpg", legenda: "Passeio a cavalo" },
  },
  {
    icone: Droplet,
    titulo: "Bem-estar",
    texto: "Terapias no Village Spa.",
    foto: { src: "/fotos/sala-de-massagem.jpg", legenda: "Sala de terapias" },
  },
];

export function OGlamping() {
  return (
    <section id="o-glamping" className="py-20 lg:py-30">
      <Container>
        <div className="max-w-[770px]">
          <Rotulo>O Glamping</Rotulo>
          <Titulo>Tendas belgas no meio da mata, com o conforto de um hotel.</Titulo>
          <p className="mt-6 text-lg leading-[1.55] text-cinza sm:text-xl">
            O Ibiti Glamping é construído e operado por um empreendedor parceiro, sob contrato com o Ibiti. A expansão
            para vinte tendas já está prevista nesse contrato.
          </p>
        </div>

        <ol className="mt-14 flex flex-col items-stretch gap-4 md:flex-row md:items-center md:gap-0">
          {marcos.map((marco, i) => (
            <li key={marco.quando} className="contents">
              {i > 0 && (
                <ArrowRight className="mx-auto size-6 shrink-0 rotate-90 text-folha md:mx-5 md:rotate-0" strokeWidth={1.5} aria-hidden />
              )}
              <div className="flex-1 rounded-[20px] border border-borda bg-white px-6 py-6">
                <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-broto">{marco.quando}</p>
                <p className="mt-1 text-[22px] font-medium">{marco.oque}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {experiencias.map(({ icone: Icon, titulo, texto, foto }) => (
            <article key={titulo}>
              <Foto
                src={foto.src}
                legenda={foto.legenda}
                sizes="(min-width: 1024px) 285px, (min-width: 640px) 50vw, 100vw"
                className="aspect-square"
              />
              <h3 className="mt-4 flex items-center gap-2.5 text-[21px] font-medium">
                <Icon className="size-6 shrink-0 text-folha" strokeWidth={1.5} aria-hidden />
                {titulo}
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-cinza">{texto}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
