import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Glampy - Ibiti Projeto",
  description:
    "Um glamping no coração de 6 mil hectares em regeneração. Conheça o investimento e o membership do Ibiti Glamping.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth" className={`${figtree.variable} antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
