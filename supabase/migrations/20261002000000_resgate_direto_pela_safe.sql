-- O resgate passa a ser `IbitiPass.resgatar` chamado pela própria Safe do
-- investidor, com gas patrocinado. O consentimento EIP-712 e a fila de
-- submissão deixam de ser usados: nonce, validade e assinatura ficam opcionais,
-- e o resgate nasce `submetido`, já com o hash da operação.
alter table resgates
  alter column nonce drop not null,
  alter column valido_ate drop not null,
  alter column assinatura drop not null,
  alter column status set default 'submetido';
