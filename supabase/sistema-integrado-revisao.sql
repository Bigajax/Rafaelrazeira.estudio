-- Complemento de sistema-integrado.sql. Aplicar o arquivo inteiro, uma vez; reaplicação segura.
begin;

alter table public.crm_devolucoes add column if not exists origem text not null default 'manual';
alter table public.crm_devolucoes add column if not exists mp_refund_id text;
create unique index if not exists crm_devolucoes_mp on public.crm_devolucoes(owner_id,recebimento_id,mp_refund_id) where mp_refund_id is not null;

-- Completar marcas integrais antigas sem reabrir um saldo nem duplicar as parcelas devolvidas.
insert into public.crm_devolucoes(owner_id,recebimento_id,valor,devolvido_em,notas,request_id,origem)
select r.owner_id,r.id,r.valor-coalesce((select sum(d.valor) from public.crm_devolucoes d where d.recebimento_id=r.id),0),r.estornado_em,
  'Complemento de estorno integral legado',gen_random_uuid(),'legado'
from public.crm_recebimentos r where r.estornado_em is not null and r.valor>coalesce((select sum(d.valor) from public.crm_devolucoes d where d.recebimento_id=r.id),0);
update public.crm_recebimentos set valor_estornado=valor where estornado_em is not null and valor_estornado<>valor;

create or replace function public.crm_registrar_devolucao(p_recebimento uuid,p_valor numeric,p_dia date,p_request uuid,p_notas text default null)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.crm_recebimentos; existente uuid; novo uuid; devolvido numeric;
begin
  if auth.uid() is null or p_request is null then raise exception 'Sessão e identificador necessários'; end if;
  select * into r from public.crm_recebimentos where id=p_recebimento and owner_id=auth.uid() for update;
  if not found then raise exception 'Recebimento não encontrado'; end if;
  select id into existente from public.crm_devolucoes where request_id=p_request and owner_id=auth.uid() and recebimento_id=p_recebimento;
  if existente is not null then return existente; end if;
  if r.estornado_em is not null then raise exception 'Recebimento integralmente devolvido. Atualize a tela.'; end if;
  if r.mp_payment_id is not null then raise exception 'Devoluções Mercado Pago são conferidas na Conciliação.'; end if;
  select coalesce(sum(valor),0) into devolvido from public.crm_devolucoes where recebimento_id=r.id;
  devolvido=greatest(devolvido,r.valor_estornado);
  if p_valor is null or p_valor::text in ('NaN','Infinity','-Infinity') or round(p_valor,2)<=0 or round(p_valor,2)+devolvido>r.valor or p_dia is null or p_dia<r.recebido_em or p_dia>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'Valor ou data de devolução inválidos'; end if;
  insert into public.crm_devolucoes(owner_id,recebimento_id,valor,devolvido_em,request_id,notas)
  values(auth.uid(),r.id,round(p_valor,2),p_dia,p_request,left(p_notas,1000)) returning id into novo;
  update public.crm_recebimentos set valor_estornado=devolvido+round(p_valor,2),estornado_em=case when devolvido+round(p_valor,2)=r.valor then p_dia else null end where id=r.id;
  return novo;
end $$;
revoke all on function public.crm_registrar_devolucao(uuid,numeric,date,uuid,text) from public;
grant execute on function public.crm_registrar_devolucao(uuid,numeric,date,uuid,text) to authenticated;

create or replace function public.crm_sincronizar_devolucoes(p_owner uuid,p_payment text,p_movimentos jsonb,p_status text)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.crm_recebimentos; m jsonb; total numeric; dia date; valor numeric; existente public.crm_devolucoes;
begin
  select * into r from public.crm_recebimentos where owner_id=p_owner and mp_payment_id=p_payment for update;
  if not found then raise exception 'Recebimento original ainda não registrado'; end if;
  if jsonb_typeof(p_movimentos) is distinct from 'array' or jsonb_array_length(p_movimentos)=0 then raise exception 'Aguardando identificação e data da devolução'; end if;
  if exists(select 1 from public.crm_devolucoes where recebimento_id=r.id and mp_refund_id is null) then raise exception 'Há devolução manual ou legada: conferir correspondência antes de importar'; end if;
  for m in select value from jsonb_array_elements(p_movimentos) loop
    valor=(m->>'valor')::numeric; dia=(m->>'dia')::date;
    if length(coalesce(m->>'id','')) not between 1 and 160 or valor is null or valor::text in ('NaN','Infinity','-Infinity') or round(valor,2)<=0 or dia is null or dia<r.recebido_em or dia>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'Movimento do provedor sem valor ou data válidos'; end if;
    select * into existente from public.crm_devolucoes where owner_id=p_owner and recebimento_id=r.id and mp_refund_id=m->>'id';
    if found then
      if existente.valor<>round(valor,2) or existente.devolvido_em<>dia then raise exception 'Movimento já registrado com dados diferentes'; end if;
    else
      insert into public.crm_devolucoes(owner_id,recebimento_id,valor,devolvido_em,request_id,origem,mp_refund_id,notas)
      values(p_owner,r.id,round(valor,2),dia,gen_random_uuid(),'mercadopago',m->>'id',left(coalesce(m->>'nota','Importado do Mercado Pago'),1000));
    end if;
  end loop;
  select coalesce(sum(d.valor),0),max(d.devolvido_em) into total,dia from public.crm_devolucoes d where d.recebimento_id=r.id;
  if total>r.valor then raise exception 'Devoluções superiores ao recebimento'; end if;
  if r.estornado_em is not null and total<r.valor then raise exception 'Atualização parcial não pode reabrir estorno integral'; end if;
  if p_status in ('refunded','charged_back') and total<r.valor then raise exception 'Devolução integral ainda sem todos os movimentos'; end if;
  update public.crm_recebimentos set valor_estornado=total,estornado_em=case when total=r.valor then coalesce(r.estornado_em,dia) else null end,mp_status=case when r.estornado_em is not null then r.mp_status else p_status end where id=r.id;
end $$;
revoke all on function public.crm_sincronizar_devolucoes(uuid,text,jsonb,text) from public;
grant execute on function public.crm_sincronizar_devolucoes(uuid,text,jsonb,text) to service_role;

create or replace function public.crm_cancelar_contrato(p_contrato uuid) returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
declare c public.crm_contratos;
begin
  if auth.uid() is null then raise exception 'Sessão necessária'; end if;
  select * into c from public.crm_contratos where id=p_contrato and owner_id=auth.uid() for update;
  if not found then raise exception 'Contrato não encontrado'; end if;
  if c.status='cancelado' then return; end if;
  perform 1 from public.crm_parcelas where contrato_id=c.id for update;
  -- Bloquear também os recebimentos existentes antes de apurar os saldos.
  perform 1 from public.crm_recebimentos r join public.crm_parcelas p on p.id=r.parcela_id where p.contrato_id=c.id for update of r;
  update public.crm_parcelas p set cancelada_em=(now() at time zone 'America/Sao_Paulo')::date
  where p.contrato_id=c.id and p.owner_id=auth.uid() and p.cancelada_em is null
  and coalesce((select sum(case when r.estornado_em is not null then 0 else greatest(0,r.valor-r.valor_estornado) end) from public.crm_recebimentos r where r.parcela_id=p.id),0)<p.valor;
  update public.crm_contratos set status='cancelado' where id=c.id;
  update public.crm_leads set valor_fechado=(select coalesce(sum(valor_total),0) from public.crm_contratos where lead_id=c.lead_id and owner_id=auth.uid() and tipo='projeto' and status='ativo'),fechado_em=(select min(assinado_em) from public.crm_contratos where lead_id=c.lead_id and owner_id=auth.uid() and tipo='projeto' and status='ativo') where id=c.lead_id and owner_id=auth.uid() and estagio='ganho';
end $$;
revoke all on function public.crm_cancelar_contrato(uuid) from public;
grant execute on function public.crm_cancelar_contrato(uuid) to authenticated;

create table if not exists public.crm_integracoes (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id),payment_id text not null,
 estado text not null check(estado in ('pendente','concluido')),motivo text,ultima_tentativa timestamptz not null default now(),tentativas integer not null default 1,
 unique(owner_id,payment_id)
);
alter table public.crm_integracoes enable row level security;
drop policy if exists crm_integracoes_dono on public.crm_integracoes;
create policy crm_integracoes_dono on public.crm_integracoes for select to authenticated using(owner_id=auth.uid());
grant select on public.crm_integracoes to authenticated;
create or replace function public.crm_integracao_estado(p_owner uuid,p_payment text,p_estado text,p_motivo text default null) returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 insert into public.crm_integracoes(owner_id,payment_id,estado,motivo)values(p_owner,p_payment,p_estado,left(p_motivo,500))
 on conflict(owner_id,payment_id)do update set estado=excluded.estado,motivo=excluded.motivo,ultima_tentativa=now(),tentativas=crm_integracoes.tentativas+case when excluded.estado='pendente' then 1 else 0 end;
end $$;
revoke all on function public.crm_integracao_estado(uuid,text,text,text) from public;
grant execute on function public.crm_integracao_estado(uuid,text,text,text) to service_role;

-- Ocorrências possuem vencimento próprio; o rateio anual continua apenas como equivalente mensal.
create table if not exists public.fin_ocorrencias (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null default auth.uid() references auth.users(id),custo_id uuid not null references public.fin_custos(id) on delete restrict,
 descricao text not null check(length(descricao) between 1 and 120),vence_em date not null,valor numeric(14,2) not null check(valor>0),moeda text not null check(moeda in ('BRL','USD')),
 created_at timestamptz not null default now(),unique(owner_id,custo_id,vence_em)
);
alter table public.fin_ocorrencias enable row level security;
drop policy if exists fin_ocorrencias_dono on public.fin_ocorrencias;
create policy fin_ocorrencias_dono on public.fin_ocorrencias for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid() and exists(select 1 from public.fin_custos c where c.id=custo_id and c.owner_id=auth.uid()));
grant select,insert,update on public.fin_ocorrencias to authenticated;
alter table public.fin_despesas add column if not exists ocorrencia_id uuid references public.fin_ocorrencias(id) on delete restrict;
alter table public.fin_despesas drop constraint if exists fin_despesas_valores_finitos;
alter table public.fin_despesas add constraint fin_despesas_valores_finitos check(valor::text not in ('NaN','Infinity','-Infinity') and (valor_original is null or valor_original::text not in ('NaN','Infinity','-Infinity')));
alter table public.fin_ocorrencias drop constraint if exists fin_ocorrencias_valor_finito;
alter table public.fin_ocorrencias add constraint fin_ocorrencias_valor_finito check(valor::text not in ('NaN','Infinity','-Infinity'));
create table if not exists public.fin_despesas_historico (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id),despesa_id uuid not null references public.fin_despesas(id) on delete restrict,
 antes jsonb not null,depois jsonb not null,motivo text not null,alterado_em timestamptz not null default now()
);
alter table public.fin_despesas_historico enable row level security;
drop policy if exists fin_despesas_historico_dono on public.fin_despesas_historico;
create policy fin_despesas_historico_dono on public.fin_despesas_historico for select to authenticated using(owner_id=auth.uid());
grant select on public.fin_despesas_historico to authenticated;
-- A retificação e os vínculos são conferidos mesmo em acesso direto autenticado.
create or replace function public.fin_validar_despesa() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare o public.fin_ocorrencias;
begin
 if new.moeda_original='USD' and (new.valor_original is null or new.valor_original<=0) then raise exception 'Informe o valor original em dólar'; end if;
 if new.ocorrencia_id is not null then
   select * into o from public.fin_ocorrencias where id=new.ocorrencia_id and owner_id=new.owner_id;
   if not found or new.custo_id is distinct from o.custo_id or new.moeda_original<>o.moeda then raise exception 'Ocorrência não corresponde ao pagamento'; end if;
 end if;
 if TG_OP='UPDATE' and new is distinct from old then
   if length(trim(coalesce(current_setting('app.motivo_retificacao',true),'')))<5 then raise exception 'Informe o motivo da retificação'; end if;
   insert into public.fin_despesas_historico(owner_id,despesa_id,antes,depois,motivo)values(old.owner_id,old.id,to_jsonb(old),to_jsonb(new),current_setting('app.motivo_retificacao',true));
 end if;
 return new;
end $$;
drop trigger if exists fin_conferir_despesa on public.fin_despesas;
create trigger fin_conferir_despesa before insert or update on public.fin_despesas for each row execute function public.fin_validar_despesa();
revoke update,delete on public.fin_despesas from authenticated;
create or replace function public.fin_retificar_despesa(p_id uuid,p_dados jsonb,p_motivo text) returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if auth.uid() is null or length(trim(coalesce(p_motivo,'')))<5 then raise exception 'Sessão e motivo necessários'; end if;
 perform 1 from public.fin_despesas where id=p_id and owner_id=auth.uid() for update;
 if not found then raise exception 'Despesa não encontrada'; end if;
 if (p_dados->>'pago_em')::date is null or (p_dados->>'pago_em')::date>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'Data inválida'; end if;
 perform set_config('app.motivo_retificacao',left(trim(p_motivo),1000),true);
 update public.fin_despesas set nome=trim(p_dados->>'nome'),valor=(p_dados->>'valor')::numeric,pago_em=(p_dados->>'pago_em')::date,categoria=p_dados->>'categoria',valor_original=(p_dados->>'valor_original')::numeric,notas=left(p_dados->>'notas',1000) where id=p_id and owner_id=auth.uid();
end $$;
revoke all on function public.fin_retificar_despesa(uuid,jsonb,text) from public;
grant execute on function public.fin_retificar_despesa(uuid,jsonb,text) to authenticated;

alter table public.crm_entregas add column if not exists bloqueio text check(length(bloqueio)<=500);
alter table public.crm_entregas add column if not exists proxima_acao text check(length(proxima_acao)<=500);
alter table public.crm_entregas add column if not exists prod_loja_id uuid references public.prod_lojas(id) on delete restrict;
alter table public.crm_entregas add column if not exists perf_loja_id uuid references public.perf_lojas(id) on delete restrict;
create or replace function public.crm_validar_entrega() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if new.prod_loja_id is not null and not exists(select 1 from public.prod_lojas where id=new.prod_loja_id and owner_id=new.owner_id and lead_id=new.lead_id) then raise exception 'Prévia não pertence ao negócio'; end if;
 if new.perf_loja_id is not null and not exists(select 1 from public.perf_lojas where id=new.perf_loja_id and owner_id=new.owner_id and lead_id=new.lead_id) then raise exception 'Loja não pertence ao negócio'; end if;
 new.updated_at=now(); return new;
end $$;
drop trigger if exists crm_conferir_entrega on public.crm_entregas;
create trigger crm_conferir_entrega before insert or update on public.crm_entregas for each row execute function public.crm_validar_entrega();

notify pgrst,'reload schema';
commit;
