-- O vendedor que desiste da revenda também assina uma transação, que o extrato mostra.
alter type tipo_transacao add value 'revenda_cancelamento';
