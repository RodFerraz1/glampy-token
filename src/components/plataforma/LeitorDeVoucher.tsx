"use client";

import jsQR from "jsqr";
import { Camera, CameraOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { classeDoPrimario, classeDoSecundario, Erro } from "@/components/plataforma/formulario";

/** Lê o QR pela câmera traseira e abre o voucher. O QR codifica só o id do resgate. */
export function LeitorDeVoucher() {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState<string>();

  useEffect(() => {
    if (!lendo) return;
    let encerrado = false;
    let fluxo: MediaStream | undefined;
    let quadro = 0;
    const tela = document.createElement("canvas");
    const contexto = tela.getContext("2d", { willReadFrequently: true });

    function ler() {
      const elemento = video.current;
      if (elemento && contexto && elemento.readyState === elemento.HAVE_ENOUGH_DATA) {
        tela.width = elemento.videoWidth;
        tela.height = elemento.videoHeight;
        contexto.drawImage(elemento, 0, 0);
        const imagem = contexto.getImageData(0, 0, tela.width, tela.height);
        const qr = jsQR(imagem.data, imagem.width, imagem.height, { inversionAttempts: "dontInvert" });
        if (qr?.data) {
          setLendo(false);
          router.push(`/operador?codigo=${encodeURIComponent(qr.data)}`);
          return;
        }
      }
      quadro = requestAnimationFrame(ler);
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((obtido) => {
        fluxo = obtido;
        // O efeito pode ter sido limpo enquanto o navegador pedia a permissão.
        if (encerrado) return obtido.getTracks().forEach((trilha) => trilha.stop());
        if (!video.current) return;
        video.current.srcObject = obtido;
        return video.current.play().then(() => {
          quadro = requestAnimationFrame(ler);
        });
      })
      .catch(() => {
        setErro("Não foi possível abrir a câmera. Digite o código do voucher abaixo.");
        setLendo(false);
      });

    return () => {
      encerrado = true;
      cancelAnimationFrame(quadro);
      fluxo?.getTracks().forEach((trilha) => trilha.stop());
    };
  }, [lendo, router]);

  return (
    <div className="space-y-4">
      {lendo && (
        <video ref={video} muted playsInline className="aspect-square w-full rounded-lg bg-tinta object-cover" aria-label="Câmera" />
      )}
      <Erro>{erro}</Erro>
      <button
        type="button"
        onClick={() => {
          // Fora de HTTPS o navegador não expõe a câmera.
          const semCamera = !lendo && !navigator.mediaDevices?.getUserMedia;
          setErro(semCamera ? "Este navegador não libera a câmera aqui. Digite o código do voucher abaixo." : undefined);
          if (!semCamera) setLendo(!lendo);
        }}
        className={`inline-flex w-full items-center justify-center gap-2 ${lendo ? classeDoSecundario : classeDoPrimario}`}
      >
        {lendo ? <CameraOff className="size-5" strokeWidth={1.75} aria-hidden /> : <Camera className="size-5" strokeWidth={1.75} aria-hidden />}
        {lendo ? "Fechar a câmera" : "Ler QR code"}
      </button>
    </div>
  );
}
