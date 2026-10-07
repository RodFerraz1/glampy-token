-- O catálogo em edição. `preco_centavos` é o valor de resgate, já com o fator
-- de 60% sobre `preco_tabela_centavos`, e entra na próxima versão publicada.
-- O preço que vale para o resgate é o de `precos_beneficio` da versão vigente.
alter table beneficios
  alter column categoria set not null,
  add column preco_tabela_centavos integer not null check (preco_tabela_centavos > 0),
  add column preco_centavos integer not null check (preco_centavos > 0);

-- O contrato aceita publicar de novo uma tabela idêntica a uma versão antiga,
-- como versão nova; o banco acompanha a numeração on-chain.
alter table catalogo_versoes drop constraint catalogo_versoes_hash_tabela_key;

-- Grava a versão e os preços dela numa transação só: ou a versão aparece
-- inteira, ou não aparece. `precos` é [{ "beneficio_id": uuid, "preco_centavos": int }].
create function gravar_versao_do_catalogo(
  p_versao integer,
  p_hash_tabela text,
  p_conteudo text,
  p_tx_publicacao text,
  p_publicada_em timestamptz,
  p_precos jsonb
) returns void
language plpgsql set search_path = '' as $$
begin
  insert into public.catalogo_versoes (versao, hash_tabela, conteudo, tx_publicacao, publicada_em)
  values (p_versao, p_hash_tabela, p_conteudo, p_tx_publicacao, p_publicada_em);

  insert into public.precos_beneficio (versao, beneficio_id, preco_centavos)
  select p_versao, (preco ->> 'beneficio_id')::uuid, (preco ->> 'preco_centavos')::integer
  from jsonb_array_elements(p_precos) as preco;
end;
$$;

revoke execute on function gravar_versao_do_catalogo from public, anon, authenticated;

-- Público é o que já foi publicado: um item em rascunho, novo ou recém
-- desativado, não muda o que o público vê antes da próxima versão.
drop policy "benefícios ativos são públicos" on beneficios;
create policy "benefícios publicados são públicos" on beneficios
  for select to anon, authenticated using (
    exists (select 1 from precos_beneficio where precos_beneficio.beneficio_id = beneficios.id)
  );
