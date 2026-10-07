-- O Ibiti cancela um resgate confirmado que não será entregue. O crédito já foi
-- consumido on-chain e não volta: o cancelamento registra por que o voucher
-- deixou de valer, quem decidiu e quando.
alter table resgates
  add column motivo_cancelamento text,
  add column cancelado_por uuid references perfis (id),
  add column cancelado_em timestamptz,
  add check ((status = 'cancelado') = (motivo_cancelamento is not null and cancelado_por is not null and cancelado_em is not null));
