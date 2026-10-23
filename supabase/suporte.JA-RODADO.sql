-- O SUPORTE DAS LOJAS (23/10/2026). Aplicar após performance.sql.
--
-- O dono da loja procura a resposta na aba Suporte do painel; não achou,
-- escreve para o estúdio. O chamado mora AQUI, no central, e o CRM lê direto.
-- A vitrine só entra pelas funções sup_* com a PERF_CHAVE, como o Performance:
-- nenhuma tabela da loja, nenhuma chave nova. Qualquer problema: return calado.
--
-- Depois de rodar no SQL Editor: renomear para suporte.JA-RODADO.sql e conferir
-- chamando as funções (a cilada do SQL antigo rodado de novo).
begin;

-- ============================================================
-- 1. AS TABELAS
-- ============================================================
-- A FAQ é do estúdio (owner_id) e vale para todas as lojas dele: muda no CRM e
-- aparece em todo painel na hora, sem versão nova do pacote.
create table if not exists public.sup_faq (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pergunta text not null check (length(pergunta) between 3 and 200),
  resposta text not null check (length(resposta) between 3 and 4000),
  tema text check (tema is null or length(tema) <= 40),
  -- '#estoque': a seção do manual do painel que explica com calma.
  ancora_manual text check (ancora_manual is null or ancora_manual ~ '^#[a-z0-9-]{1,40}$'),
  ordem int not null default 100,
  publicada boolean not null default true,
  vezes_aberta int not null default 0,
  criado_em timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.sup_faq enable row level security;
drop policy if exists sup_faq_dono on public.sup_faq;
create policy sup_faq_dono on public.sup_faq for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop trigger if exists sup_faq_relogio on public.sup_faq;
create trigger sup_faq_relogio before update on public.sup_faq
  for each row execute function public.crm_relogio();

create table if not exists public.sup_chamados (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.perf_lojas(id) on delete cascade,
  tipo text not null check (tipo in ('duvida','problema','pedido')),
  -- a tela do painel de onde a pessoa veio: '/painel/estoque'
  tela text check (tela is null or tela ~ '^/painel[a-z0-9/-]{0,80}$'),
  estado text not null default 'aberto' check (estado in ('aberto','respondido','resolvido')),
  -- quem preenche é o estúdio, no CRM: é por ele que se lê "o que a galera pergunta"
  tema text check (tema is null or length(tema) <= 40),
  faq_id uuid references public.sup_faq(id) on delete set null,
  criado_em timestamptz not null default now(),
  -- a última mensagem, de quem for: a fila ordena por ela
  movido_em timestamptz not null default now(),
  respondido_em timestamptz,
  resolvido_em timestamptz,
  -- a resposta do estúdio que a loja ainda não abriu acende o ponto no painel
  lido_pela_loja_em timestamptz
);
create index if not exists sup_chamados_loja on public.sup_chamados(loja_id, movido_em desc);
create index if not exists sup_chamados_estado on public.sup_chamados(estado, movido_em);
alter table public.sup_chamados enable row level security;
drop policy if exists sup_chamados_dono on public.sup_chamados;
create policy sup_chamados_dono on public.sup_chamados for all to authenticated
  using (exists (select 1 from public.perf_lojas l where l.id = loja_id and l.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.perf_lojas l where l.id = loja_id and l.owner_id = (select auth.uid())));

create table if not exists public.sup_mensagens (
  id uuid primary key default gen_random_uuid(),
  chamado_id uuid not null references public.sup_chamados(id) on delete cascade,
  autor text not null check (autor in ('loja','estudio')),
  texto text not null check (length(texto) between 1 and 2000),
  criado_em timestamptz not null default now()
);
create index if not exists sup_mensagens_chamado on public.sup_mensagens(chamado_id, criado_em);
alter table public.sup_mensagens enable row level security;
drop policy if exists sup_mensagens_dono on public.sup_mensagens;
create policy sup_mensagens_dono on public.sup_mensagens for all to authenticated
  using (exists (select 1 from public.sup_chamados c join public.perf_lojas l on l.id = c.loja_id
                  where c.id = chamado_id and l.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.sup_chamados c join public.perf_lojas l on l.id = c.loja_id
                  where c.id = chamado_id and l.owner_id = (select auth.uid())));

-- O que se procurou na aba. "achou = false" é a FAQ que ainda falta escrever.
create table if not exists public.sup_buscas (
  id bigint generated always as identity primary key,
  loja_id uuid not null references public.perf_lojas(id) on delete cascade,
  termo text not null check (length(termo) between 2 and 80),
  achou boolean not null,
  criado_em timestamptz not null default now()
);
create index if not exists sup_buscas_loja on public.sup_buscas(loja_id, criado_em);
create index if not exists sup_buscas_quando on public.sup_buscas(criado_em);
alter table public.sup_buscas enable row level security;
drop policy if exists sup_buscas_dono on public.sup_buscas;
create policy sup_buscas_dono on public.sup_buscas for select to authenticated
  using (exists (select 1 from public.perf_lojas l where l.id = loja_id and l.owner_id = (select auth.uid())));


-- ============================================================
-- 2. AS PORTAS DA VITRINE (anon, com a PERF_CHAVE)
-- ============================================================
-- O texto que chega do painel: espaços aparados, nunca vazio, nunca enorme.
create or replace function public.sup_texto(t text, maximo int)
returns text language sql immutable
as $$ select nullif(left(btrim(regexp_replace(coalesce(t,''), '[\r\n]{3,}', E'\n\n', 'g')), maximo), ''); $$;

-- Abre um chamado com a primeira mensagem. Devolve o id, ou null.
create or replace function public.sup_abrir(chave text, e jsonb)
returns uuid language plpgsql security definer set search_path=public
as $$
declare
  l public.perf_lojas; t text:=e->>'tipo'; tx text; tl text:=nullif(e->>'tela',''); cid uuid;
begin
  l:=public.perf_loja_da_chave(chave); if l.id is null then return null; end if;
  if e is null or jsonb_typeof(e)<>'object' or octet_length(e::text)>6000 then return null; end if;
  if t is null or t not in ('duvida','problema','pedido') then return null; end if;
  tx:=public.sup_texto(e->>'texto',2000); if tx is null then return null; end if;
  if tl is not null and tl!~'^/painel[a-z0-9/-]{0,80}$' then tl:=null; end if;
  perform pg_advisory_xact_lock(hashtext('sup'||l.id::text));
  if (select count(*) from public.sup_chamados where loja_id=l.id and estado<>'resolvido')>=10 then return null; end if;
  if (select count(*) from public.sup_mensagens m join public.sup_chamados c on c.id=m.chamado_id
       where c.loja_id=l.id and m.autor='loja' and m.criado_em>now()-interval '1 hour')>=30 then return null; end if;
  insert into public.sup_chamados(loja_id,tipo,tela) values(l.id,t,tl) returning id into cid;
  insert into public.sup_mensagens(chamado_id,autor,texto) values(cid,'loja',tx);
  return cid;
end;
$$;
revoke all on function public.sup_abrir(text,jsonb) from public;
grant execute on function public.sup_abrir(text,jsonb) to anon,authenticated;

-- A loja escreve de novo num chamado dela. Se estava resolvido, reabre.
create or replace function public.sup_responder(chave text, chamado uuid, texto text)
returns boolean language plpgsql security definer set search_path=public
as $$
declare l public.perf_lojas; tx text:=public.sup_texto(texto,2000);
begin
  l:=public.perf_loja_da_chave(chave); if l.id is null or tx is null or chamado is null then return false; end if;
  perform pg_advisory_xact_lock(hashtext('sup'||l.id::text));
  if not exists(select 1 from public.sup_chamados where id=chamado and loja_id=l.id) then return false; end if;
  if (select count(*) from public.sup_mensagens m join public.sup_chamados c on c.id=m.chamado_id
       where c.loja_id=l.id and m.autor='loja' and m.criado_em>now()-interval '1 hour')>=30 then return false; end if;
  insert into public.sup_mensagens(chamado_id,autor,texto) values(chamado,'loja',tx);
  update public.sup_chamados set estado='aberto', movido_em=now(), resolvido_em=null where id=chamado;
  return true;
end;
$$;
revoke all on function public.sup_responder(text,uuid,text) from public;
grant execute on function public.sup_responder(text,uuid,text) to anon,authenticated;

-- As conversas da loja, as 30 mais recentes, e quantas têm resposta não lida.
create or replace function public.sup_meus(chave text)
returns jsonb language plpgsql stable security definer set search_path=public
as $$
declare l public.perf_lojas;
begin
  l:=public.perf_loja_da_chave(chave); if l.id is null then return null; end if;
  return jsonb_build_object(
    'nao_lidos', (select count(*) from public.sup_chamados
                   where loja_id=l.id and respondido_em is not null
                     and (lido_pela_loja_em is null or lido_pela_loja_em<respondido_em)),
    'chamados', coalesce((select jsonb_agg(x order by x->>'movido_em' desc) from (
      select jsonb_build_object(
        'id',c.id,'tipo',c.tipo,'tela',c.tela,'estado',c.estado,
        'criado_em',c.criado_em,'movido_em',c.movido_em,
        'nao_lido',(c.respondido_em is not null and (c.lido_pela_loja_em is null or c.lido_pela_loja_em<c.respondido_em)),
        'mensagens',coalesce((select jsonb_agg(jsonb_build_object('autor',m.autor,'texto',m.texto,'criado_em',m.criado_em) order by m.criado_em)
                               from public.sup_mensagens m where m.chamado_id=c.id),'[]'::jsonb)) x
      from public.sup_chamados c where c.loja_id=l.id order by c.movido_em desc limit 30) s),'[]'::jsonb));
end;
$$;
revoke all on function public.sup_meus(text) from public;
grant execute on function public.sup_meus(text) to anon,authenticated;

create or replace function public.sup_marcar_lido(chave text, chamado uuid)
returns void language plpgsql security definer set search_path=public
as $$
declare l public.perf_lojas;
begin
  l:=public.perf_loja_da_chave(chave); if l.id is null or chamado is null then return; end if;
  update public.sup_chamados set lido_pela_loja_em=now() where id=chamado and loja_id=l.id;
end;
$$;
revoke all on function public.sup_marcar_lido(text,uuid) from public;
grant execute on function public.sup_marcar_lido(text,uuid) to anon,authenticated;

-- A FAQ publicada do estúdio dono da loja.
create or replace function public.sup_faq(chave text)
returns jsonb language plpgsql stable security definer set search_path=public
as $$
declare l public.perf_lojas;
begin
  l:=public.perf_loja_da_chave(chave); if l.id is null then return null; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',f.id,'pergunta',f.pergunta,'resposta',f.resposta,
                     'tema',f.tema,'ancora',f.ancora_manual) order by f.ordem, f.criado_em)
                     from public.sup_faq f where f.owner_id=l.owner_id and f.publicada),'[]'::jsonb);
end;
$$;
revoke all on function public.sup_faq(text) from public;
grant execute on function public.sup_faq(text) to anon,authenticated;

-- Uma pergunta da FAQ aberta na aba: a que mais abre sobe na lista.
create or replace function public.sup_faq_aberta(chave text, faq uuid)
returns void language plpgsql security definer set search_path=public
as $$
declare l public.perf_lojas;
begin
  l:=public.perf_loja_da_chave(chave); if l.id is null or faq is null then return; end if;
  update public.sup_faq set vezes_aberta=vezes_aberta+1 where id=faq and owner_id=l.owner_id;
end;
$$;
revoke all on function public.sup_faq_aberta(text,uuid) from public;
grant execute on function public.sup_faq_aberta(text,uuid) to anon,authenticated;

create or replace function public.sup_registrar_busca(chave text, termo text, achou boolean)
returns void language plpgsql security definer set search_path=public
as $$
declare l public.perf_lojas; t text:=lower(public.sup_texto(termo,80));
begin
  l:=public.perf_loja_da_chave(chave); if l.id is null or t is null or length(t)<2 or achou is null then return; end if;
  -- a mesma busca repetida em 10 minutos conta uma vez só
  if exists(select 1 from public.sup_buscas where loja_id=l.id and termo=t and criado_em>now()-interval '10 minutes') then return; end if;
  if (select count(*) from public.sup_buscas where loja_id=l.id and criado_em>now()-interval '1 hour')>=60 then return; end if;
  insert into public.sup_buscas(loja_id,termo,achou) values(l.id,t,achou);
  if random()<0.01 then delete from public.sup_buscas where criado_em<now()-interval '400 days'; end if;
end;
$$;
revoke all on function public.sup_registrar_busca(text,text,boolean) from public;
grant execute on function public.sup_registrar_busca(text,text,boolean) to anon,authenticated;


-- ============================================================
-- 3. A SEMENTE DA FAQ (as perguntas de "Quando der problema" do manual)
-- ============================================================
-- Só entra se o estúdio ainda não tem FAQ nenhuma. Roda logado no SQL Editor?
-- Não: lá auth.uid() é nulo. Por isso o dono é o owner_id das lojas que já existem.
insert into public.sup_faq (owner_id, pergunta, resposta, tema, ancora_manual, ordem)
select o.owner_id, v.pergunta, v.resposta, v.tema, v.ancora, v.ordem
  from (select distinct owner_id from public.perf_lojas) o
  cross join (values
    ('Salvei e o site não mudou', 'Atualize a página do site (no celular, puxe a tela para baixo). Se o painel mostrou uma mensagem vermelha ao salvar, ela diz o que faltou.', 'Site', '#problema', 10),
    ('A foto não sobe', 'Tente de novo com a internet boa. Se continuar, tire um print da foto e mande o print: ele é mais leve.', 'Fotos', '#problema', 20),
    ('O painel pediu para entrar de novo', 'É normal depois de um tempo. Entre com o seu e-mail e a sua senha.', 'Acesso', '#problema', 30),
    ('Esqueci a senha ou quero trocar', 'Escreva para o estúdio aqui embaixo, em "Algo deu errado". A troca é feita na hora.', 'Acesso', '#problema', 40),
    ('Paguei e o Performance não abriu', 'O Pix leva alguns segundos. Feche o quadro do pagamento e recarregue a aba Desempenho.', 'Performance', '#pagar', 50),
    ('Como cadastro uma peça nova?', 'Na aba Peças, toque em "Nova peça". Precisa só de foto e nome para aparecer; preço e tamanhos ajudam a vender.', 'Peças', '#chegou', 60),
    ('Vendi uma peça, o que faço?', 'A venda fecha no WhatsApp, como sempre. No painel, baixe o tamanho vendido com um toque: o site mostra "última" ou risca o número sozinho.', 'Estoque', '#vendi', 70),
    ('A peça acabou de vez', 'Não apague nada. Desligue o "No site": a peça sai da vitrine e volta com um toque quando chegar de novo.', 'Peças', '#acabou', 80),
    ('Quero mudar uma foto grande ou uma parte do site', 'Os textos que mudam toda semana você troca na aba Textos. O desenho, as fotos grandes e as partes novas são do estúdio: escreva aqui embaixo, em "Quero uma mudança".', 'Site', '#texto', 90)
  ) as v(pergunta, resposta, tema, ancora, ordem)
 where not exists (select 1 from public.sup_faq f where f.owner_id = o.owner_id);

commit;
