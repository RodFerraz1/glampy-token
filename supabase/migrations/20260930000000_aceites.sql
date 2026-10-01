-- Antes da primeira compra, o investidor aceita o Memorando de Oferta e o
-- termo de ciência de riscos. Cada linha é a prova de que ele aceitou uma
-- versão de um documento, e quando. Uma versão nova exige novo aceite, e o
-- aceite da versão anterior continua registrado.

create type documento_aceite as enum ('memorando_de_oferta', 'termo_de_riscos');

create table aceites (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references perfis (id) on delete restrict,
  documento documento_aceite not null,
  versao text not null check (versao <> ''),
  aceito_em timestamptz not null default now(),
  unique (perfil_id, documento, versao)
);

alter table aceites enable row level security;

create policy "le os próprios aceites" on aceites
  for select to authenticated using (perfil_id = (select auth.uid()));
