-- Quem abre o pedido nem sempre é o titular: na sucessão é o herdeiro, com a
-- própria conta. O parecer é a justificativa do Ibiti ao decidir.
alter table reatribuicoes
  add column aberto_por uuid references perfis (id),
  add column parecer text,
  add column analisado_em timestamptz,
  add check (status not in ('recusada', 'cancelada') or parecer is not null);

drop policy "le as próprias reatribuições" on reatribuicoes;
create policy "le as próprias reatribuições" on reatribuicoes
  for select to authenticated using (
    aberto_por = (select auth.uid())
    or titular_id in (select id from titulares where perfil_id = (select auth.uid()))
  );
