-- ============================================================
-- O BANCO DE REFERÊNCIAS DO FEED (01/10/2026)
-- Cole este arquivo inteiro em: Supabase → SQL Editor → Run.
-- Idempotente: rodar duas vezes não quebra nem duplica nada.
-- ============================================================
--
-- "A gente não está tendo referência de criação de conteúdo." A aba
-- Resultados é a referência de DENTRO (os números do próprio feed); esta
-- tabela é a de FORA: perfis que fazem bem cada categoria, os formatos que
-- se repetem neles, e o que evitar. A Paula e a Dora leem antes de criar.
--
--   tipo perfil   um @ de referência, numa categoria
--   tipo formato  um formato que aparece em vários perfis
--   tipo evitar   o que não fazer, com o porquê
--
-- A primeira carga (os 23 perfis da pesquisa de 01/10) é um botão na aba
-- Referências do Marketing. Mesma regra de RLS do resto: owner_id e
-- auth.uid(); o worker lê pela service role.
-- ============================================================
create table if not exists public.mkt_referencias (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tipo text not null default 'perfil' check (tipo in ('perfil','formato','evitar')),
  categoria text check (categoria is null or categoria in ('tendencia','design','ecommerce','educacional','vitrines')),
  nome text not null default '',
  link text not null default '',
  por_que text not null default '',
  copiar text not null default '',
  nao_copiar text not null default '',
  evidencia text not null default '',
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create index if not exists mkt_referencias_dono_idx on public.mkt_referencias (owner_id, tipo, categoria);

alter table public.mkt_referencias enable row level security;

drop policy if exists mkt_referencias_dono on public.mkt_referencias;
create policy mkt_referencias_dono on public.mkt_referencias
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
