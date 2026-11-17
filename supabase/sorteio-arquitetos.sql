-- Uma campanha, um QR público, inscrições e um único site de presente.
-- Independente da raspadinha legada de 50%; não altera seus registros.
begin;
create table if not exists public.arquiteto_sorteios (
  campanha text primary key check (campanha = 'bloco-arquitetura-site-2026'),
  owner_id uuid not null references auth.users(id),
  criado_em timestamptz not null default now(),
  sorteado_em timestamptz,
  ganhador_id uuid,
  check ((sorteado_em is null) = (ganhador_id is null))
);
create table if not exists public.arquiteto_participantes (
  id uuid primary key default gen_random_uuid(),
  campanha text not null references public.arquiteto_sorteios(campanha),
  nome text not null check (char_length(nome) between 2 and 100),
  whatsapp text not null check (whatsapp ~ '^[1-9][1-9][0-9]{8,9}$'),
  recibo_hash text not null check (recibo_hash ~ '^[a-f0-9]{64}$'),
  codigo text not null unique default ('SITE-' || upper(replace(gen_random_uuid()::text, '-', ''))),
  criado_em timestamptz not null default now(),
  entregue_em timestamptz,
  unique (campanha, whatsapp), unique (campanha, recibo_hash), unique (campanha, id)
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'arquiteto_ganhador_da_campanha' and conrelid = 'public.arquiteto_sorteios'::regclass) then
    alter table public.arquiteto_sorteios add constraint arquiteto_ganhador_da_campanha
      foreign key (campanha, ganhador_id) references public.arquiteto_participantes(campanha, id);
  end if;
end $$;
alter table public.arquiteto_sorteios enable row level security;
alter table public.arquiteto_participantes enable row level security;
revoke all on public.arquiteto_sorteios, public.arquiteto_participantes from public, anon, authenticated, service_role;
grant select on public.arquiteto_sorteios, public.arquiteto_participantes to authenticated;
grant select, insert, update on public.arquiteto_sorteios, public.arquiteto_participantes to service_role;
drop policy if exists sorteio_dono on public.arquiteto_sorteios;
create policy sorteio_dono on public.arquiteto_sorteios for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists participantes_dono on public.arquiteto_participantes;
create policy participantes_dono on public.arquiteto_participantes for select to authenticated using (
  exists (select 1 from public.arquiteto_sorteios s where s.campanha = arquiteto_participantes.campanha and s.owner_id = (select auth.uid()))
);

-- Inscrição e sorteio usam o mesmo lock: ninguém entra depois do encerramento.
create or replace function public.arquiteto_inscrever(p_owner uuid, p_nome text, p_whatsapp text, p_recibo_hash text)
returns uuid language plpgsql set search_path = public as $$
declare s public.arquiteto_sorteios; inscrito uuid;
begin
  select * into s from public.arquiteto_sorteios where campanha = 'bloco-arquitetura-site-2026' and owner_id = p_owner for update;
  if not found then raise exception 'sorteio_nao_aberto'; end if;
  select id into inscrito from public.arquiteto_participantes where campanha = s.campanha and recibo_hash = p_recibo_hash;
  if found then return inscrito; end if;
  if s.sorteado_em is not null then raise exception 'sorteio_encerrado'; end if;
  if exists (select 1 from public.arquiteto_participantes where campanha = s.campanha and whatsapp = p_whatsapp) then
    raise exception 'whatsapp_ja_inscrito';
  end if;
  insert into public.arquiteto_participantes(campanha, nome, whatsapp, recibo_hash)
    values (s.campanha, p_nome, p_whatsapp, p_recibo_hash) returning id into inscrito;
  return inscrito;
end;
$$;

create or replace function public.arquiteto_sortear_site(p_owner uuid)
returns uuid language plpgsql set search_path = public as $$
declare s public.arquiteto_sorteios; ganhador uuid;
begin
  select * into s from public.arquiteto_sorteios where campanha = 'bloco-arquitetura-site-2026' and owner_id = p_owner for update;
  if not found then raise exception 'sorteio_nao_aberto'; end if;
  if s.ganhador_id is not null then return s.ganhador_id; end if;
  -- UUIDs v4 novos por linha vêm do gerador criptográfico do Postgres.
  -- Todos os inscritos entram na mesma seleção; a chegada não define o vencedor.
  select id into ganhador from public.arquiteto_participantes where campanha = s.campanha order by gen_random_uuid() limit 1;
  if not found then raise exception 'nenhum_participante'; end if;
  update public.arquiteto_sorteios set ganhador_id = ganhador, sorteado_em = clock_timestamp() where campanha = s.campanha;
  return ganhador;
end;
$$;

-- As funções que escrevem só podem ser chamadas pelo servidor.
revoke all on function public.arquiteto_inscrever(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.arquiteto_sortear_site(uuid) from public, anon, authenticated;
grant execute on function public.arquiteto_inscrever(uuid, text, text, text), public.arquiteto_sortear_site(uuid) to service_role;

create or replace function public.arquiteto_preservar_sorteio()
returns trigger language plpgsql set search_path = public as $$
begin
  if (new.campanha, new.owner_id, new.criado_em) is distinct from (old.campanha, old.owner_id, old.criado_em)
    or (old.sorteado_em is not null and (new.sorteado_em, new.ganhador_id) is distinct from (old.sorteado_em, old.ganhador_id)) then
    raise exception 'O sorteio e seu resultado não podem ser reiniciados';
  end if;
  return new;
end;
$$;
create or replace function public.arquiteto_preservar_participante()
returns trigger language plpgsql set search_path = public as $$
begin
  if (new.id, new.campanha, new.nome, new.whatsapp, new.recibo_hash, new.codigo, new.criado_em)
    is distinct from (old.id, old.campanha, old.nome, old.whatsapp, old.recibo_hash, old.codigo, old.criado_em) then
    raise exception 'A participação não pode ser transferida';
  end if;
  if new.entregue_em is not null and not exists (
    select 1 from public.arquiteto_sorteios s where s.campanha = new.campanha and s.ganhador_id = new.id
  ) then raise exception 'Somente o ganhador pode receber o site'; end if;
  if old.entregue_em is not null and new.entregue_em is distinct from old.entregue_em then
    raise exception 'A entrega já foi registrada';
  end if;
  return new;
end;
$$;
revoke all on function public.arquiteto_preservar_sorteio(), public.arquiteto_preservar_participante() from public, anon, authenticated;
drop trigger if exists arquiteto_preservar_sorteio on public.arquiteto_sorteios;
create trigger arquiteto_preservar_sorteio before update on public.arquiteto_sorteios for each row execute function public.arquiteto_preservar_sorteio();
drop trigger if exists arquiteto_preservar_participante on public.arquiteto_participantes;
create trigger arquiteto_preservar_participante before update on public.arquiteto_participantes for each row execute function public.arquiteto_preservar_participante();
notify pgrst, 'reload schema';
commit;
