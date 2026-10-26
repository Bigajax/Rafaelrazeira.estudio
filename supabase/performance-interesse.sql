-- Favoritos, sacola e interesse. Aplicar após performance.sql.
-- Migração aditiva: clientes antigos continuam usando perf_registrar_evento.
begin;
create table if not exists public.perf_interesses (
  loja_id uuid not null references public.perf_lojas(id) on delete cascade,
  evento uuid not null,
  criado_em timestamptz not null default now(),
  visitante text not null check (visitante ~ '^[a-z0-9]{8,24}$'),
  acao text not null check (acao in ('exposicao','favorito','favorito_removido','sacola_adicionada','sacola_removida','sacola_quantidade','sacola_aberta','whatsapp','whatsapp_sacola')),
  produto text check (produto is null or produto ~ '^[a-z0-9-]{1,80}$'),
  tamanho text check (tamanho is null or length(tamanho) <= 12),
  cor text check (cor is null or length(cor) <= 60),
  quantidade int check (quantidade is null or quantidade between 0 and 20),
  origem text not null default '/' check (origem ~ '^/[a-z0-9/-]{0,160}$'),
  itens jsonb not null default '[]'::jsonb check (jsonb_typeof(itens) = 'array' and jsonb_array_length(itens) <= 20),
  primary key (loja_id,evento)
);
alter table public.perf_interesses enable row level security;
revoke all on public.perf_interesses from anon,authenticated;
create index if not exists perf_interesses_periodo on public.perf_interesses(loja_id,criado_em);
create index if not exists perf_interesses_visitante on public.perf_interesses(loja_id,visitante,criado_em);
create index if not exists perf_interesses_produto on public.perf_interesses(loja_id,produto,criado_em);
create index if not exists perf_interesses_quando on public.perf_interesses(criado_em);

create or replace function public.perf_interesse_ativo(chave text)
returns boolean language sql stable security definer set search_path=public
as $$ select (public.perf_loja_da_chave(chave)).id is not null; $$;
revoke all on function public.perf_interesse_ativo(text) from public;
grant execute on function public.perf_interesse_ativo(text) to anon,authenticated;

create or replace function public.perf_registrar_interesse(chave text,e jsonb)
returns void language plpgsql security definer set search_path=public
as $$
declare
  l public.perf_lojas; v text:=e->>'visitante'; a text:=e->>'acao';
  p text:=e->>'produto'; t text:=e->>'tamanho'; c text:=e->>'cor'; o text:=coalesce(e->>'origem','/');
  q int; eid uuid; i jsonb; lista jsonb:=coalesce(e->'itens','[]'::jsonb); inseriu int;
begin
  l:=public.perf_loja_da_chave(chave); if l.id is null then return; end if;
  if e is null or jsonb_typeof(e)<>'object' or octet_length(e::text)>12000 then return; end if;
  if v is null or v!~'^[a-z0-9]{8,24}$' then return; end if;
  if a is null or a not in ('exposicao','favorito','favorito_removido','sacola_adicionada','sacola_removida','sacola_quantidade','sacola_aberta','whatsapp','whatsapp_sacola') then return; end if;
  begin eid:=(e->>'evento')::uuid; q:=(e->>'quantidade')::int; exception when others then return; end;
  if eid is null or (q is not null and (q<0 or q>20)) then return; end if;
  if p is not null and p!~'^[a-z0-9-]{1,80}$' then return; end if;
  if a not in ('sacola_aberta','whatsapp_sacola') and p is null then return; end if;
  if length(t)>12 or length(c)>60 or o!~'^/[a-z0-9/-]{0,160}$' then return; end if;
  if jsonb_typeof(lista)<>'array' then return; end if;
  if jsonb_array_length(lista)>20 then return; end if;
  if a='whatsapp_sacola' then
    if jsonb_array_length(lista)=0 then return; end if;
    for i in select value from jsonb_array_elements(lista) loop
      if jsonb_typeof(i)<>'object' or i->>'produto' is null or (i->>'produto')!~'^[a-z0-9-]{1,80}$' or i->>'tamanho' is null or length(i->>'tamanho')>12 or i->>'cor' is null or length(i->>'cor')>60 then return; end if;
      begin q:=(i->>'quantidade')::int; exception when others then return; end;
      if q is null or q<1 or q>20 then return; end if;
    end loop;
    if (select count(*) from jsonb_array_elements(lista))<>(select count(distinct (x->>'produto',x->>'tamanho',x->>'cor')) from jsonb_array_elements(lista) x) then return; end if;
    q:=null; p:=null; t:=null; c:=null;
  else lista:='[]'::jsonb; end if;
  perform pg_advisory_xact_lock(hashtext(l.id::text));
  if exists(select 1 from public.perf_interesses where loja_id=l.id and evento=eid) then return; end if;
  if (select count(*) from public.perf_interesses where loja_id=l.id and visitante=v and criado_em>now()-interval '10 minutes')>=80 then return; end if;
  if (select count(*) from public.perf_interesses where loja_id=l.id and criado_em>now()-interval '1 minute')>=400 then return; end if;
  if (select count(*) from public.perf_interesses where criado_em>now()-interval '1 minute')>=3000 then return; end if;
  insert into public.perf_interesses(loja_id,evento,visitante,acao,produto,tamanho,cor,quantidade,origem,itens)
  values(l.id,eid,v,a,p,t,c,q,o,lista) on conflict do nothing;
  get diagnostics inseriu=row_count;
  -- O medidor global ignora este botão. O atendimento entra uma vez no legado.
  if inseriu=1 and a='whatsapp_sacola' then
    perform public.perf_registrar_evento(chave,jsonb_build_object('visitante',v,'tipo','whatsapp','botao','peca'));
  end if;
  if random()<0.002 then delete from public.perf_interesses where criado_em<now()-interval '400 days'; end if;
end;
$$;
revoke all on function public.perf_registrar_interesse(text,jsonb) from public;
grant execute on function public.perf_registrar_interesse(text,jsonb) to anon,authenticated;

create or replace function public.perf_interesse_painel(chave text,dias int)
returns jsonb language plpgsql stable security definer set search_path=public
as $$
declare l public.perf_lojas; n int:=greatest(1,least(coalesce(dias,30),90)); r jsonb;
begin
  l:=public.perf_loja_da_chave(chave); if l.id is null then return null; end if;
  -- GRÁTIS desde 13/10/2026 (o Rafael: "pode deixar free"): favoritos e sacola
  -- aparecem para toda loja com a contagem ligada, com ou sem o Performance.
  -- O relatório do mês (perf_interesse_relatorio, abaixo) continua do plano.
  with ev as (
    select * from public.perf_interesses where loja_id=l.id and criado_em>=now()-make_interval(days=>n)
  ), conteudo as (
    select visitante,criado_em,acao,produto,tamanho,cor from ev where produto is not null
    union all
    select e.visitante,e.criado_em,e.acao,i->>'produto',i->>'tamanho',i->>'cor'
      from ev e cross join lateral jsonb_array_elements(e.itens) i where e.acao='whatsapp_sacola'
  ), por_peca as (
    select produto,count(distinct visitante) filter(where acao='exposicao') expostos,
      count(distinct visitante) filter(where acao='favorito') favoritos,
      count(distinct visitante) filter(where acao='sacola_adicionada') sacola,
      count(distinct visitante) filter(where acao in ('whatsapp','whatsapp_sacola')) contatos
    from conteudo group by produto
  )
  select jsonb_build_object(
    'liberado',true,'periodo',n,'desde',(select min(criado_em) from public.perf_interesses where loja_id=l.id),
    'totais',jsonb_build_object(
      'favoritos',(select count(distinct visitante) from ev where acao='favorito'),
      'sacola',(select count(distinct visitante) from ev where acao='sacola_adicionada'),
      'contatos',(select count(distinct visitante) from ev where acao in ('whatsapp','whatsapp_sacola')),
      'sem_contato',(select count(distinct s.visitante) from ev s where s.acao='sacola_adicionada' and not exists(select 1 from ev w where w.visitante=s.visitante and w.acao='whatsapp_sacola' and w.criado_em>=s.criado_em))),
    'continuidade',jsonb_build_object('janela',7,
      'elegiveis',(select count(*) from (select visitante,min(criado_em) primeira from ev where acao='sacola_adicionada' group by visitante) s where primeira<=now()-interval '7 days'),
      'com_contato',(select count(*) from (select visitante,min(criado_em) primeira from ev where acao='sacola_adicionada' group by visitante) s where primeira<=now()-interval '7 days' and exists(select 1 from public.perf_interesses w where w.loja_id=l.id and w.visitante=s.visitante and w.acao='whatsapp_sacola' and w.criado_em>=s.primeira and w.criado_em<s.primeira+interval '7 days'))),
    'pecas',coalesce((select jsonb_agg(jsonb_build_object('produto',produto,'expostos',expostos,'favoritos',favoritos,'sacola',sacola,'contatos',contatos) order by favoritos+sacola+contatos desc) from por_peca),'[]'::jsonb),
    'preferencias',coalesce((select jsonb_agg(jsonb_build_object('produto',produto,'tamanho',tamanho,'cor',cor,'pessoas',pessoas) order by pessoas desc) from (
      select produto,coalesce(tamanho,'') tamanho,coalesce(cor,'') cor,count(distinct visitante) pessoas from conteudo where acao='sacola_adicionada' and (coalesce(tamanho,'')<>'' or coalesce(cor,'')<>'') group by 1,2,3 order by 4 desc limit 12
    ) x),'[]'::jsonb)
  ) into r;
  return r;
end;
$$;
revoke all on function public.perf_interesse_painel(text,int) from public;
grant execute on function public.perf_interesse_painel(text,int) to anon,authenticated;
-- O token limita a leitura ao mês e à loja do relatório existente.
create or replace function public.perf_interesse_relatorio(chave_link text)
returns jsonb language plpgsql stable security definer set search_path=public
as $$
declare l public.perf_lojas; rel public.perf_relatorios; ini timestamptz; fim timestamptz; n int; r jsonb;
begin
  if chave_link is null or chave_link !~ '^[a-f0-9]{32}$' then return null; end if;
  select * into rel from public.perf_relatorios where token=chave_link;
  if rel.id is null then return null; end if;
  select * into l from public.perf_lojas where id=rel.loja_id;
  if l.id is null then return null; end if;
  ini:=(rel.mes::timestamp) at time zone l.fuso;
  fim:=least(((rel.mes+interval '1 month')::timestamp) at time zone l.fuso,now());
  n:=extract(day from rel.mes+interval '1 month'-interval '1 day');
  with ev as (
    select * from public.perf_interesses where loja_id=l.id and criado_em>=ini and criado_em<fim
  ), conteudo as (
    select visitante,criado_em,acao,produto,tamanho,cor from ev where produto is not null
    union all
    select e.visitante,e.criado_em,e.acao,i->>'produto',i->>'tamanho',i->>'cor'
      from ev e cross join lateral jsonb_array_elements(e.itens) i where e.acao='whatsapp_sacola'
  ), por_peca as (
    select produto,count(distinct visitante) filter(where acao='exposicao') expostos,
      count(distinct visitante) filter(where acao='favorito') favoritos,
      count(distinct visitante) filter(where acao='sacola_adicionada') sacola,
      count(distinct visitante) filter(where acao in ('whatsapp','whatsapp_sacola')) contatos
    from conteudo group by produto
  )
  select jsonb_build_object(
    'liberado',true,'periodo',n,'desde',(select min(criado_em) from public.perf_interesses where loja_id=l.id),
    'totais',jsonb_build_object(
      'favoritos',(select count(distinct visitante) from ev where acao='favorito'),
      'sacola',(select count(distinct visitante) from ev where acao='sacola_adicionada'),
      'contatos',(select count(distinct visitante) from ev where acao in ('whatsapp','whatsapp_sacola')),
      'sem_contato',(select count(distinct s.visitante) from ev s where s.acao='sacola_adicionada' and not exists(select 1 from ev w where w.visitante=s.visitante and w.acao='whatsapp_sacola' and w.criado_em>=s.criado_em))),
    'continuidade',jsonb_build_object('janela',7,
      'elegiveis',(select count(*) from (select visitante,min(criado_em) primeira from ev where acao='sacola_adicionada' group by visitante) s where primeira<=now()-interval '7 days'),
      'com_contato',(select count(*) from (select visitante,min(criado_em) primeira from ev where acao='sacola_adicionada' group by visitante) s where primeira<=now()-interval '7 days' and exists(select 1 from public.perf_interesses w where w.loja_id=l.id and w.visitante=s.visitante and w.acao='whatsapp_sacola' and w.criado_em>=s.primeira and w.criado_em<s.primeira+interval '7 days'))),
    'pecas',coalesce((select jsonb_agg(jsonb_build_object('produto',produto,'expostos',expostos,'favoritos',favoritos,'sacola',sacola,'contatos',contatos) order by favoritos+sacola+contatos desc) from por_peca),'[]'::jsonb),
    'preferencias',coalesce((select jsonb_agg(jsonb_build_object('produto',produto,'tamanho',tamanho,'cor',cor,'pessoas',pessoas) order by pessoas desc) from (
      select produto,coalesce(tamanho,'') tamanho,coalesce(cor,'') cor,count(distinct visitante) pessoas from conteudo where acao='sacola_adicionada' and (coalesce(tamanho,'')<>'' or coalesce(cor,'')<>'') group by 1,2,3 order by 4 desc limit 12
    ) x),'[]'::jsonb)
  ) into r;
  return r;
end;
$$;
revoke all on function public.perf_interesse_relatorio(text) from public;
grant execute on function public.perf_interesse_relatorio(text) to anon,authenticated;
commit;
