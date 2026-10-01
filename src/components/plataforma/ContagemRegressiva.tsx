"use client";

import { useEffect, useState } from "react";

function restante(ate: number, agora: number) {
  const segundos = Math.max(0, Math.floor((ate - agora) / 1000));
  const dias = Math.floor(segundos / 86_400);
  const horas = Math.floor((segundos % 86_400) / 3_600);
  const minutos = Math.floor((segundos % 3_600) / 60);
  return { encerrada: segundos === 0, texto: `${dias}d ${horas}h ${minutos}min` };
}

/** Quanto falta até uma data, atualizado a cada minuto. */
export function ContagemRegressiva({ ate, encerrada }: { ate: string; encerrada: string }) {
  const alvo = new Date(ate).getTime();
  const [agora, setAgora] = useState<number>();
  useEffect(() => {
    const atualizar = () => setAgora(Date.now());
    const primeira = setTimeout(atualizar, 0);
    const intervalo = setInterval(atualizar, 60_000);
    return () => {
      clearTimeout(primeira);
      clearInterval(intervalo);
    };
  }, []);
  if (agora === undefined) return null;
  const { encerrada: acabou, texto } = restante(alvo, agora);
  return <span className="font-medium">{acabou ? encerrada : `Faltam ${texto}`}</span>;
}
