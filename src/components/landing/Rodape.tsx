import { FileText } from "lucide-react";
import { Container } from "./base";
import { LinkPrivacidade } from "./LinkPrivacidade";
import { links } from "./navegacao";

const linksRodape = links.filter((link) => link.href !== "#como-funciona");

export function Rodape() {
  return (
    <footer className="bg-mata py-14 text-white">
      <Container>
        <div className="flex flex-col gap-8 border-b border-white/15 pb-8 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[28px] font-bold leading-none tracking-[-0.02em]">ibiti</p>
            <p className="mt-4 text-base text-white/85">Ibiti Projeto · Minas Gerais</p>
            <a
              href="/whitepaper-ibiti-glamping.pdf"
              target="_blank"
              rel="noopener"
              className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white/25 px-4 py-2 text-[15px] font-medium transition-colors hover:bg-white/10"
            >
              <FileText className="size-4" strokeWidth={1.75} aria-hidden />
              Ler o whitepaper (PDF)
            </a>
          </div>
          <nav aria-label="Rodapé">
            <ul className="flex flex-wrap gap-x-7 gap-y-3 text-base">
              {linksRodape.map((link) => (
                <li key={link.rotulo}>
                  <a href={link.href} className="text-white/90 transition-colors hover:text-white">
                    {link.rotulo}
                  </a>
                </li>
              ))}
              <li>
                <LinkPrivacidade className="text-white/90 transition-colors hover:text-white">Privacidade</LinkPrivacidade>
              </li>
            </ul>
          </nav>
        </div>
        <p className="mt-10 max-w-[900px] text-[15px] leading-relaxed text-white/75">
          Este conteúdo é institucional e não constitui oferta pública de valores mobiliários. O investimento é restrito a
          investidores profissionais, nos termos da regulamentação da CVM, e depende de aprovação do Ibiti. Os
          pagamentos acompanham a receita real do Glamping e não são garantidos.
        </p>
      </Container>
    </footer>
  );
}
