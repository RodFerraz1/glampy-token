import { ArrowLeftRight, ChartColumn, Gauge, KeyRound, Mail, ScrollText, Ticket, UserCheck } from "lucide-react";
import { AREAS } from "@/areas";
import { Atalhos, type Atalho } from "@/components/plataforma/Atalhos";
import { exigirArea } from "@/servidor/sessao";

const ATALHOS: Atalho[] = [
  {
    href: "/ibiti/painel",
    icone: Gauge,
    titulo: "Painel",
    descricao: "Detentores, captação e crédito de benefícios do ciclo, lidos dos contratos.",
  },
  {
    href: "/ibiti/apuracoes",
    icone: ChartColumn,
    titulo: "Apurações",
    descricao: "Registre a apuração simulada do mês, com o faturamento e o hash do relatório.",
  },
  {
    href: "/ibiti/cadastros",
    icone: UserCheck,
    titulo: "Cadastros",
    descricao: "Analise os cadastros, aprove com habilitação on-chain ou reprove com motivo.",
  },
  {
    href: "/ibiti/convites",
    icone: Mail,
    titulo: "Convites",
    descricao: "Convide investidores e acompanhe quem já se cadastrou.",
  },
  {
    href: "/ibiti/beneficios",
    icone: Ticket,
    titulo: "Token de Benefícios - Passaporte Ibiti",
    descricao: "Mantenha e publique o catálogo de benefícios e acompanhe os resgates, cancelando os que não serão entregues.",
  },
  {
    href: "/ibiti/revendas",
    icone: ArrowLeftRight,
    titulo: "Revendas",
    descricao: "Decida a preferência e o crivo do comprador, com as assinaturas dos diretores.",
  },
  {
    href: "/ibiti/reatribuicoes",
    icone: KeyRound,
    titulo: "Reatribuições",
    descricao: "Analise pedidos de recuperação e sucessão, anuncie on-chain e execute depois de 7 dias.",
  },
  {
    href: "/ibiti/auditoria",
    icone: ScrollText,
    titulo: "Auditoria",
    descricao: "O registro de todas as ações de administradores e operadores, com filtros.",
  },
];

// A guarda se repete na página porque o layout não impede a página de renderizar.
export default async function PainelIbiti() {
  await exigirArea("administrador");
  return (
    <>
      <h1 className="text-[32px] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[40px]">{AREAS.administrador.nome}</h1>
      <Atalhos atalhos={ATALHOS} className="mt-8" />
    </>
  );
}
