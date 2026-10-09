-- ============================================================
-- PERFORMANCE: a contagem das vitrines, num banco só (06/10/2026)
-- Cole este arquivo inteiro em: Supabase → SQL Editor → Run.
-- Reexecutável: rodar duas vezes não quebra nem duplica nada.
-- Depende de crm.sql (crm_leads, crm_contratos, crm_parcelas,
-- crm_recebimentos, crm_relogio) e de producao.sql (prod_lojas).
-- ============================================================
--
-- O QUE É
--
-- Toda vitrine do estúdio passa a contar o que acontece nela: quem entra,
-- que peça abre, quem chama no WhatsApp, o que busca e não acha, o número
-- que acabou. A aba Desempenho do painel do lojista mostra uma parte de
-- graça (pessoas, chamadas, peças que mais chamam, de onde vêm) e o resto
-- só com o Performance, o plano mensal.
--
-- A primeira versão disso nasceu na vitrine da Japa Modas em 02/10
-- (supabase/migrations/0007_visitas.sql, lá), no banco DELA. Aqui ela vira
-- central: um banco só, o do estúdio, com loja_id em tudo. Decisão do
-- Rafael em 06/10, por custo: cada projeto Supabase no Pro custa uns US$ 10
-- por mês para sempre, e a contagem não precisa de projeto novo.
--
-- ------------------------------------------------------------
-- COMO A VITRINE SE IDENTIFICA
--
-- O RLS deste banco é por auth.uid(), e a vitrine não tem usuário aqui. O
-- que ela tem é UMA CHAVE POR LOJA (perf_...), que nasce no CRM e vai para
-- a Vercel dela como PERF_CHAVE, só no servidor. Toda função que a vitrine
-- chama recebe a chave como primeiro argumento, confere o sha256 contra
-- perf_lojas.chave_hash e, se não bater, não faz nada e não explica nada.
-- O texto da chave não fica guardado em lugar nenhum: o CRM mostra uma vez
-- e, perdida, gera outra (perf_criar_chave rotaciona).
--
-- perf_eventos e perf_links NÃO TÊM POLICY: ninguém lê nem grava nelas
-- direto, nem logado. Só pelas funções security definer deste arquivo.
--
-- ------------------------------------------------------------
-- A TRAVA
--
-- perf_lojas.liberado_ate diz até quando a parte paga está aberta;
-- para_sempre vale para quem comprou de uma vez (a Japa, R$ 499). Quem
-- estende a data é o RECEBIMENTO: o trigger perf_ao_receber vê a
-- mensalidade quitada no Caixa e soma um mês. Baixa manual, amarração e
-- webhook do Mercado Pago passam todos por crm_recebimentos, então é um
-- lugar só. E a trava é conferida DENTRO de perf_painel: travada, os
-- blocos pagos nem saem do banco (embaçar na tela não esconde nada de quem
-- abre o código da página; lição da Japa).
--
-- ------------------------------------------------------------
-- O QUE NUNCA SE GUARDA
--
-- Quem é a pessoa. O visitante é um código aleatório do navegador dela,
-- sem nome, telefone nem IP. A contagem responde "quantos e o quê", nunca
-- "quem".
-- ============================================================


-- ============================================================
-- 1. AS LOJAS
-- ============================================================
create table if not exists public.perf_lojas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,

  -- Os elos, todos opcionais: a loja pode nascer na prévia, antes de ter
  -- lead fechado, e um lead apagado não pode levar a contagem junto.
  lead_id uuid references public.crm_leads(id) on delete set null,
  prod_loja_id uuid references public.prod_lojas(id) on delete set null,
  -- O contrato mensal do Performance. É por ele que o trigger acha a loja
  -- quando uma mensalidade é quitada.
  contrato_id uuid references public.crm_contratos(id) on delete set null,

  nome text not null check (length(nome) between 1 and 80),
  -- 'japa-modas': o mesmo nome da pasta em ~/Desktop/vitrines.
  slug text not null check (slug ~ '^[a-z0-9-]{1,40}$'),
  dominio text,

  -- sha256 em hex do texto da chave. Nula = a loja ainda não tem chave.
  chave_hash text,
  -- 'perf_3f9a': o começo da chave, para o CRM dizer qual está na Vercel.
  chave_prefixo text,

  liberado_ate timestamptz,
  para_sempre boolean not null default false,
  -- false: a vitrine continua mandando, o banco ignora. É o "desligar".
  ativa boolean not null default true,
  fuso text not null default 'America/Sao_Paulo',

  criado_em timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists perf_lojas_slug_idx on public.perf_lojas (owner_id, slug);
create unique index if not exists perf_lojas_chave_idx on public.perf_lojas (chave_hash) where chave_hash is not null;

alter table public.perf_lojas enable row level security;
drop policy if exists perf_lojas_dono on public.perf_lojas;
create policy perf_lojas_dono on public.perf_lojas
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop trigger if exists perf_lojas_relogio on public.perf_lojas;
create trigger perf_lojas_relogio
  before update on public.perf_lojas
  for each row execute function public.crm_relogio();


-- ============================================================
-- 2. OS EVENTOS
-- ============================================================
-- Sem owner_id de propósito: a loja já é o dono, e a coluna se repetiria
-- milhares de vezes por mês. A peça é o SLUG, não o id: este banco não tem
-- o catálogo da loja, e o slug já é o que a vitrine usa na URL e no texto
-- do WhatsApp. Peça renomeada aparece no painel como "Peça apagada".
create table if not exists public.perf_eventos (
  id bigint generated always as identity primary key,
  loja_id uuid not null references public.perf_lojas(id) on delete cascade,
  criado_em timestamptz not null default now(),
  visitante text not null check (visitante ~ '^[a-z0-9]{8,24}$'),
  tipo text not null check (tipo in ('visita','peca','whatsapp','busca','esgotado')),
  peca text check (peca is null or peca ~ '^[a-z0-9-]{1,80}$'),
  tamanho text check (tamanho is null or length(tamanho) <= 12),
  busca text check (busca is null or length(busca) <= 60),
  resultados int,
  origem text check (origem is null or origem in ('instagram','google','facebook','whatsapp','direto','outro')),
  -- o post de onde a pessoa veio: ?de=flack (link curto) ou utm_campaign
  post text check (post is null or post ~ '^[a-z0-9-]{1,40}$'),
  botao text check (botao is null or botao in ('peca','geral','loja','procura')),
  -- de que cidade a pessoa entrou (07/10): o cabeçalho x-vercel-ip-city, só na
  -- visita. Cidade, nunca mais fino que isso: não aponta para uma pessoa.
  cidade text check (cidade is null or length(cidade) <= 60)
);
-- a coluna da cidade, para quem já tinha a tabela (07/10)
alter table public.perf_eventos add column if not exists cidade text check (cidade is null or length(cidade) <= 60);
create index if not exists perf_eventos_loja_quando on public.perf_eventos (loja_id, criado_em);
create index if not exists perf_eventos_loja_quem on public.perf_eventos (loja_id, visitante, criado_em);
-- (09/10/2026) o teto do estúdio inteiro em perf_registrar_evento ("3000 por
-- minuto") conta sem loja: sem este índice, cada evento de cada vitrine
-- varria a tabela de todas
create index if not exists perf_eventos_quando on public.perf_eventos (criado_em);

alter table public.perf_eventos enable row level security;
-- sem policy nenhuma: só as funções abaixo tocam nesta tabela


-- ============================================================
-- 3. OS LINKS DE POST
-- ============================================================
-- lojadela.com.br/bio leva para a vitrine com ?de=bio, e quem entra por
-- ele conta para aquele post. Criar e apagar é parte paga; conferir se o
-- link existe funciona sempre (o link já foi dado ao Instagram).
create table if not exists public.perf_links (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.perf_lojas(id) on delete cascade,
  nome text not null check (length(nome) between 1 and 60),
  slug text not null check (slug ~ '^[a-z0-9-]{1,40}$'),
  criado_em timestamptz not null default now(),
  unique (loja_id, slug)
);

alter table public.perf_links enable row level security;
-- sem policy nenhuma, pelo mesmo motivo


-- ============================================================
-- 4. A CHAVE: quem é a loja
-- ============================================================
create or replace function public.perf_loja_da_chave(chave text)
returns public.perf_lojas
language sql
stable
security definer
set search_path = public
as $$
  select l.* from public.perf_lojas l
   where l.chave_hash is not null
     and l.ativa
     and chave is not null
     and l.chave_hash = encode(sha256(convert_to(chave, 'UTF8')), 'hex')
   limit 1;
$$;
revoke all on function public.perf_loja_da_chave(text) from public;

-- A trava de uma loja, num lugar só.
create or replace function public.perf_liberada(l public.perf_lojas)
returns boolean
language sql
stable
as $$
  select l.para_sempre or (l.liberado_ate is not null and l.liberado_ate > now());
$$;


-- ============================================================
-- 5. A PORTA DE ESCRITA: perf_registrar_evento
-- ============================================================
-- A vitrine já conferiu o que só ela sabe (a peça existe, o número está
-- riscado de verdade). Aqui se confere o formato, se segura enxurrada e
-- se conta repetição uma vez só. Qualquer problema: return calado.
create or replace function public.perf_registrar_evento(chave text, e jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loja public.perf_lojas;
  v_visitante text := lower(coalesce(e->>'visitante', ''));
  v_tipo text := e->>'tipo';
  v_peca text := lower(nullif(trim(coalesce(e->>'produto', '')), ''));
  v_tamanho text := nullif(left(trim(coalesce(e->>'tamanho', '')), 12), '');
  v_busca text := nullif(left(lower(regexp_replace(trim(coalesce(e->>'busca', '')), '\s+', ' ', 'g')), 60), '');
  v_resultados int;
  v_origem text := e->>'origem';
  v_post text := lower(e->>'post');
  v_botao text := e->>'botao';
  v_cidade text := nullif(left(trim(coalesce(e->>'cidade', '')), 60), '');
begin
  v_loja := public.perf_loja_da_chave(chave);
  if v_loja.id is null then return; end if;

  if v_visitante !~ '^[a-z0-9]{8,24}$' then return; end if;
  if v_tipo is null or v_tipo not in ('visita','peca','whatsapp','busca','esgotado') then return; end if;

  -- enxurrada: um visitante não faz mais de 80 coisas em 10 minutos, uma
  -- loja não grava mais de 400 por minuto, e o estúdio inteiro não passa
  -- de 3000 por minuto. Passou, ignora calado.
  if (select count(*) from public.perf_eventos
       where loja_id = v_loja.id and visitante = v_visitante and criado_em > now() - interval '10 minutes') >= 80 then return; end if;
  if (select count(*) from public.perf_eventos
       where loja_id = v_loja.id and criado_em > now() - interval '1 minute') >= 400 then return; end if;
  if (select count(*) from public.perf_eventos
       where criado_em > now() - interval '1 minute') >= 3000 then return; end if;

  if v_peca is not null and v_peca !~ '^[a-z0-9-]{1,80}$' then v_peca := null; end if;
  if v_tipo in ('peca','esgotado') and v_peca is null then return; end if;
  if v_tipo = 'esgotado' and v_tamanho is null then return; end if;
  -- o número pode estar guardado como faixa ("38 ao 43"): confere só o formato
  if v_tamanho is not null and v_tamanho !~ '^[0-9A-Za-z]{1,4}$' then v_tamanho := null; end if;
  if v_tipo = 'busca' and v_busca is null then return; end if;

  if v_origem is not null and v_origem not in ('instagram','google','facebook','whatsapp','direto','outro') then v_origem := 'outro'; end if;
  if v_post is not null and v_post !~ '^[a-z0-9-]{1,40}$' then v_post := null; end if;
  if v_botao is not null and v_botao not in ('peca','geral','loja','procura') then v_botao := null; end if;
  begin v_resultados := (e->>'resultados')::int; exception when others then v_resultados := null; end;

  -- a mesma coisa duas vezes seguidas conta uma vez
  if v_tipo in ('visita','peca','esgotado') and exists (
    select 1 from public.perf_eventos
     where loja_id = v_loja.id and visitante = v_visitante and tipo = v_tipo
       and peca is not distinct from v_peca and tamanho is not distinct from v_tamanho
       and criado_em > now() - interval '30 minutes') then return; end if;
  if v_tipo in ('whatsapp','busca') and exists (
    select 1 from public.perf_eventos
     where loja_id = v_loja.id and visitante = v_visitante and tipo = v_tipo
       and peca is not distinct from v_peca and tamanho is not distinct from v_tamanho
       and busca is not distinct from v_busca
       and criado_em > now() - interval '2 minutes') then return; end if;

  insert into public.perf_eventos (loja_id, visitante, tipo, peca, tamanho, busca, resultados, origem, post, botao, cidade)
  values (v_loja.id, v_visitante, v_tipo, v_peca, v_tamanho,
          case when v_tipo = 'busca' then v_busca end,
          case when v_tipo = 'busca' then v_resultados end,
          case when v_tipo = 'visita' then coalesce(v_origem, 'direto') end,
          case when v_tipo = 'visita' then v_post end,
          case when v_tipo = 'whatsapp' then v_botao end,
          case when v_tipo = 'visita' then v_cidade end);

  -- faxina de vez em quando: o detalhe com mais de 400 dias sai
  if random() < 0.002 then delete from public.perf_eventos where criado_em < now() - interval '400 days'; end if;
end;
$$;
revoke all on function public.perf_registrar_evento(text, jsonb) from public;
grant execute on function public.perf_registrar_evento(text, jsonb) to anon, authenticated;


-- ============================================================
-- 6. A SOMA PARA A ABA: perf_painel
-- ============================================================
-- O mesmo jsonb da painel_visitas da Japa, mais o bloco `acesso`. Travada,
-- o período cai para 30 dias e os blocos pagos saem vazios: antes
-- (comparação), posts_dia e links (campanhas), grade (horários), buscas,
-- numeros, esgotados e volta. Ficam reais: total, dias, pecas e origem,
-- que é o que a página de venda promete de bônus.
create or replace function public.perf_painel(chave text, dias int)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_loja public.perf_lojas;
  liberada boolean;
  n int;
  fim timestamptz := now();
  ini timestamptz;
  ini_antes timestamptz;
  r jsonb;
begin
  v_loja := public.perf_loja_da_chave(chave);
  if v_loja.id is null then return null; end if;

  liberada := public.perf_liberada(v_loja);
  n := greatest(1, least(coalesce(dias, 30), 400));
  if not liberada then n := least(n, 30); end if;
  ini := fim - make_interval(days => n);
  ini_antes := fim - make_interval(days => 2 * n);

  with ev as (
    select e.*, (e.criado_em at time zone v_loja.fuso) as local
      from public.perf_eventos e
     where e.loja_id = v_loja.id and e.criado_em >= ini and e.criado_em < fim
  ), ant as (
    select * from public.perf_eventos
     where loja_id = v_loja.id and criado_em >= ini_antes and criado_em < ini
  ), quem as (
    -- cada visitante do período: em quantos dias entrou, se chamou, de onde veio
    select visitante,
           count(distinct local::date) as n_dias,
           bool_or(tipo = 'whatsapp') as chamou,
           (array_agg(post order by criado_em) filter (where post is not null))[1] as post,
           (array_agg(origem order by criado_em) filter (where origem is not null))[1] as origem,
           (array_agg(cidade order by criado_em) filter (where cidade is not null))[1] as cidade
      from ev group by visitante
  )
  select jsonb_build_object(
    'acesso', jsonb_build_object(
      'liberado', liberada,
      'liberado_ate', v_loja.liberado_ate,
      'para_sempre', v_loja.para_sempre,
      -- (07/10) para o painel levar à página de assinar e contar os dias:
      -- o id da loja não é segredo (pagar pela loja de outro não libera nada
      -- de ninguém além dela), o plano diz como ela paga, e renova_sozinho é
      -- o cartão mensal ativo, que dispensa o aviso de renovação
      'loja', v_loja.id,
      'plano', v_loja.plano,
      'renova_sozinho', coalesce(v_loja.plano = 'cartao_mensal' and v_loja.assinatura_status = 'authorized', false),
      -- (07/10) o degrau pago acima da vitrine: 'vender' ou 'loja'
      'upgrade', v_loja.upgrade),
    -- as duas contagens que saem MESMO travada (06/10): só o número de
    -- pessoas, sem termo nem peça. É o gancho do bloco "o que merece a sua
    -- atenção" e da mensagem de venda; o dado em si continua fechado.
    'atencao', jsonb_build_object(
      'buscas_pessoas', (select count(distinct visitante) from ev where tipo = 'busca' and coalesce(resultados, 0) = 0),
      'esgotados_pessoas', (select count(distinct visitante) from ev where tipo = 'esgotado')),
    'periodo', n,
    'contagem_desde', (select min(criado_em) from public.perf_eventos where loja_id = v_loja.id),
    'agora', fim,
    'total', jsonb_build_object(
      'pessoas', (select count(distinct visitante) from ev),
      'olharam', (select count(distinct visitante) from ev where tipo = 'peca'),
      'chamaram', (select count(distinct visitante) from ev where tipo = 'whatsapp')),
    'antes', case when liberada then jsonb_build_object(
      'pessoas', (select count(distinct visitante) from ant),
      'olharam', (select count(distinct visitante) from ant where tipo = 'peca'),
      'chamaram', (select count(distinct visitante) from ant where tipo = 'whatsapp')) end,
    'dias', coalesce((select jsonb_agg(jsonb_build_object('d', d, 'pessoas', p, 'olharam', o, 'chamaram', c) order by d)
       from (select local::date as d, count(distinct visitante) p,
                    count(distinct visitante) filter (where tipo = 'peca') o,
                    count(distinct visitante) filter (where tipo = 'whatsapp') c
               from ev group by 1) x), '[]'::jsonb),
    'posts_dia', case when liberada then coalesce((select jsonb_agg(jsonb_build_object('d', d, 'post', post, 'pessoas', p))
       from (select distinct on (local::date) local::date as d, post, count(distinct visitante) p
               from ev where post is not null group by 1, 2 order by 1, 3 desc) x), '[]'::jsonb) else '[]'::jsonb end,
    'pecas', coalesce((select jsonb_agg(jsonb_build_object('produto', peca, 'viram', v, 'chamaram', c))
       from (select peca, count(distinct visitante) filter (where tipo = 'peca') v,
                    count(distinct visitante) filter (where tipo = 'whatsapp') c
               from ev where peca is not null and tipo in ('peca','whatsapp') group by 1) x), '[]'::jsonb),
    'links', case when liberada then coalesce((select jsonb_agg(jsonb_build_object('post', post, 'pessoas', p, 'chamaram', c))
       from (select post, count(*) p, count(*) filter (where chamou) c from quem where post is not null group by 1) x), '[]'::jsonb) else '[]'::jsonb end,
    'origem', coalesce((select jsonb_agg(jsonb_build_object('origem', origem, 'pessoas', p, 'chamaram', c))
       from (select coalesce(origem, 'direto') origem, count(*) p, count(*) filter (where chamou) c from quem group by 1) x), '[]'::jsonb),
    -- de que cidade vieram (07/10): as seis maiores, grátis como a origem.
    -- Quem entrou sem cidade (fora da Vercel, cabeçalho ausente) fica fora.
    'cidades', coalesce((select jsonb_agg(jsonb_build_object('cidade', cidade, 'pessoas', p, 'chamaram', c) order by p desc)
       from (select cidade, count(*) p, count(*) filter (where chamou) c from quem where cidade is not null
              group by 1 order by 2 desc limit 6) x), '[]'::jsonb),
    'grade', case when liberada then coalesce((select jsonb_agg(jsonb_build_object('dia', dow, 'faixa', faixa, 'pessoas', p))
       from (select extract(isodow from local)::int as dow, (extract(hour from local)::int / 3) as faixa, count(distinct visitante) p
               from ev group by 1, 2) x), '[]'::jsonb) else '[]'::jsonb end,
    'buscas', case when liberada then coalesce((select jsonb_agg(jsonb_build_object('termo', busca, 'pessoas', p) order by p desc)
       from (select busca, count(distinct visitante) p from ev where tipo = 'busca' and resultados = 0
              group by 1 order by 2 desc limit 8) x), '[]'::jsonb) else '[]'::jsonb end,
    'numeros', case when liberada then coalesce((select jsonb_agg(jsonb_build_object('produto', peca, 'tamanho', tamanho, 'pessoas', p))
       from (select peca, tamanho, count(distinct visitante) p from ev
              where tipo = 'whatsapp' and peca is not null and tamanho is not null group by 1, 2) x), '[]'::jsonb) else '[]'::jsonb end,
    'esgotados', case when liberada then coalesce((select jsonb_agg(jsonb_build_object('produto', peca, 'tamanho', tamanho, 'pessoas', p) order by p desc)
       from (select peca, tamanho, count(distinct visitante) p from ev
              where tipo = 'esgotado' and peca is not null group by 1, 2 order by 3 desc limit 6) x), '[]'::jsonb) else '[]'::jsonb end,
    'volta', case when liberada then (select jsonb_build_object(
        'novos', count(*) filter (where n_dias = 1), 'voltaram', count(*) filter (where n_dias > 1),
        'chamaram_novos', count(*) filter (where n_dias = 1 and chamou),
        'chamaram_voltaram', count(*) filter (where n_dias > 1 and chamou)) from quem) end
  ) into r;
  return r;
end;
$$;
revoke all on function public.perf_painel(text, int) from public;
grant execute on function public.perf_painel(text, int) to anon, authenticated;

-- A INÍCIO DO PAINEL (06/10): "Sua loja hoje", no fuso da loja, e o "vale
-- olhar" dos últimos 7 dias (quantas pessoas procuraram o que a loja não
-- tem, quantas tocaram num número que acabou). Só contagens, grátis, e
-- barato: a Início chama em streaming e não espera.
create or replace function public.perf_hoje(chave text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_loja public.perf_lojas;
  ini_hoje timestamptz;
begin
  v_loja := public.perf_loja_da_chave(chave);
  if v_loja.id is null then return null; end if;
  ini_hoje := (date_trunc('day', now() at time zone v_loja.fuso)) at time zone v_loja.fuso;
  return jsonb_build_object(
    'pessoas_hoje', (select count(distinct visitante) from public.perf_eventos
                      where loja_id = v_loja.id and criado_em >= ini_hoje),
    'chamaram_hoje', (select count(distinct visitante) from public.perf_eventos
                       where loja_id = v_loja.id and tipo = 'whatsapp' and criado_em >= ini_hoje),
    'buscas_7d', (select count(distinct visitante) from public.perf_eventos
                   where loja_id = v_loja.id and tipo = 'busca' and coalesce(resultados, 0) = 0
                     and criado_em > now() - interval '7 days'),
    'esgotados_7d', (select count(distinct visitante) from public.perf_eventos
                      where loja_id = v_loja.id and tipo = 'esgotado' and criado_em > now() - interval '7 days'),
    -- (07/10) a escada da Início: em que degrau a loja está
    'loja', v_loja.id,
    'liberado', public.perf_liberada(v_loja),
    'plano', v_loja.plano,
    'upgrade', v_loja.upgrade);
end;
$$;
revoke all on function public.perf_hoje(text) from public;
grant execute on function public.perf_hoje(text) to anon, authenticated;


-- ============================================================
-- 7. OS LINKS, pela chave
-- ============================================================
create or replace function public.perf_links(chave text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_loja public.perf_lojas;
begin
  v_loja := public.perf_loja_da_chave(chave);
  if v_loja.id is null then return null; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'nome', nome, 'slug', slug, 'criado_em', criado_em) order by criado_em desc)
                     from public.perf_links where loja_id = v_loja.id), '[]'::jsonb);
end;
$$;
revoke all on function public.perf_links(text) from public;
grant execute on function public.perf_links(text) to anon, authenticated;

-- Devolve {ok:true, id} ou {ok:false, erro:'travada'|'repetido'|'invalido'}.
create or replace function public.perf_criar_link(chave text, nome text, slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_loja public.perf_lojas; v_id uuid; v_slug text := lower(trim(coalesce(slug, '')));
begin
  v_loja := public.perf_loja_da_chave(chave);
  if v_loja.id is null then return jsonb_build_object('ok', false, 'erro', 'invalido'); end if;
  if not public.perf_liberada(v_loja) then return jsonb_build_object('ok', false, 'erro', 'travada'); end if;
  if v_slug !~ '^[a-z0-9-]{1,40}$' or length(trim(coalesce(nome, ''))) not between 1 and 60 then
    return jsonb_build_object('ok', false, 'erro', 'invalido');
  end if;
  if exists (select 1 from public.perf_links pl where pl.loja_id = v_loja.id and pl.slug = v_slug) then
    return jsonb_build_object('ok', false, 'erro', 'repetido');
  end if;
  insert into public.perf_links (loja_id, nome, slug) values (v_loja.id, trim(nome), v_slug) returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;
revoke all on function public.perf_criar_link(text, text, text) from public;
grant execute on function public.perf_criar_link(text, text, text) to anon, authenticated;

create or replace function public.perf_apagar_link(chave text, id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_loja public.perf_lojas;
begin
  v_loja := public.perf_loja_da_chave(chave);
  if v_loja.id is null then return; end if;
  delete from public.perf_links pl where pl.loja_id = v_loja.id and pl.id = perf_apagar_link.id;
end;
$$;
revoke all on function public.perf_apagar_link(text, uuid) from public;
grant execute on function public.perf_apagar_link(text, uuid) to anon, authenticated;

-- O link curto pergunta: "bio" é um link desta loja? Só sim ou não.
create or replace function public.perf_post_existe(chave text, s text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_loja public.perf_lojas;
begin
  v_loja := public.perf_loja_da_chave(chave);
  if v_loja.id is null then return false; end if;
  return exists (select 1 from public.perf_links pl where pl.loja_id = v_loja.id and pl.slug = lower(s));
end;
$$;
revoke all on function public.perf_post_existe(text, text) from public;
grant execute on function public.perf_post_existe(text, text) to anon, authenticated;


-- ============================================================
-- 8. O LADO DO CRM (só logado)
-- ============================================================
-- Gera a chave de uma loja do dono e devolve o texto UMA vez. Chamar de
-- novo troca a chave: a antiga para de valer na hora, e a Vercel precisa
-- da nova.
create or replace function public.perf_criar_chave(loja uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_chave text; v_ok int;
begin
  if auth.uid() is null then raise exception 'Sessão expirada. Entre de novo.'; end if;
  v_chave := 'perf_' || replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  update public.perf_lojas
     set chave_hash = encode(sha256(convert_to(v_chave, 'UTF8')), 'hex'),
         chave_prefixo = left(v_chave, 9)
   where id = loja and owner_id = auth.uid();
  get diagnostics v_ok = row_count;
  if v_ok = 0 then raise exception 'Loja não encontrada.'; end if;
  return v_chave;
end;
$$;
revoke all on function public.perf_criar_chave(uuid) from public;
grant execute on function public.perf_criar_chave(uuid) to authenticated;

-- Para a lista do CRM: por loja do dono, quando foi o último evento, os
-- números dos últimos 7 dias e o GANCHO DA VENDA dos últimos 30: quantas
-- pessoas procuraram o que a loja não tem e quantas quiseram um número que
-- acabou. É o número que o Rafael manda no WhatsApp para oferecer o
-- Performance ("17 pessoas procuraram algo que você não tem"), a regra da
-- Japa: lembrete com um número que só os dados dele dizem. Security definer
-- porque perf_eventos não tem policy; o filtro por dono está no where.
create or replace function public.perf_resumo_lojas()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Sessão expirada. Entre de novo.'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'loja_id', l.id,
      'ultimo_evento_em', (select max(criado_em) from public.perf_eventos e where e.loja_id = l.id),
      'pessoas_7d', (select count(distinct visitante) from public.perf_eventos e
                      where e.loja_id = l.id and e.criado_em > now() - interval '7 days'),
      'chamaram_7d', (select count(distinct visitante) from public.perf_eventos e
                       where e.loja_id = l.id and e.tipo = 'whatsapp' and e.criado_em > now() - interval '7 days'),
      'buscas_30d', (select count(distinct visitante) from public.perf_eventos e
                      where e.loja_id = l.id and e.tipo = 'busca' and coalesce(e.resultados, 0) = 0
                        and e.criado_em > now() - interval '30 days'),
      'esgotados_30d', (select count(distinct visitante) from public.perf_eventos e
                         where e.loja_id = l.id and e.tipo = 'esgotado' and e.criado_em > now() - interval '30 days'),
      'eventos_total', (select count(*) from public.perf_eventos e where e.loja_id = l.id)))
      from public.perf_lojas l where l.owner_id = auth.uid()), '[]'::jsonb);
end;
$$;
revoke all on function public.perf_resumo_lojas() from public;
grant execute on function public.perf_resumo_lojas() to authenticated;


-- ============================================================
-- 9. O RECEBIMENTO QUE LIBERA: perf_ao_receber
-- ============================================================
-- Quando uma parcela de um contrato ligado a uma loja Performance fica
-- paga por inteiro, a trava anda: liberado_ate = o maior entre o que já
-- era e o vencimento daquela mensalidade + 1 mês + 5 dias (a folga para
-- o Pix atrasar sem a aba fechar na cara do cliente). Pagamento parcial
-- não libera. Estorno não recua sozinho: isso é decisão no CRM.
create or replace function public.perf_ao_receber()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_p public.crm_parcelas%rowtype;
  v_loja uuid;
  v_pago numeric;
begin
  if new.parcela_id is null or new.estornado_em is not null then return new; end if;
  select * into v_p from public.crm_parcelas where id = new.parcela_id;
  if not found then return new; end if;
  select id into v_loja from public.perf_lojas where contrato_id = v_p.contrato_id limit 1;
  if v_loja is null then return new; end if;
  select coalesce(sum(valor), 0) into v_pago
    from public.crm_recebimentos
   where parcela_id = v_p.id and estornado_em is null;
  if v_pago + 0.005 < v_p.valor then return new; end if;
  update public.perf_lojas
     set liberado_ate = greatest(coalesce(liberado_ate, now()),
                                 v_p.vence_em::timestamptz + interval '1 month' + interval '5 days')
   where id = v_loja;
  return new;
end;
$$;

drop trigger if exists perf_ao_receber on public.crm_recebimentos;
create trigger perf_ao_receber
  after insert or update of parcela_id, estornado_em on public.crm_recebimentos
  for each row execute function public.perf_ao_receber();


-- ============================================================
-- 10. O RELATÓRIO DO MÊS (06/10/2026)
-- ============================================================
-- O Performance não é só a aba: todo mês o estúdio manda ao dono um
-- relatório por link (rafaelrazeira.com.br/relatorio/<token>), com os
-- números do mês contra o anterior, as decisões do mês, a LEITURA do
-- Rafael e o que foi feito no mês passado. O dono não precisa entrar em
-- painel nenhum. Decisão do Rafael em 06/10: a aba sozinha não segura uma
-- mensalidade; alguém agindo pelos números, sim.
--
-- Uma linha por loja e por mês. O token é a credencial do link (quem tem
-- o link lê o relatório daquele mês daquela loja, e só ele). O texto
-- (leitura, feito) o Rafael escreve no CRM.
create table if not exists public.perf_relatorios (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  loja_id     uuid not null references public.perf_lojas (id) on delete cascade,
  mes         date not null check (extract(day from mes) = 1),
  token       text not null unique default replace(gen_random_uuid()::text, '-', ''),
  leitura     text,
  feito       text,
  criado_em   timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (loja_id, mes)
);
alter table public.perf_relatorios enable row level security;
drop policy if exists perf_relatorios_dono on public.perf_relatorios;
create policy perf_relatorios_dono on public.perf_relatorios
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop trigger if exists perf_relatorios_relogio on public.perf_relatorios;
create trigger perf_relatorios_relogio before update on public.perf_relatorios
  for each row execute function public.crm_relogio();

-- O relatório pelo token: público (anon), só leitura, só aquele mês daquela
-- loja. O mês corrente sai parcial (até agora) e diz isso.
create or replace function public.perf_relatorio(chave_link text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r public.perf_relatorios;
  l public.perf_lojas;
  ini timestamptz;
  fim timestamptz;
  fim_mes timestamptz;
  ini_ant timestamptz;
  res jsonb;
begin
  select * into r from public.perf_relatorios where token = chave_link;
  if r.id is null then return null; end if;
  select * into l from public.perf_lojas where id = r.loja_id;
  ini := (r.mes::timestamp) at time zone l.fuso;
  fim_mes := ((r.mes + interval '1 month')::timestamp) at time zone l.fuso;
  fim := least(fim_mes, now());
  ini_ant := ((r.mes - interval '1 month')::timestamp) at time zone l.fuso;

  with ev as (
    select e.*, (e.criado_em at time zone l.fuso) as local
      from public.perf_eventos e
     where e.loja_id = l.id and e.criado_em >= ini and e.criado_em < fim
  ), ant as (
    select * from public.perf_eventos
     where loja_id = l.id and criado_em >= ini_ant and criado_em < ini
  ), quem as (
    select visitante,
           count(distinct local::date) as n_dias,
           bool_or(tipo = 'whatsapp') as chamou,
           (array_agg(post order by criado_em) filter (where post is not null))[1] as post,
           (array_agg(origem order by criado_em) filter (where origem is not null))[1] as origem,
           (array_agg(cidade order by criado_em) filter (where cidade is not null))[1] as cidade
      from ev group by visitante
  )
  select jsonb_build_object(
    'loja', l.nome,
    'mes', r.mes,
    'parcial', fim < fim_mes,
    'ate', fim,
    'leitura', r.leitura,
    'feito', r.feito,
    'total', jsonb_build_object(
      'pessoas', (select count(distinct visitante) from ev),
      'olharam', (select count(distinct visitante) from ev where tipo = 'peca'),
      'chamaram', (select count(distinct visitante) from ev where tipo = 'whatsapp')),
    'antes', jsonb_build_object(
      'pessoas', (select count(distinct visitante) from ant),
      'olharam', (select count(distinct visitante) from ant where tipo = 'peca'),
      'chamaram', (select count(distinct visitante) from ant where tipo = 'whatsapp')),
    'dias', coalesce((select jsonb_agg(jsonb_build_object('d', d, 'pessoas', p, 'chamaram', c) order by d)
       from (select local::date as d, count(distinct visitante) p,
                    count(distinct visitante) filter (where tipo = 'whatsapp') c
               from ev group by 1) x), '[]'::jsonb),
    'pecas', coalesce((select jsonb_agg(jsonb_build_object('produto', peca, 'viram', v, 'chamaram', c) order by c desc, v desc)
       from (select peca, count(distinct visitante) filter (where tipo = 'peca') v,
                    count(distinct visitante) filter (where tipo = 'whatsapp') c
               from ev where peca is not null and tipo in ('peca','whatsapp') group by 1) x), '[]'::jsonb),
    'buscas', coalesce((select jsonb_agg(jsonb_build_object('termo', busca, 'pessoas', p) order by p desc)
       from (select busca, count(distinct visitante) p from ev where tipo = 'busca' and coalesce(resultados, 0) = 0
              group by 1 order by 2 desc limit 6) x), '[]'::jsonb),
    'esgotados', coalesce((select jsonb_agg(jsonb_build_object('produto', peca, 'tamanho', tamanho, 'pessoas', p) order by p desc)
       from (select peca, tamanho, count(distinct visitante) p from ev
              where tipo = 'esgotado' and peca is not null group by 1, 2 order by 3 desc limit 5) x), '[]'::jsonb),
    'origem', coalesce((select jsonb_agg(jsonb_build_object('origem', origem, 'pessoas', p, 'chamaram', c) order by p desc)
       from (select coalesce(origem, 'direto') origem, count(*) p, count(*) filter (where chamou) c from quem group by 1) x), '[]'::jsonb),
    'links', coalesce((select jsonb_agg(jsonb_build_object('nome', coalesce(k.nome, x.post), 'pessoas', x.p, 'chamaram', x.c) order by x.p desc)
       from (select post, count(*) p, count(*) filter (where chamou) c from quem where post is not null group by 1) x
       left join public.perf_links k on k.loja_id = l.id and k.slug = x.post), '[]'::jsonb),
    'horario', (select jsonb_build_object('dia', dow, 'faixa', faixa, 'pessoas', p)
       from (select extract(isodow from local)::int as dow, (extract(hour from local)::int / 3) as faixa, count(distinct visitante) p
               from ev group by 1, 2 order by 3 desc limit 1) x),
    'voltaram', (select count(*) from quem where n_dias > 1)
  ) into res;
  return res;
end;
$$;
revoke all on function public.perf_relatorio(text) from public;
grant execute on function public.perf_relatorio(text) to anon, authenticated;

-- Os relatórios de uma loja, pela chave dela: é o que põe o botão
-- "Relatório do mês" na aba Desempenho do painel do lojista (06/10). Só
-- o mês e o token, do mais novo para o mais antigo.
create or replace function public.perf_relatorios_da_loja(chave text)
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
  if v_loja.id is null then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('mes', mes, 'token', token) order by mes desc)
    from public.perf_relatorios where loja_id = v_loja.id), '[]'::jsonb);
end;
$$;
revoke all on function public.perf_relatorios_da_loja(text) from public;
grant execute on function public.perf_relatorios_da_loja(text) to anon, authenticated;


-- ============================================================
-- 12. O PAGAMENTO PELO PRÓPRIO PERFORMANCE (07/10/2026)
-- ============================================================
-- O Rafael decidiu: Pix mês a mês (cada Pix soma 30 dias, com contagem e
-- aviso de renovação no painel), cartão mensal (assinatura do Mercado Pago,
-- renova sozinha; cada cobrança soma 35 dias, a folga para a próxima
-- cobrança passar) e cartão anual (R$ 1.970 em até 12x, soma 365 dias).
-- Os valores moram em lib/oferta-performance.ts do estúdio, nunca aqui.
--
-- O caminho: a página /assinar/<loja> cria o pagamento no Mercado Pago com
-- a referência perf:<loja>:<plano>:<uuid>; o webhook confere o pagamento na
-- API e chama perf_registrar_pagamento. A trava de idempotência é o banco:
-- o mesmo pagamento avisado cinco vezes soma os dias UMA vez.
alter table public.perf_lojas add column if not exists plano text
  check (plano in ('pix_mensal', 'cartao_mensal', 'cartao_anual', 'manual'));
-- a assinatura do cartão mensal no Mercado Pago (preapproval) e o estado
-- dela ('authorized', 'paused', 'cancelled'), que o webhook mantém
alter table public.perf_lojas add column if not exists mp_assinatura_id text;
alter table public.perf_lojas add column if not exists assinatura_status text;

create table if not exists public.perf_pagamentos (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.perf_lojas(id) on delete cascade,
  plano text not null check (plano in ('pix_mensal', 'cartao_mensal', 'cartao_anual')),
  mp_payment_id text not null,
  valor numeric(10, 2) not null,
  dias int not null check (dias between 1 and 400),
  liberado_ate timestamptz,
  criado_em timestamptz not null default now()
);
create unique index if not exists perf_pagamentos_mp_idx on public.perf_pagamentos (mp_payment_id);
create index if not exists perf_pagamentos_loja_idx on public.perf_pagamentos (loja_id, criado_em desc);
alter table public.perf_pagamentos enable row level security;
-- o CRM logado lê os pagamentos das lojas dele; escrever, só a função abaixo
drop policy if exists perf_pagamentos_dono on public.perf_pagamentos;
create policy perf_pagamentos_dono on public.perf_pagamentos for select to authenticated
  using (exists (select 1 from public.perf_lojas l where l.id = loja_id and l.owner_id = auth.uid()));

-- Soma os dias de UM pagamento aprovado. Pagamento repetido devolve
-- novo=false e não mexe em nada. A conta parte do maior entre agora e o
-- liberado_ate atual: quem renova antes não perde os dias que faltavam, e
-- quem volta depois de travar conta a partir de hoje.
create or replace function public.perf_registrar_pagamento(
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
  insert into public.perf_pagamentos (loja_id, plano, mp_payment_id, valor, dias)
  values (p_loja, p_plano, p_payment, p_valor, p_dias)
  on conflict (mp_payment_id) do nothing
  returning id into v_id;
  if v_id is null then
    return jsonb_build_object('novo', false);
  end if;
  update public.perf_lojas
     set liberado_ate = greatest(coalesce(liberado_ate, now()), now()) + make_interval(days => p_dias),
         plano = p_plano,
         updated_at = now()
   where id = p_loja
  returning liberado_ate into v_ate;
  update public.perf_pagamentos set liberado_ate = v_ate where id = v_id;
  return jsonb_build_object('novo', true, 'liberado_ate', v_ate);
end;
$$;
revoke all on function public.perf_registrar_pagamento(uuid, text, text, numeric, int) from public;
grant execute on function public.perf_registrar_pagamento(uuid, text, text, numeric, int) to service_role;


-- ============================================================
-- 13. OS UPGRADES DA VITRINE (07/10/2026)
-- ============================================================
-- Os dois degraus acima da vitrine, pagos de dentro do painel: vender pela
-- vitrine (R$ 991 para quem já tem a vitrine) e loja online (R$ 2.500, com
-- R$ 249,90 por mês depois da entrega e o Performance incluído). Os valores
-- moram em lib/oferta-performance.ts do estúdio. O pagamento NÃO soma dias:
-- marca o degrau na loja (o painel mostra "em produção") e o Rafael começa.
alter table public.perf_lojas add column if not exists upgrade text
  check (upgrade in ('vender', 'loja'));
alter table public.perf_lojas add column if not exists upgrade_pago_em timestamptz;

create table if not exists public.perf_upgrades (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.perf_lojas(id) on delete cascade,
  degrau text not null check (degrau in ('vender', 'loja')),
  mp_payment_id text not null,
  valor numeric(10, 2) not null,
  criado_em timestamptz not null default now()
);
create unique index if not exists perf_upgrades_mp_idx on public.perf_upgrades (mp_payment_id);
alter table public.perf_upgrades enable row level security;
drop policy if exists perf_upgrades_dono on public.perf_upgrades;
create policy perf_upgrades_dono on public.perf_upgrades for select to authenticated
  using (exists (select 1 from public.perf_lojas l where l.id = loja_id and l.owner_id = auth.uid()));

-- Marca o degrau UMA vez por pagamento. A loja online passa por cima do
-- vender pela vitrine; o contrário não (quem tem a loja online não desce).
create or replace function public.perf_registrar_upgrade(
  p_loja uuid, p_degrau text, p_payment text, p_valor numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.perf_upgrades (loja_id, degrau, mp_payment_id, valor)
  values (p_loja, p_degrau, p_payment, p_valor)
  on conflict (mp_payment_id) do nothing
  returning id into v_id;
  if v_id is null then
    return jsonb_build_object('novo', false);
  end if;
  update public.perf_lojas
     set upgrade = case when upgrade = 'loja' then 'loja' else p_degrau end,
         upgrade_pago_em = now(),
         updated_at = now()
   where id = p_loja;
  return jsonb_build_object('novo', true, 'degrau', p_degrau);
end;
$$;
revoke all on function public.perf_registrar_upgrade(uuid, text, text, numeric) from public;
grant execute on function public.perf_registrar_upgrade(uuid, text, text, numeric) to service_role;


-- ============================================================
-- 14. A SEMANA DA LOJA (09/10/2026)
-- ============================================================
-- O resumo de segunda: os últimos 7 dias contra os 7 de antes, a peça que
-- mais levou gente ao WhatsApp, o que procuraram e a loja não tem, e o
-- tamanho que acabou e pediram. Sai em duas portas, com a mesma conta:
--   perf_resumo_semana(chave)   o cartão "Sua semana" na Início da loja
--   perf_resumos_da_semana()    a fila de segunda no CRM (só o estúdio)
-- A frase é montada no código (a régua da casa: o número com a conclusão).
create or replace function public.perf_semana_de(v_loja public.perf_lojas)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with ev as (
    select * from public.perf_eventos
     where loja_id = v_loja.id and criado_em > now() - interval '7 days'
  ), ant as (
    select * from public.perf_eventos
     where loja_id = v_loja.id and criado_em > now() - interval '14 days' and criado_em <= now() - interval '7 days'
  ), pecas as (
    select peca, count(distinct visitante) c from ev
     where tipo = 'whatsapp' and peca is not null group by 1 order by 2 desc limit 1
  )
  select jsonb_build_object(
    'pessoas', (select count(distinct visitante) from ev),
    'chamaram', (select count(distinct visitante) from ev where tipo = 'whatsapp'),
    'pessoas_antes', (select count(distinct visitante) from ant),
    'chamaram_antes', (select count(distinct visitante) from ant where tipo = 'whatsapp'),
    'peca', (select peca from pecas),
    'peca_chamaram', (select c from pecas),
    'buscas', coalesce((select jsonb_agg(busca) from (
        select busca from ev where tipo = 'busca' and coalesce(resultados, 0) = 0
         group by 1 order by count(distinct visitante) desc limit 3) x), '[]'::jsonb),
    'esgotados', coalesce((select jsonb_agg(jsonb_build_object('produto', peca, 'tamanho', tamanho, 'pessoas', p)) from (
        select peca, tamanho, count(distinct visitante) p from ev
         where tipo = 'esgotado' and peca is not null group by 1, 2 order by 3 desc limit 3) x), '[]'::jsonb),
    'contagem_desde', (select min(criado_em) from public.perf_eventos where loja_id = v_loja.id));
$$;
revoke all on function public.perf_semana_de(public.perf_lojas) from public, anon, authenticated;

create or replace function public.perf_resumo_semana(chave text)
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
  return public.perf_semana_de(v_loja);
end;
$$;
revoke all on function public.perf_resumo_semana(text) from public;
grant execute on function public.perf_resumo_semana(text) to anon, authenticated;

-- a fila de segunda no CRM: as lojas do estúdio com o Performance liberado
create or replace function public.perf_resumos_da_semana()
returns table (loja_id uuid, nome text, slug text, lead_id uuid, semana jsonb)
language sql
stable
security definer
set search_path = public
as $$
  select l.id, l.nome, l.slug, l.lead_id, public.perf_semana_de(l)
    from public.perf_lojas l
   where l.owner_id = auth.uid() and l.ativa and public.perf_liberada(l)
   order by l.nome;
$$;
revoke all on function public.perf_resumos_da_semana() from public, anon;
grant execute on function public.perf_resumos_da_semana() to authenticated;


-- ============================================================
-- 11. CONFERÊNCIA
-- ============================================================
-- Para testar no editor, com uma loja criada no CRM (ou aqui):
--   insert into perf_lojas (nome, slug) values ('Loja de teste', 'teste');  -- logado no editor o owner_id é o seu
--   select perf_criar_chave((select id from perf_lojas where slug = 'teste'));   -- guarde o texto
--   select perf_registrar_evento('<chave>', '{"visitante":"abcdefgh1234","tipo":"visita","origem":"instagram"}');
--   select perf_registrar_evento('<chave>', '{"visitante":"abcdefgh1234","tipo":"peca","produto":"tenis-exemplo"}');
--   select perf_painel('<chave>', 30);        -- travada: antes/grade/buscas... vazios
--   update perf_lojas set liberado_ate = now() + interval '7 days' where slug = 'teste';
--   select perf_painel('<chave>', 90);        -- liberada: tudo volta, e o período aceita 90
--   delete from perf_lojas where slug = 'teste';   -- leva os eventos junto
select l.nome, l.slug, l.chave_prefixo, l.liberado_ate, l.para_sempre, l.ativa,
       (select count(*) from public.perf_eventos e where e.loja_id = l.id) as eventos,
       (select max(criado_em) from public.perf_eventos e where e.loja_id = l.id) as ultimo
  from public.perf_lojas l
 order by l.criado_em desc;
