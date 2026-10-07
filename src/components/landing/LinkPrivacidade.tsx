"use client";

import { useState } from "react";
import { Dialogo } from "./Dialogo";

export function LinkPrivacidade({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className={`cursor-pointer ${className}`}>
        {children}
      </button>
      <Dialogo aberto={aberto} aoFechar={() => setAberto(false)} titulo="Política de privacidade" rotuloDoBotao="Entendi">
        <p>
          Em breve, as informações sobre como o Ibiti coleta, usa e protege os seus dados estarão disponíveis aqui.
        </p>
      </Dialogo>
    </>
  );
}
