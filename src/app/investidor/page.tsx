import { ArrowLeftRight, ChartColumn, CircleCheck, Gift, KeyRound, ReceiptText, Ticket } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Cartao } from "@/components/landing/base";
import { AceiteDaOferta, LinkDoMemorando } from "@/components/plataforma/AceiteDaOferta";
import { Atalhos, type Atalho } from "@/components/plataforma/Atalhos";
import { CarteiraDoInvestidor } from "@/components/plataforma/CarteiraDoInvestidor";
import { LinkDaTransacao } from "@/components/plataforma/LinkDaTransacao";
import { formatarDataHora } from "@/formatacao";
import { obterBanco, obterDependencias } from "@/servidor/dependencias";
import { consultarAceite } from "@/servidor/operacoes/aceite";
import { consultarCadastro, type StatusDoCadastro } from "@/servidor/operacoes/cadastro";
import { consultarCarteira } from "@/servidor/operacoes/carteira";
import { consultarPosicao } from "@/servidor/operacoes/consultar-posicao";
import { exigirArea } from "@/servidor/sessao";

const STATUS: Record<StatusDoCadastro, { texto: string; classe: string; descricao: string }> = {
  pendente: { texto: "Incompleto", classe: "bg-areia text-tinta", descricao: "Seu cadastro ainda não foi enviado para análise." },
  em_analise: {
    texto: "Em análise",
    classe: "bg-aviso text-aviso-texto",
    descricao: "O Ibiti está conferindo seus dados e a declaração de investidor profissional. Você vai ver o resultado aqui.",
  },
  aprovado: { texto: "Aprovado", classe: "bg-musgo text-folha", descricao: "Seu cadastro foi aprovado." },
  reprovado: { texto: "Reprovado", classe: "bg-aviso text-aviso-texto", descricao: "Seu cadastro não foi aprovado." },
};

const CARTEIRA_APROVADA = {
  pendente: "A habilitação da sua carteira no registro on-chain ainda não foi confirmada. O Ibiti acompanha e você vai poder comprar assim que ela for confirmada.",
  habilitada: "Sua carteira foi habilitada no registro on-chain. Você já pode comprar.",
  desabilitada: "Sua carteira foi desabilitada pelo Ibiti. Fale com o Ibiti para entender o motivo.",
};

const ATALHOS: Atalho[] = [
  {
    href: "/investidor/rendimentos",
    icone: ChartColumn,
    titulo: "Rendimentos",
    descricao: "O royalty mês a mês, com a nota de apuração de cada mês.",
  },
  {
    href: "/investidor/loja",
    icone: Gift,
    titulo: "Loja de benefícios",
    descricao: "Use o crédito IbitiPass do ciclo nas experiências do território.",
  },
  {
    href: "/investidor/resgates",
    icone: Ticket,
    titulo: "Meus resgates",
    descricao: "Os vouchers ativos, usados e cancelados, com o QR code para apresentar.",
  },
  {
    href: "/investidor/revenda",
    icone: ArrowLeftRight,
    titulo: "Revenda",
    descricao: "Oferte parte ou todo o seu lote e acompanhe a preferência, o crivo e a liquidação.",
  },
  {
    href: "/investidor/recuperacao",
    icone: KeyRound,
    titulo: "Recuperação de acesso",
    descricao: "Perdeu o acesso à carteira ou é herdeiro de um investidor? Abra um pedido.",
  },
  {
    href: "/investidor/extrato",
    icone: ReceiptText,
    titulo: "Extrato",
    descricao: "Todas as suas transações, com status e hash.",
  },
];

// A guarda se repete na página porque o layout não impede a página de renderizar.
export default async function AreaDoInvestidor({ searchParams }: PageProps<"/investidor">) {
  const usuario = await exigirArea("investidor");
  const banco = obterBanco();
  const cadastro = await consultarCadastro({ banco }, usuario.id);
  if (!cadastro) redirect("/investidor/cadastro");
  const aprovado = cadastro.status === "aprovado";
  const [carteira, posicao, aceite] = aprovado
    ? await Promise.all([
        consultarCarteira({ banco }, usuario.id),
        consultarPosicao(obterDependencias(), usuario.id),
        consultarAceite({ banco }, usuario.id),
      ])
    : [null, null, null];
  const { enviado } = await searchParams;
  const status = STATUS[cadastro.status];

  return (
    <div className="mx-auto max-w-[640px]">
      <h1 className="text-[32px] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[40px]">Área do investidor</h1>
      {enviado && cadastro.status === "em_analise" && (
        <div role="status" className="mt-8 flex gap-3 rounded-lg bg-musgo px-4 py-4 text-[15px] leading-relaxed text-folha">
          <CircleCheck className="mt-0.5 size-5 shrink-0" strokeWidth={1.75} aria-hidden />
          <p>Cadastro enviado para análise. O Ibiti recebeu seus dados.</p>
        </div>
      )}
      <Cartao className="mt-8 p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Status do cadastro</h2>
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${status.classe}`}>{status.texto}</span>
        </div>
        <p className="mt-3 text-base leading-relaxed text-cinza">{status.descricao}</p>
        {cadastro.motivoReprovacao && <p className="mt-3 text-base leading-relaxed">Motivo: {cadastro.motivoReprovacao}</p>}
        {carteira && (
          <div className="mt-5 border-t border-borda pt-5">
            <p className="text-base leading-relaxed">{CARTEIRA_APROVADA[carteira.status]}</p>
            {carteira.status === "habilitada" && carteira.txHabilitacao && (
              <LinkDaTransacao hash={carteira.txHabilitacao} className="mt-3">
                Transação
              </LinkDaTransacao>
            )}
          </div>
        )}
      </Cartao>
      {posicao && (
        <>
          <CarteiraDoInvestidor {...posicao} />
          <Cartao className="mt-6 p-6 sm:p-7">
            <h2 className="text-xl font-semibold">Memorando de Oferta e riscos</h2>
            {aceite ? (
              <div className="mt-3 space-y-3">
                <p className="text-base leading-relaxed">
                  Você aceitou o Memorando de Oferta e o termo de ciência de riscos em {formatarDataHora(aceite.aceitoEm)}.
                </p>
                <LinkDoMemorando />
                <Link
                  href="/investidor/comprar"
                  className="mt-2 flex h-[52px] w-full items-center justify-center rounded-lg bg-folha text-base font-semibold text-white transition-colors hover:bg-mata"
                >
                  Comprar tokens
                </Link>
              </div>
            ) : (
              <>
                <p className="mt-2 text-[15px] leading-relaxed text-cinza">
                  Antes da primeira compra, leia e aceite os dois documentos. O aceite fica registrado com a data e a versão de
                  cada um.
                </p>
                <div className="mt-5">
                  <AceiteDaOferta />
                </div>
              </>
            )}
          </Cartao>
          <Atalhos atalhos={ATALHOS} className="mt-6" />
        </>
      )}
    </div>
  );
}
