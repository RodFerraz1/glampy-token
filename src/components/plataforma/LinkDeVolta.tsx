import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function LinkDeVolta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-[15px] font-medium text-folha underline-offset-2 hover:underline"
    >
      <ArrowLeft className="size-4" strokeWidth={2} aria-hidden />
      {children}
    </Link>
  );
}
