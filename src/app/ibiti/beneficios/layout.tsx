import { AbasDoPassaporte } from "@/components/plataforma/AbasDoPassaporte";
import { LinkDeVolta } from "@/components/plataforma/LinkDeVolta";

export default function Layout({ children }: LayoutProps<"/ibiti/beneficios">) {
  return (
    <>
      <LinkDeVolta href="/ibiti">Painel IBITI</LinkDeVolta>
      <h1 className="mt-4 text-[32px] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[40px]">
        Token de Benefícios - Passaporte Ibiti
      </h1>
      <AbasDoPassaporte />
      <div className="mt-8">{children}</div>
    </>
  );
}
