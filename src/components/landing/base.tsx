import type { LucideIcon } from "lucide-react";
import { Info, MapPin } from "lucide-react";
import Image from "next/image";

export const classeDeCampo =
  "h-12 w-full rounded-lg border border-borda bg-white px-4 text-base text-tinta placeholder:text-cinza focus:border-folha focus:outline-none focus:ring-2 focus:ring-folha/20";

export function Container({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-0 ${className}`}>{children}</div>;
}

export function Rotulo({ children, className = "text-broto" }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-[13px] font-semibold uppercase tracking-[0.14em] ${className}`}>{children}</p>;
}

export function Titulo({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`mt-4 text-[32px] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[45px] ${className}`}>
      {children}
    </h2>
  );
}

export function Foto({
  src,
  legenda,
  sizes,
  preload = false,
  className = "",
}: {
  src: string;
  legenda: string;
  sizes: string;
  preload?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-[20px] bg-mata ${className}`}>
      <Image src={src} alt={legenda} fill sizes={sizes} preload={preload} className="object-cover" />
      <span
        aria-hidden
        className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full bg-[#1f3326]/85 px-3.5 py-2 text-[13px] text-white"
      >
        <MapPin className="size-4" strokeWidth={2} aria-hidden />
        {legenda}
      </span>
    </div>
  );
}

export function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-lg bg-aviso px-4 py-4 text-[15px] leading-relaxed text-aviso-texto">
      <Info className="mt-0.5 size-5 shrink-0" strokeWidth={1.75} aria-hidden />
      <p>{children}</p>
    </div>
  );
}

export function Icone({ icone: Icon }: { icone: LucideIcon }) {
  return (
    <span className="flex size-12 items-center justify-center rounded-[10px] bg-musgo text-folha">
      <Icon className="size-5" strokeWidth={1.75} aria-hidden />
    </span>
  );
}

export function Cartao({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-[20px] border border-borda bg-white p-7 ${className}`}>{children}</div>;
}

export function BotaoPrimario({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <a
      href={href}
      className={`inline-flex h-[52px] items-center justify-center rounded-lg bg-folha px-6 text-base font-semibold text-white transition-colors hover:bg-mata ${className}`}
    >
      {children}
    </a>
  );
}

export function BotaoSecundario({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <a
      href={href}
      className={`inline-flex items-center justify-center rounded-lg border-[1.5px] border-folha px-6 font-semibold text-folha transition-colors hover:bg-folha hover:text-white ${className}`}
    >
      {children}
    </a>
  );
}
