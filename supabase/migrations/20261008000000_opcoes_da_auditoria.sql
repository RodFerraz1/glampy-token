-- As ações e entidades já registradas, para os filtros da tela de auditoria.
create function opcoes_da_auditoria()
returns table (tipo text, valor text)
language sql stable set search_path = '' as $$
  select distinct 'acao', acao from public.auditoria
  union
  select distinct 'entidade', entidade from public.auditoria;
$$;

revoke execute on function opcoes_da_auditoria from public, anon, authenticated;
