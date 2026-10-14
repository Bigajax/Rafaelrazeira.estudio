-- ═══ A ANÁLISE DAS VITRINES QUE PAGARAM (14/10/2026) ═══
--
-- Cada rodada do scripts/analisar-vitrines.ts --gravar vira uma linha aqui:
-- as notas de saúde, montagem e catálogo de cada loja, os achados com o que
-- fazer, e os números dos últimos 30 dias (para copy e anúncio). A aba
-- Análise do Performance, no CRM, mostra a mais recente.
--
-- Rodar no SQL Editor do Supabase do ESTÚDIO. Reexecutável.

create table if not exists public.perf_analises (
  id bigint generated always as identity primary key,
  criado_em timestamptz not null default now(),
  resultado jsonb not null
);

create index if not exists perf_analises_quando on public.perf_analises (criado_em desc);

alter table public.perf_analises enable row level security;

-- só o dono do CRM lê; quem grava é o script, com a chave de serviço
drop policy if exists perf_analises_le on public.perf_analises;
create policy perf_analises_le on public.perf_analises
  for select to authenticated using (true);

revoke insert, update, delete on public.perf_analises from anon, authenticated;
