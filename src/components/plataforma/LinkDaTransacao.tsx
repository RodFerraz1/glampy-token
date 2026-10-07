import { ExternalLink } from "lucide-react";
import type { Hash } from "viem";
import { abreviarHash, linkDaTransacao } from "@/explorador";

export function LinkDaTransacao({ hash, className = "", children }: { hash: Hash; className?: string; children: React.ReactNode }) {
  return (
    <a
      href={linkDaTransacao(hash)}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-2 text-[15px] font-medium text-folha underline underline-offset-2 hover:text-mata ${className}`}
    >
      {children} {abreviarHash(hash)}
      <ExternalLink className="size-4" strokeWidth={2} aria-hidden />
    </a>
  );
}
