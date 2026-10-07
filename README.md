# Landing Page Comercial do Ativo Digital - Glampy

**Grupo 02** · Sprint 05 · Inteli

Interface institucional do investimento no Ibiti Glamping: a página pública que
apresenta o **Glampy**, o token de royalty descrito no
[Memorando de Oferta V2](../../Sprint%2004/Memorando%20de%20Oferta%20V2/Memorando%20de%20Oferta%20V2.md),
e o **IbitiPass**, o crédito de benefícios que forma o membership.

| | |
|---|---|
| O que é | Website funcional: uma página com sete seções, mais a página pública de Transparência |
| Público | Frequentadores e clientes do Ibiti, 45 a 65 anos, com pouca familiaridade com ativos digitais |
| Ação que a página pede | Uma só: pedir uma conversa com a equipe do Ibiti |
| Stack | Next.js 16, React 19, Tailwind CSS 4, fonte Figtree, ícones Lucide |
| Documentação | **[Documentação da Landing Page](docs/Documenta%C3%A7%C3%A3o%20da%20Landing%20Page.md)** |

---

## Comece por aqui

Toda a justificativa de comunicação, design e experiência está na
**[Documentação da Landing Page](docs/Documenta%C3%A7%C3%A3o%20da%20Landing%20Page.md)**.
Se você tem cinco minutos, leia a §2 (por que as seções estão nessa ordem) e a §3
(como o texto foi escrito).

**Onde cada critério de avaliação está respondido:**

| Critério | Onde, na documentação |
|---|---|
| 1 · A interface comunica de forma clara e coerente a proposta da operação? | §1 e §2 |
| 2 · Alinhamento entre identidade visual, narrativa e lógica da solução | §5, §6 e §7 - cores, tipografia e fotografia |
| 3 · Transformar conceitos complexos em comunicação acessível | **§3 e §4** - copywriting e tabela conceito técnico → frase da página |
| 4 · Coerência estratégica e organizacional da estrutura | §2 |
| 5 · Articulação entre design, experiência do usuário e posicionamento | §8 e §10 |
| 6 · Consistência visual, estrutural e comunicacional | §5 e §8 |
| 7 · Síntese, clareza narrativa e coerência institucional | §3 e §11 - cada afirmação da página com a sua fonte |
| 8 · Profundidade estratégica além da execução estética | **§9, §12 e §13** - o que a página deliberadamente não diz, as alternativas descartadas e o que ainda está pendente |

---

## Como executar

Requer Node.js 20 ou superior.

```bash
cd "Sprint 05/Artefatos/Landing Page Comercial do Ativo Digital"
npm install
npm run dev
```

Abra `http://localhost:3000`. **A landing page não precisa de variáveis de
ambiente.** A página de Transparência e a área logada (`/entrar` e seguintes) leem
o Supabase e a Sepolia e precisam de um `.env` criado a partir do
[`.env.example`](.env.example).

---

## Onde está cada parte

```bash
docs/
└── Documentação da Landing Page.md   # Decisões de comunicação, design e experiência
src/
├── app/
│   ├── page.tsx                 # A landing: monta as sete seções em ordem
│   ├── layout.tsx               # Título, descrição, fonte Figtree e lang pt-BR
│   ├── globals.css              # Paleta (tokens de cor) e rolagem suave
│   └── transparencia/page.tsx   # Página pública de transparência
└── components/landing/
    ├── base.tsx                 # Componentes compartilhados: Container, Rotulo, Titulo, Foto, Aviso, Cartao, botões
    ├── navegacao.ts             # Links do menu, usados no cabeçalho, no menu mobile e no rodapé
    ├── Cabecalho.tsx, MenuMobile.tsx
    ├── Hero.tsx, OIbiti.tsx, OGlamping.tsx, Investimento.tsx,
    │   ComoFunciona.tsx, Perguntas.tsx, Contato.tsx
    ├── FormularioContato.tsx, Dialogo.tsx, LinkPrivacidade.tsx
    └── Rodape.tsx
public/
├── fotos/                       # Fotos do território e do projeto
└── whitepaper-ibiti-glamping.pdf
```

**Consistência por construção.** Toda seção usa os mesmos componentes de
[`base.tsx`](src/components/landing/base.tsx) para rótulo, título, foto, aviso e
botão, e as mesmas cores do `globals.css`. O conteúdo de cada seção (números,
etapas, perguntas) fica em listas no topo do arquivo, separado do layout, para que
mudar um texto não exija mexer na marcação.

O restante de `src/` (`servidor/`, `contratos/`, `components/plataforma/` e as
áreas do investidor, do operador e do Ibiti) é a plataforma que opera os contratos
da Sprint 4. Ela é o destino do link **Entrar**, mas não faz parte deste artefato.
