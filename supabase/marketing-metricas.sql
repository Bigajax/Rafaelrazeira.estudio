-- 01/10/2026: os números de cada post postado (encaminhamentos, salvamentos,
-- alcance, visitas, seguidores, leads), anotados do Insights 7 dias depois.
-- Ver MEDIDAS em lib/marketing/tipos.ts. Rodar uma vez no SQL Editor do Supabase.
alter table mkt_pecas add column if not exists metricas jsonb;
