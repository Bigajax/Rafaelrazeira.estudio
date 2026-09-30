-- ============================================================
-- FINANCEIRO: os custos do estúdio, para o resultado do mês
-- Cole este arquivo inteiro em: Supabase → SQL Editor → Run.
-- Idempotente: rodar duas vezes não quebra nem duplica nada.
-- Depende do crm.sql (a função crm_relogio).
-- ============================================================
--
-- POR QUE EXISTE (30/09/2026)
--
-- O Caixa sabe o que ENTRA (crm_recebimentos) e o que falta cobrar. Faltava
-- o que SAI: Claude, ChatGPT, Vercel, Supabase e o tráfego pago. Com os dois
-- lados, a aba Financeiro monta o resultado do mês (o DRE, em linguagem de
-- gente: entrou, taxas, custos, sobrou).
--
-- UMA TABELA SÓ, de custos. A receita NÃO é digitada aqui: vem do Caixa, que
-- é quem sabe do dinheiro. Um custo tem frequência:
--   mensal   o valor vale para cada mês entre `inicio` e `fim`
--   semanal  o valor × 52 ÷ 12 por mês (R$ 1.000 por semana ≈ R$ 4.333/mês)
--   anual    o valor ÷ 12 por mês
--   unico    uma saída só, no mês de `inicio` (uma recarga, um equipamento)
-- Custo em dólar guarda o valor em dólar; a conversão é feita na tela com a
-- cotação do dia, porque o dólar muda e o custo não.
-- ============================================================

create table if not exists public.fin_custos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null check (length(nome) between 1 and 80),
  categoria text not null default 'ferramenta'
    check (categoria in ('trafego','ferramenta','pessoal','imposto','outro')),
  valor numeric not null check (valor > 0),
  moeda text not null default 'BRL' check (moeda in ('BRL','USD')),
  frequencia text not null default 'mensal' check (frequencia in ('mensal','semanal','anual','unico')),
  -- o primeiro mês do custo (sempre dia 1) e o último, quando parou
  inicio date not null default date_trunc('month', now())::date check (extract(day from inicio) = 1),
  fim date check (fim is null or extract(day from fim) = 1),
  -- estimativa: o valor é um chute consciente (o tráfego, enquanto a Meta
  -- não é lida direto); a tela mostra isso
  estimado boolean not null default false,
  nota text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fin_custos_owner_idx on public.fin_custos (owner_id, inicio);

alter table public.fin_custos enable row level security;

drop policy if exists fin_custos_dono on public.fin_custos;
create policy fin_custos_dono on public.fin_custos for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

drop trigger if exists fin_custos_relogio on public.fin_custos;
create trigger fin_custos_relogio before update on public.fin_custos
  for each row execute function public.crm_relogio();

-- ---------- 30/09: a conta da virada ----------
-- "Temos que ter metas claras: quantas vitrines para bater o custo e passar,
-- com margem." O ticket médio e a margem que o Rafael escolhe moram no ciclo
-- do Plano do ano (é meta do ano, não custo). Depende do plano.sql.
alter table public.plano_ciclos add column if not exists ticket_medio numeric check (ticket_medio is null or ticket_medio > 0);
alter table public.plano_ciclos add column if not exists margem_alvo int check (margem_alvo is null or margem_alvo between 0 and 90);
