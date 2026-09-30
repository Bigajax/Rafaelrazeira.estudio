-- ============================================================
-- PROJETOS: o que acontece depois do "fechou"
-- Cole este arquivo inteiro em: Supabase → SQL Editor → Run.
-- Idempotente: rodar duas vezes não quebra nem duplica nada.
-- Depende do crm.sql (crm_leads e a função crm_relogio).
-- ============================================================
--
-- POR QUE EXISTE (30/09/2026)
--
-- O funil do CRM termina em `ganho`, e o trabalho não: entre o Pix da
-- entrada e a loja no domínio do cliente tem o material que ele deve, o
-- cadastro, o domínio, ligar a loja e a entrega. Até aqui isso morava em
-- listas soltas na ficha do cofre, uma por cliente, e na Full Time a lista
-- precisou ser refeita do zero conferindo o banco.
--
-- UM PROJETO POR LEAD. A linha nasce na primeira vez que alguma coisa do
-- projeto é marcada; antes disso a aba desenha o molde (lib/projetos/tipos.ts)
-- sem gravar nada, então um `ganho` antigo não vira linha sozinho.
--
-- O QUE NÃO É COLUNA: a etapa atual. Ela é a primeira etapa com item em
-- aberto, calculada na tela, pela mesma regra do "atrasado" do Caixa:
-- guardada, viraria estado para manter sincronizado. E "entrada recebida" e
-- "saldo recebido" não são itens do checklist: vêm do Caixa, que é quem
-- sabe do dinheiro.
--
-- E NENHUMA COLUNA NOVA EM `crm_leads`, pela mesma nota do Caixa:
-- `crm_leads_painel` congela colunas. O projeto aponta para o lead.
-- ============================================================

create table if not exists public.crm_projetos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lead_id uuid not null references public.crm_leads(id) on delete cascade,

  -- O checklist inteiro, como a tela o mostra: [{ id, etapa, texto, feito,
  -- feito_em }]. Um documento e não uma tabela de itens: nunca se consulta
  -- um item fora do projeto dele, e o molde muda de loja para loja.
  checklist jsonb not null default '[]'::jsonb,

  -- Onde a vitrine mora. `site` é o endereço de hoje (a Vercel até o
  -- domínio entrar); `dominio` é o do cliente, quando houver.
  site text,
  dominio text,
  repo text,

  -- A chave da loja no bucket `material` (o checklist do cliente em
  -- /entrega/<loja>-checklist.html grava em material/<loja>/). Nula quando
  -- o cliente não recebeu checklist.
  material text check (material is null or material ~ '^[a-z0-9-]{1,60}$'),

  notas text,
  entregue_em date,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (owner_id, lead_id)
);

create index if not exists crm_projetos_lead_idx on public.crm_projetos (owner_id, lead_id);

alter table public.crm_projetos enable row level security;

drop policy if exists crm_projetos_dono on public.crm_projetos;
create policy crm_projetos_dono on public.crm_projetos
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop trigger if exists crm_projetos_relogio on public.crm_projetos;
create trigger crm_projetos_relogio
  before update on public.crm_projetos
  for each row execute function public.crm_relogio();
