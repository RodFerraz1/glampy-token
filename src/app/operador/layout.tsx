import { LayoutDaArea } from "@/components/plataforma/LayoutDaArea";
import { exigirArea } from "@/servidor/sessao";

export default async function Layout({ children }: LayoutProps<"/operador">) {
  const usuario = await exigirArea("operador");
  return (
    <LayoutDaArea papel="operador" email={usuario.email}>
      {children}
    </LayoutDaArea>
  );
}
