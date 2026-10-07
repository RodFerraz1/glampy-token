"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const INTERVALO_MS = 5_000;

/** Rerenderiza a rota no servidor a cada poucos segundos enquanto houver algo pendente. */
export function AtualizarEnquantoPendente({ haPendentes }: { haPendentes: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!haPendentes) return;
    const intervalo = setInterval(() => router.refresh(), INTERVALO_MS);
    return () => clearInterval(intervalo);
  }, [haPendentes, router]);
  return null;
}
