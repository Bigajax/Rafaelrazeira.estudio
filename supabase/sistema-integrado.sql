-- Evolução aditiva do CRM. Aplicar após crm.sql, financeiro.sql, projetos.sql e plano.sql.
-- Sem envio de mensagens, sem exclusão de registros. Transação única.
begin;

create table if not exists public.fin_despesas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  custo_id uuid references public.fin_custos(id) on delete set null,
  nome text not null check(length(nome) between 1 and 120),
  categoria text not null check(categoria in ('trafego','ferramenta','pessoal','imposto','outro')),
  valor numeric(14,2) not null check(valor > 0),
  pago_em date not null,
  moeda_original text not null default 'BRL' check(moeda_original in ('BRL','USD')),
  valor_original numeric(14,2) check(valor_original is null or valor_original > 0),
  notas text check(length(notas) <= 1000),
  request_id uuid not null unique,
  created_at timestamptz not null default now()
);
alter table public.fin_despesas enable row level security;
drop policy if exists fin_despesas_dono on public.fin_despesas;
create policy fin_despesas_dono on public.fin_despesas for all to authenticated
  using(owner_id=auth.uid()) with check(owner_id=auth.uid() and (custo_id is null or exists(select 1 from public.fin_custos c where c.id=custo_id and c.owner_id=auth.uid())));
create index if not exists fin_despesas_mes on public.fin_despesas(owner_id,pago_em);

alter table public.crm_recebimentos add column if not exists valor_estornado numeric(14,2) not null default 0 check(valor_estornado >= 0 and valor_estornado <= valor);
create table if not exists public.crm_devolucoes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  recebimento_id uuid not null references public.crm_recebimentos(id) on delete restrict,
  valor numeric(14,2) not null check(valor > 0),
  devolvido_em date not null,
  notas text check(length(notas) <= 1000),
  request_id uuid not null unique,
  created_at timestamptz not null default now()
);
alter table public.crm_devolucoes enable row level security;
drop policy if exists crm_devolucoes_ler on public.crm_devolucoes;
create policy crm_devolucoes_ler on public.crm_devolucoes for select to authenticated using(owner_id=auth.uid());
create index if not exists crm_devolucoes_mes on public.crm_devolucoes(owner_id,devolvido_em);

-- Estornos legados têm data conhecida, sem inventar novas devoluções.
insert into public.crm_devolucoes(owner_id,recebimento_id,valor,devolvido_em,notas,request_id)
select r.owner_id,r.id,r.valor,r.estornado_em::date,'Estorno integral anterior à integração',r.id
from public.crm_recebimentos r where r.estornado_em is not null
and not exists(select 1 from public.crm_devolucoes d where d.recebimento_id=r.id)
on conflict(request_id) do nothing;
update public.crm_recebimentos set valor_estornado=valor where estornado_em is not null and valor_estornado=0;

create or replace function public.crm_registrar_devolucao(p_recebimento uuid,p_valor numeric,p_dia date,p_request uuid,p_notas text default null)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.crm_recebimentos; existente uuid; novo uuid; devolvido numeric;
begin
  if auth.uid() is null then raise exception 'Sessão necessária'; end if;
  select * into r from public.crm_recebimentos where id=p_recebimento and owner_id=auth.uid() for update;
  if not found then raise exception 'Recebimento não encontrado'; end if;
  select id into existente from public.crm_devolucoes where request_id=p_request and owner_id=auth.uid() and recebimento_id=p_recebimento;
  if existente is not null then return existente; end if;
  select coalesce(sum(valor),0) into devolvido from public.crm_devolucoes where recebimento_id=r.id;
  if p_valor is null or p_valor<=0 or round(p_valor,2)+devolvido>r.valor or p_dia is null or p_dia<r.recebido_em::date or p_dia>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'Valor ou data de devolução inválidos'; end if;
  insert into public.crm_devolucoes(owner_id,recebimento_id,valor,devolvido_em,request_id,notas)
  values(auth.uid(),r.id,round(p_valor,2),p_dia,p_request,left(p_notas,1000)) returning id into novo;
  update public.crm_recebimentos set valor_estornado=devolvido+round(p_valor,2),estornado_em=case when devolvido+round(p_valor,2)>=r.valor then p_dia else null end where id=r.id;
  return novo;
end $$;
revoke all on function public.crm_registrar_devolucao(uuid,numeric,date,uuid,text) from public;
grant execute on function public.crm_registrar_devolucao(uuid,numeric,date,uuid,text) to authenticated;

create table if not exists public.crm_eventos_etapa (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  lead_id uuid not null references public.crm_leads(id) on delete cascade,
  anterior text, etapa text not null,
  motivo text,
  ocorrido_em timestamptz not null default now(),
  inicial boolean not null default false,
  origem text not null default 'crm'
);
alter table public.crm_eventos_etapa enable row level security;
drop policy if exists crm_eventos_etapa_ler on public.crm_eventos_etapa;
create policy crm_eventos_etapa_ler on public.crm_eventos_etapa for select to authenticated using(owner_id=auth.uid());
create index if not exists crm_eventos_etapa_periodo on public.crm_eventos_etapa(owner_id,ocorrido_em);
create index if not exists crm_eventos_etapa_lead on public.crm_eventos_etapa(lead_id,ocorrido_em);
create unique index if not exists crm_eventos_inicial on public.crm_eventos_etapa(lead_id) where inicial;
insert into public.crm_eventos_etapa(owner_id,lead_id,etapa,inicial,origem)
select l.owner_id,l.id,l.estagio,true,'base_anterior' from public.crm_leads l where not exists(select 1 from public.crm_eventos_etapa e where e.lead_id=l.id) on conflict(lead_id) where inicial do nothing;
create or replace function public.crm_guardar_etapa() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if TG_OP='INSERT' then
    insert into public.crm_eventos_etapa(owner_id,lead_id,etapa,ocorrido_em,origem) values(new.owner_id,new.id,new.estagio,new.created_at,case when auth.uid() is null then 'integracao' else 'crm' end);
  elsif new.estagio is distinct from old.estagio then
    insert into public.crm_eventos_etapa(owner_id,lead_id,anterior,etapa,motivo,origem) values(new.owner_id,new.id,old.estagio,new.estagio,new.motivo_perda,case when auth.uid() is null then 'integracao' else 'crm' end);
  end if;
  return new;
end $$;
drop trigger if exists crm_historico_etapa on public.crm_leads;
create trigger crm_historico_etapa after insert or update of estagio on public.crm_leads for each row execute function public.crm_guardar_etapa();

create table if not exists public.crm_clientes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  nome text not null check(length(nome) between 1 and 120),
  whatsapp text, email text, notas text,
  created_at timestamptz not null default now()
);
create table if not exists public.crm_cliente_negocios (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  cliente_id uuid not null references public.crm_clientes(id) on delete restrict,
  lead_id uuid not null unique references public.crm_leads(id) on delete restrict
);
alter table public.crm_clientes enable row level security;
alter table public.crm_cliente_negocios enable row level security;
drop policy if exists crm_clientes_dono on public.crm_clientes;
create policy crm_clientes_dono on public.crm_clientes for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
drop policy if exists crm_cliente_negocios_dono on public.crm_cliente_negocios;
create policy crm_cliente_negocios_dono on public.crm_cliente_negocios for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid() and exists(select 1 from public.crm_clientes c where c.id=cliente_id and c.owner_id=auth.uid()) and exists(select 1 from public.crm_leads l where l.id=lead_id and l.owner_id=auth.uid()));
create index if not exists crm_cliente_negocios_cliente on public.crm_cliente_negocios(owner_id,cliente_id);

create table if not exists public.crm_origem_conteudo (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  lead_id uuid not null unique references public.crm_leads(id) on delete cascade,
  peca_id uuid references public.mkt_pecas(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.crm_origem_conteudo enable row level security;
drop policy if exists crm_origem_conteudo_dono on public.crm_origem_conteudo;
create policy crm_origem_conteudo_dono on public.crm_origem_conteudo for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid() and exists(select 1 from public.crm_leads l where l.id=lead_id and l.owner_id=auth.uid()) and (peca_id is null or exists(select 1 from public.mkt_pecas p where p.id=peca_id and p.owner_id=auth.uid())));

create or replace function public.crm_criar_cliente(p_lead uuid) returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare l public.crm_leads; c uuid;
begin
  if auth.uid() is null then raise exception 'Sessão necessária'; end if;
  select * into l from public.crm_leads where id=p_lead and owner_id=auth.uid() for update;
  if not found then raise exception 'Negócio não encontrado'; end if;
  select cliente_id into c from public.crm_cliente_negocios where lead_id=p_lead and owner_id=auth.uid();
  if c is not null then return c; end if;
  insert into public.crm_clientes(owner_id,nome,whatsapp,email) values(auth.uid(),coalesce(nullif(l.empresa,''),nullif(l.nome,''),'Cliente'),l.whatsapp,l.email) returning id into c;
  insert into public.crm_cliente_negocios(owner_id,cliente_id,lead_id) values(auth.uid(),c,p_lead);
  return c;
end $$;
revoke all on function public.crm_criar_cliente(uuid) from public;
grant execute on function public.crm_criar_cliente(uuid) to authenticated;

create table if not exists public.crm_entregas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  lead_id uuid not null references public.crm_leads(id) on delete restrict,
  contrato_id uuid not null unique references public.crm_contratos(id) on delete restrict,
  checklist jsonb not null default '[]',
  site text, dominio text, repo text, material text check(material is null or material ~ '^[a-z0-9-]{1,60}$'),notas text,
  prazo date,entregue_em date,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.crm_entregas enable row level security;
drop policy if exists crm_entregas_dono on public.crm_entregas;
create policy crm_entregas_dono on public.crm_entregas for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid() and exists(select 1 from public.crm_contratos c where c.id=contrato_id and c.owner_id=auth.uid() and c.lead_id=crm_entregas.lead_id and c.tipo='projeto'));
create index if not exists crm_entregas_lead on public.crm_entregas(owner_id,lead_id);
-- Copiar legado somente quando houver um único contrato de projeto elegível.
insert into public.crm_entregas(owner_id,lead_id,contrato_id,checklist,site,dominio,repo,material,notas,entregue_em)
select p.owner_id,p.lead_id,c.id,p.checklist,p.site,p.dominio,p.repo,p.material,p.notas,p.entregue_em
from public.crm_projetos p join public.crm_contratos c on c.lead_id=p.lead_id and c.owner_id=p.owner_id and c.tipo='projeto' and c.status='ativo'
where (select count(*) from public.crm_contratos x where x.lead_id=p.lead_id and x.owner_id=p.owner_id and x.tipo='projeto' and x.status='ativo')=1
on conflict(contrato_id) do nothing;

alter table public.crm_contratos add column if not exists request_id uuid;
create unique index if not exists crm_contratos_request on public.crm_contratos(owner_id,request_id) where request_id is not null;
create or replace function public.crm_fechar_contrato(p_lead uuid,p_dados jsonb,p_request uuid) returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare c uuid; tipo text; parcela jsonb; lead public.crm_leads; mensal numeric; total numeric;
begin
  if auth.uid() is null then raise exception 'Sessão necessária'; end if;
  select * into lead from public.crm_leads where id=p_lead and owner_id=auth.uid() for update;
  if not found then raise exception 'Negócio não encontrado'; end if;
  select id into c from public.crm_contratos where request_id=p_request and owner_id=auth.uid();
  if c is not null then return c; end if;
  tipo=coalesce(p_dados->>'tipo','projeto');
  mensal=(p_dados->>'valor_ciclo')::numeric;total=(p_dados->>'valor_total')::numeric;
  if tipo not in ('projeto','recorrencia') or length(trim(coalesce(p_dados->>'titulo','')))=0 or jsonb_typeof(p_dados->'parcelas') is distinct from 'array' or jsonb_array_length(p_dados->'parcelas')=0 then raise exception 'Contrato inválido'; end if;
  if (tipo='projeto' and (total is null or total<=0)) or (tipo='recorrencia' and (mensal is null or mensal<=0)) then raise exception 'Valor inválido'; end if;
  if p_dados->>'perf_loja_id' is not null and not exists(select 1 from public.perf_lojas where id=(p_dados->>'perf_loja_id')::uuid and owner_id=auth.uid() and lead_id=p_lead) then raise exception 'Loja não pertence ao negócio'; end if;
  insert into public.crm_contratos(owner_id,lead_id,titulo,tipo,valor_total,valor_ciclo,ciclo,dia_vencimento,assinado_em,proposta_slug,notas,request_id)
  values(auth.uid(),p_lead,trim(p_dados->>'titulo'),tipo,case when tipo='projeto' then round(total,2) end,case when tipo='recorrencia' then round(mensal,2) end,case when tipo='recorrencia' then 'mensal' end,case when tipo='recorrencia' then least(28,greatest(1,coalesce((p_dados->>'dia_vencimento')::int,1))) end,coalesce((p_dados->>'assinado_em')::date,(now() at time zone 'America/Sao_Paulo')::date),nullif(p_dados->>'proposta_slug',''),p_dados->>'notas',p_request) returning id into c;
  for parcela in select value from jsonb_array_elements(p_dados->'parcelas') loop
    if (parcela->>'valor')::numeric is null or (parcela->>'valor')::numeric<=0 or (parcela->>'numero')::int is null or (parcela->>'numero')::int<1 or (parcela->>'vence_em')::date is null then raise exception 'Parcela inválida'; end if;
    insert into public.crm_parcelas(owner_id,lead_id,contrato_id,numero,de,rotulo,valor,vence_em,item_slug,metodo_previsto)
    values(auth.uid(),p_lead,c,(parcela->>'numero')::int,(parcela->>'de')::int,coalesce(nullif(trim(parcela->>'rotulo'),''),'Parcela'),round((parcela->>'valor')::numeric,2),(parcela->>'vence_em')::date,nullif(parcela->>'item_slug',''),coalesce(parcela->>'metodo_previsto','pix'));
  end loop;
  if tipo='recorrencia' and p_dados->>'perf_loja_id' is not null then update public.perf_lojas set contrato_id=c where id=(p_dados->>'perf_loja_id')::uuid and owner_id=auth.uid(); end if;
  if tipo='projeto' and lead.estagio='ganho' then
    update public.crm_leads set valor_fechado=(select sum(valor_total) from public.crm_contratos where lead_id=p_lead and owner_id=auth.uid() and tipo='projeto' and status='ativo'),fechado_em=(select min(assinado_em) from public.crm_contratos where lead_id=p_lead and owner_id=auth.uid() and tipo='projeto' and status='ativo') where id=p_lead;
  end if;
  return c;
end $$;
revoke all on function public.crm_fechar_contrato(uuid,jsonb,uuid) from public;
grant execute on function public.crm_fechar_contrato(uuid,jsonb,uuid) to authenticated;

create or replace function public.crm_fechar_venda(p_lead uuid,p_dados jsonb,p_pagas jsonb,p_request uuid) returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare c uuid; l public.crm_leads; paga jsonb; parcela public.crm_parcelas;
begin
  if auth.uid() is null or p_request is null then raise exception 'Sessão e identificador necessários'; end if;
  select * into l from public.crm_leads where id=p_lead and owner_id=auth.uid() for update;
  if not found then raise exception 'Negócio não encontrado'; end if;
  select id into c from public.crm_contratos where request_id=p_request and owner_id=auth.uid() and lead_id=p_lead;
  if c is not null then return c; end if;
  if coalesce(p_dados->>'tipo','projeto')='projeto' and exists(select 1 from public.crm_contratos where lead_id=p_lead and owner_id=auth.uid() and tipo='projeto' and status='ativo') then raise exception 'O negócio já possui contrato de projeto. Abra o contrato existente.'; end if;
  c=public.crm_fechar_contrato(p_lead,p_dados,p_request);
  update public.crm_leads set estagio='ganho',valor_fechado=case when coalesce(p_dados->>'tipo','projeto')='projeto' then (p_dados->>'valor_total')::numeric else l.valor_fechado end,fechado_em=coalesce((p_dados->>'assinado_em')::date,(now() at time zone 'America/Sao_Paulo')::date),proxima_acao_em=null,proximo_passo=null,motivo_perda=null where id=p_lead;
  if jsonb_typeof(p_pagas) is distinct from 'array' then raise exception 'Baixas inválidas'; end if;
  if (select count(*) from jsonb_array_elements(p_pagas))<>(select count(distinct value->>'numero') from jsonb_array_elements(p_pagas)) then raise exception 'Parcela repetida'; end if;
  for paga in select value from jsonb_array_elements(p_pagas) loop
    select * into parcela from public.crm_parcelas where contrato_id=c and numero=(paga->>'numero')::int;
    if not found or (paga->>'recebido_em')::date is null or (paga->>'recebido_em')::date>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'Parcela ou data inválida'; end if;
    insert into public.crm_recebimentos(owner_id,lead_id,parcela_id,valor,recebido_em,metodo,origem)
    values(auth.uid(),p_lead,parcela.id,parcela.valor,(paga->>'recebido_em')::date,coalesce(paga->>'metodo','pix'),'manual');
  end loop;
  return c;
end $$;
revoke all on function public.crm_fechar_venda(uuid,jsonb,jsonb,uuid) from public;
grant execute on function public.crm_fechar_venda(uuid,jsonb,jsonb,uuid) to authenticated;

-- Metas novas só podem ser criadas após instalação desta migração.
alter table public.plano_metas drop constraint if exists plano_metas_fonte_check;
alter table public.plano_metas add constraint plano_metas_fonte_check check(fonte in ('manual','recebido','fechados','toques','posts','despesas','entregas','saldo'));
alter table public.plano_metas add column if not exists direcao text not null default 'aumentar' check(direcao in ('aumentar','reduzir'));

grant select,insert,update,delete on public.fin_despesas,public.crm_clientes,public.crm_cliente_negocios,public.crm_entregas to authenticated;
grant select,insert,update,delete on public.crm_origem_conteudo to authenticated;
grant select on public.crm_devolucoes,public.crm_eventos_etapa to authenticated;

notify pgrst, 'reload schema';
commit;
