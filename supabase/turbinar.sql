-- ============================================================
-- O TURBINAR (03/11/2026): o estúdio roda os anúncios da Meta da loja
-- que já tem a vitrine, por mês. Decisões do Rafael em 03/11:
--   • o Turbinar INCLUI o Performance: quem paga o Turbinar tem a parte paga
--     da aba Desempenho aberta (é nela que aparecem as campanhas);
--   • paga por Pix mês a mês (soma 30 dias) ou cartão que renova sozinho
--     (assinatura do Mercado Pago; cada cobrança soma 35 dias);
--   • o preço de piloto (R$ 397 nos 3 primeiros meses, 2 lojas) é contrato
--     manual de mensalidade no CRM, ligado à loja em turbinar_contrato_id.
-- Os valores moram em lib/oferta.ts (TURBINAR) e lib/oferta-performance.ts
-- (PLANOS_TURBINAR) do estúdio, nunca aqui.
--
-- Mora num arquivo à parte de performance.sql de propósito: é o que se roda
-- no editor do Supabase de uma vez, e roda de novo sem estragar nada (tudo
-- "if not exists" ou "create or replace"). A perf_ao_receber daqui SUBSTITUI
-- a de performance.sql (seção 9): ela ganhou o ramo do Turbinar.
-- ============================================================

-- 1. A loja ganha a situação do Turbinar, separada da do Performance
alter table public.perf_lojas add column if not exists turbinar_ate timestamptz;
alter table public.perf_lojas add column if not exists turbinar_plano text
  check (turbinar_plano in ('turbinar_pix', 'turbinar_cartao', 'manual'));
alter table public.perf_lojas add column if not exists turbinar_assinatura_id text;
alter table public.perf_lojas add column if not exists turbinar_assinatura_status text;
-- o contrato manual do piloto: a mensalidade quitada dele estende o Turbinar
alter table public.perf_lojas add column if not exists turbinar_contrato_id uuid
  references public.crm_contratos(id) on delete set null;

-- 2. Os pagamentos aceitam os planos do Turbinar
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.perf_pagamentos'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%plano%'
  loop
    execute format('alter table public.perf_pagamentos drop constraint %I', c);
  end loop;
end $$;
alter table public.perf_pagamentos add constraint perf_pagamentos_plano_check
  check (plano in ('pix_mensal', 'cartao_mensal', 'cartao_anual', 'turbinar_pix', 'turbinar_cartao'));

-- 3. Soma os dias de UM pagamento do Turbinar. Mesma trava de repetição da
-- perf_registrar_pagamento (o id do pagamento). Estende o Turbinar e leva o
-- Performance junto até a mesma data, sem nunca encurtar o que a loja já
-- tinha pago do Performance.
create or replace function public.perf_registrar_turbinar(
  p_loja uuid, p_plano text, p_payment text, p_valor numeric, p_dias int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_ate timestamptz;
begin
  if p_plano not in ('turbinar_pix', 'turbinar_cartao') then
    raise exception 'plano do Turbinar inválido: %', p_plano;
  end if;
  insert into public.perf_pagamentos (loja_id, plano, mp_payment_id, valor, dias)
  values (p_loja, p_plano, p_payment, p_valor, p_dias)
  on conflict (mp_payment_id) do nothing
  returning id into v_id;
  if v_id is null then
    return jsonb_build_object('novo', false);
  end if;
  update public.perf_lojas
     set turbinar_ate = greatest(coalesce(turbinar_ate, now()), now()) + make_interval(days => p_dias),
         turbinar_plano = p_plano,
         updated_at = now()
   where id = p_loja
  returning turbinar_ate into v_ate;
  update public.perf_lojas
     set liberado_ate = greatest(coalesce(liberado_ate, now()), v_ate)
   where id = p_loja;
  update public.perf_pagamentos set liberado_ate = v_ate where id = v_id;
  return jsonb_build_object('novo', true, 'turbinar_ate', v_ate);
end;
$$;
revoke all on function public.perf_registrar_turbinar(uuid, text, text, numeric, int) from public;
grant execute on function public.perf_registrar_turbinar(uuid, text, text, numeric, int) to service_role;
-- (03/11/2026) anon e authenticated ganham EXECUTE por padrão no Supabase: fechar
revoke execute on function public.perf_registrar_turbinar(uuid, text, text, numeric, int) from anon, authenticated;

-- 4. O que o painel da vitrine lê: a situação do Turbinar, pela chave da loja
-- (a mesma da perf_painel). Sem chave certa, null, e não explica nada.
create or replace function public.perf_turbinar(chave text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_loja public.perf_lojas;
begin
  v_loja := public.perf_loja_da_chave(chave);
  if v_loja.id is null then return null; end if;
  return jsonb_build_object(
    'loja', v_loja.id,
    'ativo', coalesce(v_loja.turbinar_ate > now(), false),
    'ate', v_loja.turbinar_ate,
    'plano', v_loja.turbinar_plano,
    'renova_sozinho', coalesce(v_loja.turbinar_plano = 'turbinar_cartao' and v_loja.turbinar_assinatura_status = 'authorized', false));
end;
$$;
revoke all on function public.perf_turbinar(text) from public;
grant execute on function public.perf_turbinar(text) to anon, authenticated;

-- 5. O recebimento que libera (substitui a da seção 9 de performance.sql):
-- a mensalidade quitada do contrato do Performance estende o Performance,
-- como antes; a do contrato do Turbinar (o piloto) estende o Turbinar e o
-- Performance junto.
create or replace function public.perf_ao_receber()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_p public.crm_parcelas%rowtype;
  v_loja uuid;
  v_turbinar boolean := false;
  v_pago numeric;
  v_ate timestamptz;
begin
  if new.parcela_id is null or new.estornado_em is not null then return new; end if;
  select * into v_p from public.crm_parcelas where id = new.parcela_id;
  if not found then return new; end if;
  select id into v_loja from public.perf_lojas where contrato_id = v_p.contrato_id limit 1;
  if v_loja is null then
    select id into v_loja from public.perf_lojas where turbinar_contrato_id = v_p.contrato_id limit 1;
    v_turbinar := v_loja is not null;
  end if;
  if v_loja is null then return new; end if;
  select coalesce(sum(valor), 0) into v_pago
    from public.crm_recebimentos
   where parcela_id = v_p.id and estornado_em is null;
  if v_pago + 0.005 < v_p.valor then return new; end if;
  v_ate := v_p.vence_em::timestamptz + interval '1 month' + interval '5 days';
  if v_turbinar then
    update public.perf_lojas
       set turbinar_ate = greatest(coalesce(turbinar_ate, now()), v_ate),
           turbinar_plano = coalesce(turbinar_plano, 'manual'),
           liberado_ate = greatest(coalesce(liberado_ate, now()), v_ate)
     where id = v_loja;
  else
    update public.perf_lojas
       set liberado_ate = greatest(coalesce(liberado_ate, now()), v_ate)
     where id = v_loja;
  end if;
  return new;
end;
$$;

drop trigger if exists perf_ao_receber on public.crm_recebimentos;
create trigger perf_ao_receber
  after insert or update of parcela_id, estornado_em on public.crm_recebimentos
  for each row execute function public.perf_ao_receber();
