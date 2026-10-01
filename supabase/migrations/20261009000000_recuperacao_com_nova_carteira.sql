-- Na perda de acesso, o investidor cria uma passkey nova no próprio pedido, e
-- a Safe dela é o destino. A passkey fica no pedido até a execução, quando
-- passa a ser a da carteira do perfil.
alter table reatribuicoes
  add column passkey_id text,
  add column passkey_chave_publica text,
  add check ((motivo = 'perda_de_acesso') = (passkey_id is not null and passkey_chave_publica is not null));
