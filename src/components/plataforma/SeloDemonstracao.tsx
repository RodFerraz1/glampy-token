import { FlaskConical } from "lucide-react";

/** Marca o que é simulado: apurações, rendimentos e informe não movimentam dinheiro real. */
export function SeloDemonstracao() {
  return (
    <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full bg-aviso px-3 py-1 text-sm font-medium text-aviso-texto">
      <FlaskConical className="size-4" strokeWidth={2} aria-hidden />
      Demonstração
    </span>
  );
}
