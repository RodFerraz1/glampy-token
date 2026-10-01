import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Icone } from "@/components/landing/base";

export interface Atalho {
  href: string;
  icone: LucideIcon;
  titulo: string;
  descricao: string;
}

export function Atalhos({ atalhos, className = "" }: { atalhos: Atalho[]; className?: string }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {atalhos.map(({ href, icone, titulo, descricao }) => (
        <Link
          key={href}
          href={href}
          className="flex items-center gap-4 rounded-[20px] border border-borda bg-white p-6 transition-colors hover:border-folha sm:p-7"
        >
          <Icone icone={icone} />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold">{titulo}</p>
            <p className="mt-1 text-[15px] text-cinza">{descricao}</p>
          </div>
          <ChevronRight className="size-5 shrink-0 text-cinza" strokeWidth={2} aria-hidden />
        </Link>
      ))}
    </div>
  );
}
