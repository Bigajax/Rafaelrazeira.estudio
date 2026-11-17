-- Aplicar DEPOIS de sorteio-arquitetos.sql. Reaplicável, sem reiniciar o sorteio.
-- 1 site, até 2 cupons de 50%, R$ 300 de desconto para os demais.
begin;
alter table public.arquiteto_participantes
  add column if not exists beneficio text,
  add column if not exists faixa50 smallint,
  add column if not exists utilizado_em timestamptz,
  add column if not exists desconto_centavos integer generated always as (
    case beneficio when 'site' then 149900 when 'cupom50' then 74950 when 'cupom300' then 30000 end
  ) stored,
  add column if not exists final_centavos integer generated always as (
    case beneficio when 'site' then 0 when 'cupom50' then 74950 when 'cupom300' then 119900 end
  ) stored;
alter table public.arquiteto_participantes alter column codigo set default ('BLOCO-' || upper(replace(gen_random_uuid()::text, '-', '')));
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'arquiteto_beneficio_valido' and conrelid = 'public.arquiteto_participantes'::regclass) then
    alter table public.arquiteto_participantes add constraint arquiteto_beneficio_valido check (beneficio in ('site','cupom50','cupom300'));
    alter table public.arquiteto_participantes add constraint arquiteto_faixa50_valida check (
      (beneficio = 'cupom50' and faixa50 is not null and faixa50 in (1,2))
      or (beneficio is distinct from 'cupom50' and faixa50 is null)
    );
    alter table public.arquiteto_participantes add constraint arquiteto_uso_cupom_valido check (
      utilizado_em is null or (beneficio is not null and beneficio in ('cupom50','cupom300') and utilizado_em >= criado_em)
    );
  end if;
end $$;
create unique index if not exists arquiteto_um_site_por_campanha on public.arquiteto_participantes(campanha) where beneficio = 'site';
create unique index if not exists arquiteto_dois_cupons50_por_campanha on public.arquiteto_participantes(campanha,faixa50) where faixa50 is not null;

create or replace function public.arquiteto_preservar_participante()
returns trigger language plpgsql set search_path = public as $$
begin
  if (new.id, new.campanha, new.nome, new.whatsapp, new.recibo_hash, new.codigo, new.criado_em)
    is distinct from (old.id, old.campanha, old.nome, old.whatsapp, old.recibo_hash, old.codigo, old.criado_em) then
    raise exception 'A participação não pode ser transferida';
  end if;
  if old.beneficio is not null and (new.beneficio,new.faixa50) is distinct from (old.beneficio,old.faixa50) then
    raise exception 'O benefício já foi definido';
  end if;
  if new.entregue_em is not null and not exists (
    select 1 from public.arquiteto_sorteios s where s.campanha = new.campanha and s.ganhador_id = new.id
  ) then raise exception 'Somente o ganhador pode receber o site'; end if;
  if old.entregue_em is not null and new.entregue_em is distinct from old.entregue_em then
    raise exception 'A entrega já foi registrada';
  end if;
  if old.utilizado_em is not null and new.utilizado_em is distinct from old.utilizado_em then
    raise exception 'Este cupom já foi utilizado';
  end if;
  return new;
end;
$$;

create or replace function public.arquiteto_sortear_site(p_owner uuid)
returns uuid language plpgsql set search_path = public as $$
declare s public.arquiteto_sorteios; ganhador uuid; especiais uuid[];
begin
  select * into s from public.arquiteto_sorteios where campanha = 'bloco-arquitetura-site-2026' and owner_id = p_owner for update;
  if not found then raise exception 'sorteio_nao_aberto'; end if;
  -- Toda a distribuição ocorre nesta transação, sob o mesmo lock das inscrições.
  if exists (select 1 from public.arquiteto_participantes where campanha = s.campanha and beneficio is not null) then
    if s.ganhador_id is null or exists (select 1 from public.arquiteto_participantes where campanha = s.campanha and beneficio is null) then
      raise exception 'distribuicao_inconsistente';
    end if;
    return s.ganhador_id;
  end if;
  -- Se o site já tiver sido sorteado na versão anterior, preserva seu ganhador.
  ganhador := s.ganhador_id;
  if ganhador is null then
    select id into ganhador from public.arquiteto_participantes where campanha = s.campanha order by gen_random_uuid() limit 1;
    if not found then raise exception 'nenhum_participante'; end if;
  end if;
  select array_agg(id) into especiais from (
    select id from public.arquiteto_participantes where campanha = s.campanha and id <> ganhador order by gen_random_uuid() limit 2
  ) selecionados;
  update public.arquiteto_participantes set
    beneficio = case when id = ganhador then 'site' when id = any(especiais) then 'cupom50' else 'cupom300' end,
    faixa50 = case when id = any(especiais) then array_position(especiais,id)::smallint else null end
    where campanha = s.campanha;
  if s.sorteado_em is null then
    update public.arquiteto_sorteios set ganhador_id = ganhador, sorteado_em = clock_timestamp() where campanha = s.campanha;
  end if;
  return ganhador;
end;
$$;
revoke all on function public.arquiteto_sortear_site(uuid), public.arquiteto_preservar_participante() from public, anon, authenticated;
grant execute on function public.arquiteto_sortear_site(uuid) to service_role;
notify pgrst, 'reload schema';
commit;
