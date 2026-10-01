import { LayoutDaArea } from "@/components/plataforma/LayoutDaArea";
import { exigirArea } from "@/servidor/sessao";

export default async function Layout({ children }: LayoutProps<"/ibiti">) {
  const usuario = await exigirArea("administrador");
  return (
    <LayoutDaArea papel="administrador" email={usuario.email}>
      {children}
    </LayoutDaArea>
  );
}
