import { LayoutDaArea } from "@/components/plataforma/LayoutDaArea";
import { exigirArea } from "@/servidor/sessao";

export default async function Layout({ children }: LayoutProps<"/investidor">) {
  const usuario = await exigirArea("investidor");
  return (
    <LayoutDaArea papel="investidor" email={usuario.email}>
      {children}
    </LayoutDaArea>
  );
}
