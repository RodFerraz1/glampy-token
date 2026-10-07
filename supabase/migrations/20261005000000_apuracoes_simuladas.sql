-- A `Distribuicao` v2 não aceita apuração antes de 2027, então as apurações
-- mensais da demonstração ficam aqui. O período é AAAAMM, de abril de 2027 a
-- março de 2031, em sequência; a sequência é conferida pela operação.
create table apuracoes_simuladas (
  periodo integer primary key check (periodo between 202704 and 203103 and periodo % 100 between 1 and 12),
  faturamento_centavos bigint not null check (faturamento_centavos > 0),
  royalty_centavos bigint not null check (royalty_centavos >= 0),
  valor_por_token_centavos numeric(20, 6) not null check (valor_por_token_centavos >= 0),
  hash_relatorio bytes32 not null,
  registrado_por uuid not null references perfis (id),
  registrado_em timestamptz not null default now()
);

alter table apuracoes_simuladas enable row level security;

create policy "apurações são públicas" on apuracoes_simuladas
  for select to anon, authenticated using (true);
