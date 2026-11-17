-- Palestra: um único prêmio, identificado pelo link entregue ao sorteado.
-- Aplicar no SQL Editor do projeto Supabase já usado pelo CRM.
begin;
create table if not exists public.arquiteto_cupom_evento (
  campanha text primary key check (campanha = 'bloco-arquitetura-2026'),
  owner_id uuid not null references auth.users(id),
  token text not null unique check (token ~ '^[a-f0-9]{64}$'),
  codigo text not null unique,
  original_centavos integer not null default 149900 check (original_centavos = 149900),
  final_centavos integer not null default 74950 check (final_centavos = 74950),
  criado_em timestamptz not null default now(),
  resgatado_em timestamptz,
  utilizado_em timestamptz,
  nome text check (char_length(nome) between 2 and 100),
  whatsapp text check (whatsapp ~ '^[0-9]{10,13}$'),
  recibo_hash text check (recibo_hash ~ '^[a-f0-9]{64}$'),
  constraint resgate_completo check (
    (resgatado_em is null and nome is null and whatsapp is null and recibo_hash is null)
    or (resgatado_em is not null and nome is not null and whatsapp is not null and recibo_hash is not null)
  ),
  constraint uso_apos_resgate check (utilizado_em is null or (resgatado_em is not null and utilizado_em >= resgatado_em))
);
alter table public.arquiteto_cupom_evento enable row level security;
revoke all on public.arquiteto_cupom_evento from public, anon, authenticated, service_role;
grant select on public.arquiteto_cupom_evento to authenticated;
grant select, insert, update on public.arquiteto_cupom_evento to service_role;
drop policy if exists cupom_leitura_dono on public.arquiteto_cupom_evento;
create policy cupom_leitura_dono on public.arquiteto_cupom_evento
  for select to authenticated using (owner_id = (select auth.uid()));

-- Protege o histórico mesmo contra uma atualização acidental do servidor.
create or replace function public.arquiteto_preservar_cupom()
returns trigger language plpgsql set search_path = public as $$
begin
  if (new.campanha, new.owner_id, new.token, new.codigo, new.original_centavos, new.final_centavos, new.criado_em)
    is distinct from
    (old.campanha, old.owner_id, old.token, old.codigo, old.original_centavos, old.final_centavos, old.criado_em) then
    raise exception 'A identidade e a oferta do prêmio são imutáveis';
  end if;
  if old.resgatado_em is not null and
    (new.resgatado_em, new.nome, new.whatsapp, new.recibo_hash)
      is distinct from (old.resgatado_em, old.nome, old.whatsapp, old.recibo_hash) then
    raise exception 'Este prêmio já tem ganhador';
  end if;
  if old.utilizado_em is not null and new.utilizado_em is distinct from old.utilizado_em then
    raise exception 'Este cupom já foi utilizado';
  end if;
  return new;
end;
$$;
revoke all on function public.arquiteto_preservar_cupom() from public, anon, authenticated;
drop trigger if exists arquiteto_preservar_cupom on public.arquiteto_cupom_evento;
create trigger arquiteto_preservar_cupom before update on public.arquiteto_cupom_evento
  for each row execute function public.arquiteto_preservar_cupom();
notify pgrst, 'reload schema';
commit;
