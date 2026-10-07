"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ABAS = [
  { href: "/ibiti/beneficios/catalogo", texto: "Catálogo" },
  { href: "/ibiti/beneficios/resgates", texto: "Resgates" },
];

export function AbasDoPassaporte() {
  const caminho = usePathname();
  return (
    <nav aria-label="Seções do Passaporte Ibiti" className="mt-6 flex gap-6 border-b border-borda">
      {ABAS.map(({ href, texto }) => {
        const ativa = caminho.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={ativa ? "page" : undefined}
            className={`-mb-px border-b-2 pb-3 text-base font-medium transition-colors ${
              ativa ? "border-folha text-folha" : "border-transparent text-cinza hover:text-tinta"
            }`}
          >
            {texto}
          </Link>
        );
      })}
    </nav>
  );
}
