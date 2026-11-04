-- O FUNIL DO CHECKOUT NO PERFORMANCE (04/11/2026, "medir o funil desde já").
-- Aplicar DEPOIS de performance-interesse.sql, no banco do estúdio (o central).
-- Aditivo e reexecutável: as lojas sem checkout seguem mandando só o de antes.
--
-- Cinco passos novos, mandados pela vitrine com a venda no site ligada:
--   checkout_iniciado  abriu o finalizar com peças na sacola
--   checkout_dados     nome, e-mail, WhatsApp e CPF válidos (o preenchimento)
--   checkout_entrega   a entrega escolhida e o endereço completo
--   checkout_pagar     o pedido reservado: foi para o pagamento
--   checkout_pago      o banco da loja confirmou o pagamento (mandado pelo SERVIDOR da loja,
--                      nunca pelo navegador: o Pix pago com a página fechada também conta)
-- E um passo antes da sacola:
--   peca_aberta        a página da peça aberta (a base da taxa de adição à sacola;
--                      a exposicao conta o cartão visto na lista)
-- Com eles, e com o sacola_adicionada que já existe, o Performance calcula:
-- adição ao carrinho, checkout iniciado, preenchimento, abandono e conversão.
-- Limite conhecido: o navegador do dono e quem não é medido (sem Performance) não
-- levam o código de visitante ao pedido, e o pago dessas pessoas não conta aqui.
begin;

alter table public.perf_interesses drop constraint if exists perf_interesses_acao_check;
alter table public.perf_interesses add constraint perf_interesses_acao_check check (acao in (
  'exposicao','peca_aberta','favorito','favorito_removido','sacola_adicionada','sacola_removida','sacola_quantidade','sacola_aberta','whatsapp','whatsapp_sacola',
  'checkout_iniciado','checkout_dados','checkout_entrega','checkout_pagar','checkout_pago'));

create or replace function public.perf_registrar_interesse(chave text,e jsonb)
returns void language plpgsql security definer set search_path=public
as $$
declare
  l public.perf_lojas; v text:=e->>'visitante'; a text:=e->>'acao';
  p text:=e->>'produto'; t text:=e->>'tamanho'; c text:=e->>'cor'; o text:=coalesce(e->>'origem','/');
  q int; eid uuid; i jsonb; lista jsonb:=coalesce(e->'itens','[]'::jsonb); inseriu int;
  sem_peca text[]:=array['sacola_aberta','whatsapp_sacola','checkout_iniciado','checkout_dados','checkout_entrega','checkout_pagar','checkout_pago'];
begin
  l:=public.perf_loja_da_chave(chave); if l.id is null then return; end if;
  if e is null or jsonb_typeof(e)<>'object' or octet_length(e::text)>12000 then return; end if;
  if v is null or v!~'^[a-z0-9]{8,24}$' then return; end if;
  if a is null or a not in ('exposicao','peca_aberta','favorito','favorito_removido','sacola_adicionada','sacola_removida','sacola_quantidade','sacola_aberta','whatsapp','whatsapp_sacola',
    'checkout_iniciado','checkout_dados','checkout_entrega','checkout_pagar','checkout_pago') then return; end if;
  begin eid:=(e->>'evento')::uuid; q:=(e->>'quantidade')::int; exception when others then return; end;
  if eid is null or (q is not null and (q<0 or q>20)) then return; end if;
  if p is not null and p!~'^[a-z0-9-]{1,80}$' then return; end if;
  if not (a=any(sem_peca)) and p is null then return; end if;
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
  -- os passos do checkout não levam peça: o que conta é a pessoa ter chegado
  if a like 'checkout\_%' then p:=null; t:=null; c:=null; q:=null; end if;
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

-- o funil de uma loja, em pessoas (visitantes distintos), para o CRM ler com a
-- chave de serviço. As taxas são calculadas na tela, sobre estes números
create or replace function public.perf_funil_checkout(p_loja uuid,dias int default 30)
returns jsonb language sql stable security definer set search_path=public
as $$
  with ev as (
    select visitante,acao from public.perf_interesses
    where loja_id=p_loja and criado_em>now()-make_interval(days=>least(greatest(coalesce(dias,30),1),400))
  )
  select jsonb_build_object(
    'dias',least(greatest(coalesce(dias,30),1),400),
    'visitantes',(select count(distinct visitante) from ev),
    'viram_peca',(select count(distinct visitante) from ev where acao='exposicao'),
    'abriram_peca',(select count(distinct visitante) from ev where acao='peca_aberta'),
    'sacola',(select count(distinct visitante) from ev where acao='sacola_adicionada'),
    'iniciado',(select count(distinct visitante) from ev where acao='checkout_iniciado'),
    'dados',(select count(distinct visitante) from ev where acao='checkout_dados'),
    'entrega',(select count(distinct visitante) from ev where acao='checkout_entrega'),
    'pagar',(select count(distinct visitante) from ev where acao='checkout_pagar'),
    'pago',(select count(distinct visitante) from ev where acao='checkout_pago'));
$$;
revoke all on function public.perf_funil_checkout(uuid,int) from public,anon,authenticated;

commit;
