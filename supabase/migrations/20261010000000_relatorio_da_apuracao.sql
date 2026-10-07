-- O relatório de apuração fica guardado junto do hash, para o investidor baixar
-- o documento e conferir que o hash dele é o registrado. As apurações
-- anteriores a esta migração só têm o hash, digitado à mão.
alter table apuracoes_simuladas add column relatorio_caminho text unique;

-- Público como as apurações. Só o servidor grava, com a chave secreta.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('relatorios-de-apuracao', 'relatorios-de-apuracao', true, 4194304, array['application/pdf']);
