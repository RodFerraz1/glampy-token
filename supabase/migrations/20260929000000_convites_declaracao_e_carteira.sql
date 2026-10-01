-- Convite para o cadastro de um investidor. O link leva o token; aqui fica só
-- o sha256 dele, para que uma leitura do banco não permita usar convites.
-- O status (pendente, usado ou vencido) é derivado de `usado_em` e `expira_em`.

create table convites (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email)),
  hash_token text not null unique check (hash_token ~ '^[0-9a-f]{64}$'),
  criado_por uuid not null references perfis (id) on delete restrict,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null,
  usado_em timestamptz,
  check (expira_em > criado_em)
);

create index convites_por_data on convites (criado_em desc);

alter table convites enable row level security;

-- Declaração de investidor profissional (Resolução CVM 30), exigida porque a
-- oferta é restrita a esse público. Guarda a versão do texto aceito e quando,
-- e nenhum cadastro sai de `pendente` sem ela.

alter table titulares
  add column declaracao_profissional_versao text,
  add column declaracao_profissional_aceita_em timestamptz,
  add check ((declaracao_profissional_versao is null) = (declaracao_profissional_aceita_em is null)),
  add check (status = 'pendente' or declaracao_profissional_aceita_em is not null);

-- A carteira embutida é uma Safe cuja dona é uma passkey do aparelho do
-- investidor. O endereço é derivado da chave pública da passkey, e o
-- navegador precisa do id da credencial e da chave pública para montar a
-- Safe e pedir a biometria a cada operação. A chave privada nunca sai do
-- aparelho.
--
-- Aprovar o cadastro habilita a carteira on-chain. Se a habilitação falha, o
-- cadastro fica aprovado e a carteira pendente, e o painel mostra o erro com a
-- opção de tentar de novo. O erro fica aqui, e não em `transacoes`, porque a
-- falha mais comum (conta agente sem papel ou sem ETH) acontece antes de
-- existir hash. Uma habilitação confirmada limpa o erro.

alter table carteiras
  add column passkey_id text check (passkey_id ~ '^[A-Za-z0-9_-]+$'),
  add column passkey_chave_publica text check (passkey_chave_publica ~ '^0x[0-9a-f]{128}$'),
  add column erro_habilitacao text,
  add check ((passkey_id is null) = (passkey_chave_publica is null)),
  add check ((tipo = 'embutida') = (passkey_id is not null)),
  add check (erro_habilitacao is null or status = 'pendente');
