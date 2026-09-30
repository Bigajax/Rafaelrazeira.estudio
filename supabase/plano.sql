-- ============================================================
-- PLANO: o planejamento estratégico e o tático do estúdio
-- Cole este arquivo inteiro em: Supabase → SQL Editor → Run.
-- Idempotente: rodar duas vezes não quebra nem duplica nada.
-- Depende do crm.sql (a função crm_relogio).
-- ============================================================
--
-- POR QUE EXISTE (30/09/2026)
--
-- "O CRM já não é só um CRM, é um sistema completo." Faltava o rumo: a
-- missão, os projetos a que o Rafael se dedica e as metas de cada um, num
-- lugar que ele abre e vê se está indo. O método é o do sistema de gestão da
-- G4 (Bruno Nardon, "Esse foi o sistema de gestão que fez o G4 faturar 20x
-- mais", 07/08/2026), no tamanho de um estúdio de uma pessoa:
--
--   ESTRATÉGICO  a missão, a visão com ano, as projeções por ano e uma lista
--                FECHADA de projetos. Projeto encerrado não é apagado: é o
--                "não" que se disse, e ele fica visível para não voltar.
--   TÁTICO       o ano: cada projeto com prioridade (P1, P2, P3) e metas;
--                cada meta com peso, e os pesos do ano somam 100. Isso é o
--                painel de metas.
--   RMR          a reunião mensal de resultados: todo mês cada meta ganha um
--                valor e um percentual, e o mês é fechado com o que causou
--                o desvio e o plano para voltar.
--   INCENTIVO    o prêmio que o Rafael se dá se a nota do ano passar do corte.
--
-- O QUE NÃO É COLUNA: o percentual, a faixa e a nota do painel. São contas
-- sobre o alvo e as medições (lib/plano/tipos.ts), feitas na tela. E as
-- metas com fonte automática (Caixa, fechamentos, toques, posts) não gravam
-- medição: o número vem do sistema na hora, e ninguém digita o que o banco
-- já sabe.
-- ============================================================

-- ---------- o ciclo: um por ano ----------
create table if not exists public.plano_ciclos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ano int not null check (ano between 2020 and 2100),
  missao text,
  visao text,
  -- o ano em que a visão tem que estar de pé (3 a 5 anos à frente)
  horizonte int check (horizonte is null or horizonte between 2020 and 2100),
  -- [{ ano, faturamento, caixa }]: as projeções do estratégico
  projecoes jsonb not null default '[]'::jsonb,
  -- o incentivo: o que ele se dá, e a nota mínima do ano para ganhar
  premio text,
  premio_corte int not null default 80 check (premio_corte between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, ano)
);

-- ---------- os projetos: a lista fechada ----------
create table if not exists public.plano_projetos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null check (length(nome) between 1 and 80),
  porque text,
  prioridade text not null default 'P2' check (prioridade in ('P1','P2','P3')),
  -- agora: energia alta neste ano; depois: começa devagar; ideia: ainda em ideação
  horizonte text not null default 'agora' check (horizonte in ('agora','depois','ideia')),
  -- encerrado é o "não" que se disse; fica na tela, riscado
  status text not null default 'ativo' check (status in ('ativo','pausado','encerrado')),
  motivo_encerrado text,
  ordem numeric not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- as metas: o painel do ano ----------
create table if not exists public.plano_metas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  projeto_id uuid not null references public.plano_projetos(id) on delete cascade,
  ano int not null check (ano between 2020 and 2100),
  titulo text not null check (length(titulo) between 1 and 120),
  -- R$, un ou %: só muda como o número aparece
  unidade text not null default 'un' check (unidade in ('R$','un','%')),
  alvo numeric not null check (alvo > 0),
  -- mes: o alvo vale para cada mês; ano: o alvo é o total do ano, e o mês
  -- é comparado com o ritmo (alvo × meses passados ÷ 12)
  periodo text not null default 'mes' check (periodo in ('mes','ano')),
  peso int not null default 10 check (peso between 0 and 100),
  fonte text not null default 'manual'
    check (fonte in ('manual','recebido','fechados','toques','posts')),
  ordem numeric not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- as medições: um valor por meta por mês ----------
create table if not exists public.plano_medicoes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  meta_id uuid not null references public.plano_metas(id) on delete cascade,
  mes date not null check (extract(day from mes) = 1),
  valor numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (meta_id, mes)
);

-- ---------- a RMR: o mês fechado ----------
create table if not exists public.plano_rmr (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  mes date not null check (extract(day from mes) = 1),
  -- a nota do painel no dia em que o mês foi fechado (a foto, não a conta)
  nota numeric,
  causa text,
  plano text,
  fechada_em timestamptz not null default now(),
  unique (owner_id, mes)
);

-- ---------- 30/09: o prêmio em degraus ----------
-- "A recompensa é um iPhone de última geração, dois MacBooks (um meu, um da
-- agência), contratar gente para o comercial." Cada degrau é um patamar de
-- faturamento no mês, lido do Caixa: [{ nome, patamar, meses }]. `meses` > 1
-- pede o patamar em meses SEGUIDOS (contratar é custo que volta todo mês).
alter table public.plano_ciclos add column if not exists premios jsonb not null default '[]'::jsonb;

create index if not exists plano_metas_ano_idx on public.plano_metas (owner_id, ano);
create index if not exists plano_medicoes_meta_idx on public.plano_medicoes (owner_id, meta_id, mes);

-- ---------- o dono vê só o dele ----------
alter table public.plano_ciclos enable row level security;
alter table public.plano_projetos enable row level security;
alter table public.plano_metas enable row level security;
alter table public.plano_medicoes enable row level security;
alter table public.plano_rmr enable row level security;

drop policy if exists plano_ciclos_dono on public.plano_ciclos;
create policy plano_ciclos_dono on public.plano_ciclos for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists plano_projetos_dono on public.plano_projetos;
create policy plano_projetos_dono on public.plano_projetos for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists plano_metas_dono on public.plano_metas;
create policy plano_metas_dono on public.plano_metas for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists plano_medicoes_dono on public.plano_medicoes;
create policy plano_medicoes_dono on public.plano_medicoes for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists plano_rmr_dono on public.plano_rmr;
create policy plano_rmr_dono on public.plano_rmr for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- ---------- o relógio de sempre ----------
drop trigger if exists plano_ciclos_relogio on public.plano_ciclos;
create trigger plano_ciclos_relogio before update on public.plano_ciclos
  for each row execute function public.crm_relogio();
drop trigger if exists plano_projetos_relogio on public.plano_projetos;
create trigger plano_projetos_relogio before update on public.plano_projetos
  for each row execute function public.crm_relogio();
drop trigger if exists plano_metas_relogio on public.plano_metas;
create trigger plano_metas_relogio before update on public.plano_metas
  for each row execute function public.crm_relogio();
drop trigger if exists plano_medicoes_relogio on public.plano_medicoes;
create trigger plano_medicoes_relogio before update on public.plano_medicoes
  for each row execute function public.crm_relogio();
