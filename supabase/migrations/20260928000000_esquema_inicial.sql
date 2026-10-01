-- A blockchain é a fonte oficial de saldos, habilitações, compras, revendas e
-- distribuições. Este banco guarda só o que não vive na cadeia: identidade,
-- KYC, vínculo pessoa-carteira, catálogo de benefícios e o acompanhamento das
-- operações que a plataforma inicia.
--
-- O cliente só lê as próprias linhas. Toda escrita passa pelo back-end, com a
-- service role, que ignora RLS.

create type papel_usuario as enum ('investidor', 'operador', 'administrador');
create type status_kyc as enum ('pendente', 'em_analise', 'aprovado', 'reprovado');
create type tipo_carteira as enum ('embutida', 'externa');
create type status_carteira as enum ('pendente', 'habilitada', 'desabilitada');
create type tipo_transacao as enum (
  'habilitacao',
  'desabilitacao',
  'compra_oferta',
  'compra_recolocacao',
  'revenda_oferta',
  'revenda_indicacao',
  'revenda_liquidacao',
  'saque_pendente',
  'resgate_beneficio'
);
create type status_transacao as enum ('pendente', 'confirmada', 'revertida');
create type status_resgate as enum ('assinado', 'submetido', 'confirmado', 'falhou', 'entregue', 'cancelado');
create type motivo_reatribuicao as enum ('perda_de_acesso', 'sucessao', 'ordem_judicial');
create type status_reatribuicao as enum ('aberta', 'em_analise', 'anunciada', 'executada', 'cancelada', 'recusada');

create domain endereco_evm as text check (value ~ '^0x[0-9a-f]{40}$');
create domain bytes32 as text check (value ~ '^0x[0-9a-f]{64}$');
create domain hash_tx as text check (value ~ '^0x[0-9a-f]{64}$');
create domain uint256 as numeric(78, 0) check (value >= 0);

create function atualizar_carimbo() returns trigger
language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

-- --------------------------------------------------------------- perfis

create table perfis (
  id uuid primary key references auth.users (id) on delete restrict,
  nome_exibicao text,
  papel papel_usuario not null default 'investidor',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create trigger perfis_atualizado before update on perfis
  for each row execute function atualizar_carimbo();

create function criar_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfis (id, nome_exibicao)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'));
  return new;
end;
$$;

create trigger ao_criar_usuario after insert on auth.users
  for each row execute function criar_perfil();

-- ------------------------------------------------------------ titulares

-- `identificador` é o bytes32 passado a `RegistroHabilitados.habilitar`.
-- Aleatório de propósito: nunca derivado de CPF, nome ou outro dado pessoal.
create table titulares (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null unique references perfis (id) on delete restrict,
  identificador bytes32 not null unique
    default ('0x' || encode(extensions.gen_random_bytes(32), 'hex')),
  nome_completo text not null,
  cpf text not null unique check (cpf ~ '^[0-9]{11}$'),
  data_nascimento date not null,
  telefone text,
  status status_kyc not null default 'pendente',
  motivo_reprovacao text,
  analisado_por uuid references perfis (id),
  analisado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check ((status = 'reprovado') = (motivo_reprovacao is not null))
);

create trigger titulares_atualizado before update on titulares
  for each row execute function atualizar_carimbo();

-- ------------------------------------------------------------ carteiras

create table carteiras (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references perfis (id) on delete restrict,
  endereco endereco_evm not null unique,
  tipo tipo_carteira not null,
  status status_carteira not null default 'pendente',
  habilitada_em timestamptz,
  desabilitada_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create unique index uma_carteira_embutida_por_perfil
  on carteiras (perfil_id) where tipo = 'embutida';

create trigger carteiras_atualizado before update on carteiras
  for each row execute function atualizar_carimbo();

-- ------------------------------------------------------------- catálogo

-- `hash_tabela` é o keccak256 de `conteudo`, o mesmo publicado em
-- `IbitiPass.publicarCatalogo`. `versao` acompanha a numeração on-chain.
create table catalogo_versoes (
  versao integer primary key check (versao > 0),
  hash_tabela bytes32 not null unique,
  conteudo text not null,
  tx_publicacao hash_tx,
  publicada_em timestamptz not null default now()
);

create table beneficios (
  id uuid primary key default gen_random_uuid(),
  item bytes32 not null unique,
  nome text not null,
  descricao text,
  categoria text,
  imagem_url text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create trigger beneficios_atualizado before update on beneficios
  for each row execute function atualizar_carimbo();

create table precos_beneficio (
  versao integer not null references catalogo_versoes (versao),
  beneficio_id uuid not null references beneficios (id),
  preco_centavos integer not null check (preco_centavos > 0),
  primary key (versao, beneficio_id)
);

-- ------------------------------------------------------------- resgates

-- Guarda o consentimento EIP-712 exatamente como assinado, para o operador
-- submeter em `resgatarPorAssinatura`. A entrega do benefício acontece fora
-- da cadeia, e `entregue` registra que o Ibiti cumpriu.
create table resgates (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references perfis (id) on delete restrict,
  carteira_id uuid not null references carteiras (id),
  beneficio_id uuid not null references beneficios (id),
  versao integer not null,
  custo uint256 not null check (custo > 0),
  nonce uint256 not null,
  valido_ate timestamptz not null,
  assinatura text not null check (assinatura ~ '^0x[0-9a-f]+$'),
  status status_resgate not null default 'assinado',
  tx_hash hash_tx unique,
  erro text,
  entregue_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  foreign key (versao, beneficio_id) references precos_beneficio (versao, beneficio_id),
  unique (carteira_id, nonce)
);

create index resgates_por_perfil on resgates (perfil_id, criado_em desc);

create trigger resgates_atualizado before update on resgates
  for each row execute function atualizar_carimbo();

-- ----------------------------------------------------------- transações

-- Acompanhamento das transações que a plataforma iniciou ou viu o usuário
-- iniciar, para a interface mostrar o que está pendente. Não é extrato
-- oficial: o histórico confirmado se lê dos eventos dos contratos.
create table transacoes (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid references perfis (id) on delete restrict,
  carteira_id uuid references carteiras (id),
  tipo tipo_transacao not null,
  tx_hash hash_tx not null unique,
  status status_transacao not null default 'pendente',
  bloco bigint,
  dados jsonb not null default '{}',
  erro text,
  criado_em timestamptz not null default now(),
  confirmada_em timestamptz
);

create index transacoes_por_perfil on transacoes (perfil_id, criado_em desc);
create index transacoes_pendentes on transacoes (criado_em) where status = 'pendente';

-- -------------------------------------------------------- reatribuições

-- Caso de recuperação de posição: perda de acesso, sucessão ou ordem
-- judicial. A análise e os documentos ficam aqui; o anúncio e a execução
-- são `anunciarReatribuicao` e `executarReatribuicao`, com espera de 7 dias.
create table reatribuicoes (
  id uuid primary key default gen_random_uuid(),
  titular_id uuid not null references titulares (id) on delete restrict,
  carteira_origem endereco_evm not null,
  carteira_destino endereco_evm not null,
  quantidade integer not null check (quantidade > 0),
  motivo motivo_reatribuicao not null,
  justificativa text not null,
  status status_reatribuicao not null default 'aberta',
  id_on_chain uint256,
  motivo_on_chain bytes32,
  tx_anuncio hash_tx,
  tx_execucao hash_tx,
  executavel_apos timestamptz,
  analisado_por uuid references perfis (id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (carteira_origem <> carteira_destino)
);

create trigger reatribuicoes_atualizado before update on reatribuicoes
  for each row execute function atualizar_carimbo();

-- ------------------------------------------------------------ auditoria

create table auditoria (
  id bigint generated always as identity primary key,
  ator_id uuid references perfis (id),
  acao text not null,
  entidade text not null,
  entidade_id text,
  dados jsonb not null default '{}',
  criado_em timestamptz not null default now()
);

create index auditoria_por_entidade on auditoria (entidade, entidade_id);

create function impedir_alteracao() returns trigger
language plpgsql as $$
begin
  raise exception 'auditoria é somente inserção';
end;
$$;

create trigger auditoria_imutavel before update or delete on auditoria
  for each row execute function impedir_alteracao();

-- ------------------------------------------------------------------ RLS

alter table perfis enable row level security;
alter table titulares enable row level security;
alter table carteiras enable row level security;
alter table catalogo_versoes enable row level security;
alter table beneficios enable row level security;
alter table precos_beneficio enable row level security;
alter table resgates enable row level security;
alter table transacoes enable row level security;
alter table reatribuicoes enable row level security;
alter table auditoria enable row level security;

create policy "le o próprio perfil" on perfis
  for select to authenticated using (id = (select auth.uid()));

create policy "le o próprio cadastro" on titulares
  for select to authenticated using (perfil_id = (select auth.uid()));

create policy "le as próprias carteiras" on carteiras
  for select to authenticated using (perfil_id = (select auth.uid()));

create policy "le os próprios resgates" on resgates
  for select to authenticated using (perfil_id = (select auth.uid()));

create policy "le as próprias transações" on transacoes
  for select to authenticated using (perfil_id = (select auth.uid()));

create policy "le as próprias reatribuições" on reatribuicoes
  for select to authenticated using (
    titular_id in (select id from titulares where perfil_id = (select auth.uid()))
  );

create policy "catálogo é público" on catalogo_versoes
  for select to anon, authenticated using (true);

create policy "benefícios ativos são públicos" on beneficios
  for select to anon, authenticated using (ativo);

create policy "preços são públicos" on precos_beneficio
  for select to anon, authenticated using (true);
