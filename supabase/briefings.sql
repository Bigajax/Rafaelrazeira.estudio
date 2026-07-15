-- ============================================================
-- Tabela de leads do formulário de briefing
-- Cole este script inteiro em: Supabase → SQL Editor → Run
-- ============================================================

create table if not exists public.briefings (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  nome          text not null,
  email         text not null,
  whatsapp      text not null,
  empresa       text,
  cargo         text,
  necessidade   text,
  inicio        text,
  investimento  text,
  canal         text,
  origem        text
);

-- Liga o Row Level Security (ninguém acessa nada por padrão)
alter table public.briefings enable row level security;

-- Permite APENAS INSERIR para visitantes anônimos (o site).
-- Ninguém consegue LER os leads com a chave pública — só você, logado no painel.
-- (drop + create: o script inteiro pode ser rodado de novo sem erro)
drop policy if exists "site pode inserir briefings" on public.briefings;
create policy "site pode inserir briefings"
  on public.briefings
  for insert
  to anon
  with check (true);

-- ============================================================
-- ⚠️ MIGRAÇÃO OBRIGATÓRIA (jul/2026) — formulário novo.
-- Rode este bloco ANTES de publicar o site atualizado, senão
-- todo envio do formulário falha (colunas inexistentes).
-- Campos novos: instagram/site, o que vende, objetivo da página,
-- identidade visual e detalhes. E-mail saiu do formulário.
-- ============================================================
alter table public.briefings alter column email drop not null;
alter table public.briefings add column if not exists instagram  text;
alter table public.briefings add column if not exists vende      text;
alter table public.briefings add column if not exists objetivo   text;
alter table public.briefings add column if not exists identidade text;
alter table public.briefings add column if not exists detalhes   text;

-- ============================================================
-- ⚠️ MIGRAÇÃO OBRIGATÓRIA (jul/2026) — campo "O que você precisa?"
-- no passo 2 do formulário. Rode ANTES de publicar, senão o envio
-- falha (coluna inexistente).
-- ============================================================
alter table public.briefings add column if not exists tipo_projeto text;
