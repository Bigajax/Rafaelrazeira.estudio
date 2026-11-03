-- ============================================================
-- O CUSTO POR CONVERSA DO TURBINAR (03/11/2026, "a opção simples"):
-- o estúdio lança no CRM quanto a loja gastou na Meta em cada mês, e o
-- painel mostra o gasto, as conversas que vieram dos anúncios naquele mês
-- e a conta das duas. O gasto mora na Meta; aqui entra pela mão do Rafael.
--
-- A regra que separa anúncio de post: SÓ conta a campanha cujo
-- utm_campaign (ou ?de=) começa com "anuncio-" (ex.: anuncio-tenis-corrida).
-- Post orgânico com link curto continua na aba Desempenho, fora desta conta.
-- A conversa é o mesmo critério da perf_painel: o visitante que veio de uma
-- dessas campanhas no mês e chamou no WhatsApp no mesmo mês.
--
-- Roda depois do supabase/turbinar.sql; rodar de novo não estraga nada. A
-- perf_turbinar daqui SUBSTITUI a do turbinar.sql: ganhou os meses.
-- ============================================================

-- 1. O gasto do mês, um por loja e por mês
create table if not exists public.perf_turbinar_gastos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  loja_id uuid not null references public.perf_lojas(id) on delete cascade,
  -- o primeiro dia do mês: 2026-11-01 é novembro
  mes date not null check (extract(day from mes) = 1),
  valor numeric(10, 2) not null check (valor >= 0 and valor < 100000),
  criado_em timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists perf_turbinar_gastos_mes_idx on public.perf_turbinar_gastos (loja_id, mes);

alter table public.perf_turbinar_gastos enable row level security;
drop policy if exists perf_turbinar_gastos_dono on public.perf_turbinar_gastos;
create policy perf_turbinar_gastos_dono on public.perf_turbinar_gastos
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
revoke all on public.perf_turbinar_gastos from anon;

-- 2. O que o painel lê: a situação do Turbinar e os 3 últimos meses (o de
-- agora incluído), cada um com o gasto lançado (ou null), as pessoas e as
-- conversas que vieram dos anúncios. A conta (gasto / conversas) é do painel.
create or replace function public.perf_turbinar(chave text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_loja public.perf_lojas;
  v_inicio date;
  v_meses jsonb;
begin
  v_loja := public.perf_loja_da_chave(chave);
  if v_loja.id is null then return null; end if;

  v_inicio := (date_trunc('month', now() at time zone v_loja.fuso) - interval '2 months')::date;

  with ev as (
    select e.visitante, e.tipo, e.post,
           date_trunc('month', e.criado_em at time zone v_loja.fuso)::date as mes,
           e.criado_em
      from public.perf_eventos e
     where e.loja_id = v_loja.id
       and e.criado_em >= (v_inicio::timestamp at time zone v_loja.fuso)
  ), quem as (
    -- cada visitante em cada mês: se veio de um anúncio e se chamou
    select mes, visitante,
           bool_or(post like 'anuncio-%') as do_anuncio,
           bool_or(tipo = 'whatsapp') as chamou
      from ev group by mes, visitante
  ), meses as (
    select generate_series(v_inicio, date_trunc('month', now() at time zone v_loja.fuso)::date, interval '1 month')::date as mes
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'mes', to_char(m.mes, 'YYYY-MM'),
           'gasto', g.valor,
           'pessoas', coalesce((select count(*) from quem q where q.mes = m.mes and q.do_anuncio), 0),
           'conversas', coalesce((select count(*) from quem q where q.mes = m.mes and q.do_anuncio and q.chamou), 0))
         order by m.mes desc), '[]'::jsonb)
    into v_meses
    from meses m
    left join public.perf_turbinar_gastos g on g.loja_id = v_loja.id and g.mes = m.mes;

  return jsonb_build_object(
    'loja', v_loja.id,
    'ativo', coalesce(v_loja.turbinar_ate > now(), false),
    'ate', v_loja.turbinar_ate,
    'plano', v_loja.turbinar_plano,
    'renova_sozinho', coalesce(v_loja.turbinar_plano = 'turbinar_cartao' and v_loja.turbinar_assinatura_status = 'authorized', false),
    'meses', v_meses);
end;
$$;
revoke all on function public.perf_turbinar(text) from public;
grant execute on function public.perf_turbinar(text) to anon, authenticated;
