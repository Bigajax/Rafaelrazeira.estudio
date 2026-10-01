-- ============================================================
-- 01/10/2026: A LEITURA DA CONVERSA (etapa 2 do plano crm-leitor-whatsapp)
--
-- O botão "Analisar conversa" da ficha grava um pedido aqui, e o leitor do
-- WhatsApp, que já fica de pé no PC, pega o pedido, lê a conversa inteira
-- e devolve a leitura pelo `claude -p` da ASSINATURA (sem API, sem
-- OpenRouter). O site está na Vercel e não roda nada no PC; a fila é a
-- ponte, igual à do time de marketing (mkt_pedidos).
--
-- O leitor também pede uma análise sozinho quando um lead responde
-- (origem 'resposta'), e espera a pessoa terminar de digitar.
--
-- `resultado` é o JSON da leitura: situacao, leitura, etapa_sugerida,
-- porque_etapa, proximo_passo, retorno_em_dias, resposta, alerta. A etapa
-- só é SUGERIDA: quem muda é o Rafael, no botão Aplicar (decisão de
-- 01/10: o simples o CRM faz sozinho, mudar de etapa ele só sugere).
--
-- crm_leitor_sinal: o batimento do leitor, para a ficha avisar "o leitor
-- está desligado" em vez de deixar o pedido esperando em silêncio.
--
-- Rodar uma vez no SQL Editor do Supabase.
-- ============================================================
create table if not exists public.crm_analises (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lead_id uuid not null references public.crm_leads(id) on delete cascade,
  status text not null default 'na_fila' check (status in ('na_fila','rodando','pronta','erro')),
  origem text not null default 'botao' check (origem in ('botao','resposta')),
  resultado jsonb,
  erro text,
  aplicada_em timestamptz,
  pedida_em timestamptz not null default now(),
  pronta_em timestamptz
);

create index if not exists crm_analises_lead_idx on public.crm_analises (lead_id, pedida_em desc);
create index if not exists crm_analises_fila_idx on public.crm_analises (status, pedida_em) where status = 'na_fila';

alter table public.crm_analises enable row level security;
drop policy if exists crm_analises_dono on public.crm_analises;
create policy crm_analises_dono on public.crm_analises
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create table if not exists public.crm_leitor_sinal (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  visto_em timestamptz not null default now()
);
alter table public.crm_leitor_sinal enable row level security;
drop policy if exists crm_leitor_sinal_dono on public.crm_leitor_sinal;
create policy crm_leitor_sinal_dono on public.crm_leitor_sinal
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- A conferência: tem que sair as duas tabelas.
select 'crm_analises' as tabela, count(*) as linhas from public.crm_analises
union all
select 'crm_leitor_sinal', count(*) from public.crm_leitor_sinal;
