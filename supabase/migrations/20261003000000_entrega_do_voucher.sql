-- Quem do território entregou o benefício, para a entrega ter autor como a auditoria.
alter table resgates add column entregue_por uuid references perfis (id);
alter table resgates add check ((status = 'entregue') = (entregue_em is not null and entregue_por is not null));
