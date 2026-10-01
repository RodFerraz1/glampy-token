import { Aviso } from "@/components/landing/base";

export const classeDoPrimario =
  "h-12 rounded-lg bg-folha px-6 text-base font-semibold text-white transition-colors hover:bg-mata disabled:opacity-60";
export const classeDoSecundario =
  "h-12 rounded-lg border-[1.5px] border-folha px-6 text-base font-semibold text-folha transition-colors hover:bg-folha hover:text-white disabled:opacity-60";
export const classeDoTexto =
  "w-full rounded-lg border border-borda bg-white px-4 py-3 text-base text-tinta placeholder:text-cinza focus:border-folha focus:outline-none focus:ring-2 focus:ring-folha/20";

export function Erro({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <div role="alert">
      <Aviso>{children}</Aviso>
    </div>
  );
}
