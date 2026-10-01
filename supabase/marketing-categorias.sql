-- 01/10/2026: a categoria do post (do que ele fala), ao lado do pilar (como
-- ele entrega). A lista mora em CATEGORIAS (lib/marketing/tipos.ts).
-- Rodar uma vez no SQL Editor do Supabase do estúdio.
alter table mkt_pecas add column if not exists categoria text;
