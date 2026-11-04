-- ============================================================
-- QUEM ABRIU O PAGAMENTO DO TURBINAR (04/11/2026, pedido do Rafael: "saber
-- quem se interessou"). Cada vez que a dona toca em "Quero turbinar" no
-- painel, a loja ganha uma linha aqui; o CRM mostra, na loja sem Turbinar,
-- "abriu o pagamento do Turbinar em ...": um lead quente para chamar.
--
-- Uma linha a cada 30 minutos por loja, no máximo (tocar três vezes seguidas
-- é uma olhada só). A tabela não guarda quem é a pessoa, só a loja e a hora.
--
-- Roda depois do supabase/turbinar.sql; rodar de novo não estraga nada.
-- ============================================================

create table if not exists public.perf_turbinar_olhadas (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  loja_id uuid not null references public.perf_lojas(id) on delete cascade,
  criado_em timestamptz not null default now()
);
create index if not exists perf_turbinar_olhadas_loja_idx on public.perf_turbinar_olhadas (loja_id, criado_em desc);

-- o CRM (o dono da loja no central, logado) lê; ninguém escreve direto
alter table public.perf_turbinar_olhadas enable row level security;
drop policy if exists perf_turbinar_olhadas_dono on public.perf_turbinar_olhadas;
create policy perf_turbinar_olhadas_dono on public.perf_turbinar_olhadas
  for select to authenticated
  using (owner_id = (select auth.uid()));
revoke all on public.perf_turbinar_olhadas from anon;
revoke insert, update, delete on public.perf_turbinar_olhadas from authenticated;

-- o painel da loja chama com a chave dela (a mesma das outras perf_*)
create or replace function public.perf_turbinar_olhou(chave text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loja public.perf_lojas;
begin
  v_loja := public.perf_loja_da_chave(chave);
  if v_loja.id is null then return; end if;
  if exists (select 1 from public.perf_turbinar_olhadas
              where loja_id = v_loja.id and criado_em > now() - interval '30 minutes') then
    return;
  end if;
  insert into public.perf_turbinar_olhadas (owner_id, loja_id) values (v_loja.owner_id, v_loja.id);
end;
$$;
revoke all on function public.perf_turbinar_olhou(text) from public;
grant execute on function public.perf_turbinar_olhou(text) to anon, authenticated;
