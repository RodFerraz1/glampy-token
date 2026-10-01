import { Cabecalho } from "@/components/landing/Cabecalho";
import { ComoFunciona } from "@/components/landing/ComoFunciona";
import { Contato } from "@/components/landing/Contato";
import { Hero } from "@/components/landing/Hero";
import { Investimento } from "@/components/landing/Investimento";
import { OGlamping } from "@/components/landing/OGlamping";
import { OIbiti } from "@/components/landing/OIbiti";
import { Perguntas } from "@/components/landing/Perguntas";
import { Rodape } from "@/components/landing/Rodape";

export default function Home() {
  return (
    <>
      <Cabecalho />
      <main>
        <Hero />
        <OIbiti />
        <OGlamping />
        <Investimento />
        <ComoFunciona />
        <Perguntas />
        <Contato />
      </main>
      <Rodape />
    </>
  );
}
