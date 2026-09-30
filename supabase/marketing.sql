-- ============================================================
-- MARKETING: o time de agentes do estúdio dentro do CRM
-- Cole este arquivo inteiro em: Supabase → SQL Editor → Run.
-- Idempotente: rodar duas vezes não quebra nem duplica nada.
-- ============================================================
--
-- QUEM ESCREVE O QUÊ (30/09/2026)
--
-- O site NÃO roda os agentes. A Paula, o Caetano, a Dora e a Vera rodam
-- no PC do Rafael pelo `claude -p`, na assinatura, pelo worker
-- `scripts/marketing-agentes.ts`. O site só grava o PEDIDO; o worker lê
-- o pedido, roda o agente e escreve o resultado de volta na peça.
--
-- Por isso existem as três tabelas:
--   mkt_pecas    a peça: briefing, copy, slides, prompt da capa, data
--   mkt_pedidos  a fila entre o site e o PC ("Caetano, escreve a peça X")
--   mkt_sinal    o batimento do worker: é por ele que a tela sabe dizer
--                "o time está acordado" ou "ligue o worker no PC"
--
-- Mesma regra de RLS do CRM: owner_id em tudo, policy por auth.uid(). O
-- worker usa a service role e ignora o RLS, e é por isso que ele grava o
-- owner_id à mão (CRM_OWNER_ID do .env.local).
-- ============================================================


-- ============================================================
-- 1. AS PEÇAS
-- ============================================================
create table if not exists public.mkt_pecas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,

  -- O formato manda nas regras duras (story sem hashtag, anúncio com CTA).
  tipo text not null default 'carrossel'
    check (tipo in ('carrossel','post_feed','story','criativo_ads')),

  -- O código da tabela mestra do posicionamento (T1..F3). Opcional: peça
  -- avulsa existe, e ela recebe a regra de CTA "oferta é opcional".
  codigo text check (codigo is null or codigo in ('T1','T2','T3','M1','M2','M3','F1','F2','F3')),

  briefing text not null default '',
  gancho text not null default '',
  corpo text not null default '',
  cta text not null default '',
  hashtags text not null default '',
  legenda text not null default '',

  -- Os slides que a mesa monta: [{ molde, manchete, batida, apoio, numero }].
  -- jsonb porque o Caetano escreve e o Rafael reordena e troca o molde de
  -- cada um; virar tabela seria uma migração por ajuste de layout.
  slides jsonb not null default '[]'::jsonb,

  -- O prompt que a Dora escreve para o ChatGPT gerar o fundo da capa, e o
  -- caminho do fundo no bucket `marketing` depois que o Rafael sobe a imagem.
  prompt_capa text not null default '',
  fundo text,

  -- O que cada agente disse sobre a peça, por agente: { estrategista: "…" }.
  notas jsonb not null default '{}'::jsonb,
  opcoes_gancho jsonb not null default '[]'::jsonb,
  -- O parecer da Vera: { status: APPROVE|CONDITIONAL|REJECT, bloqueadores: [] … }
  veredito jsonb,

  -- A data no calendário. Vazia = a peça mora na bandeja "sem data".
  posta_em date,

  -- rascunho: ainda mexendo; pronta: arte baixada, esperando o dia;
  -- postada: está no feed.
  status text not null default 'rascunho'
    check (status in ('rascunho','pronta','postada')),

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists mkt_pecas_data_idx on public.mkt_pecas (owner_id, posta_em);


-- ============================================================
-- 2. OS PEDIDOS (a fila entre o site e o PC)
-- ============================================================
--
-- agente:
--   estrategista  Paula: pauta e quatro ganchos para ESTA peça
--   copywriter    Caetano: copy, slides e legenda
--   diretor-arte  Dora: o prompt da capa para o ChatGPT
--   revisor       Vera: o veredito
--   tudo          os quatro em fila, na ordem, parando se alguém falhar
--   pautas        Paula propõe N pautas novas; cada uma vira peça sem data
--                 (é o único pedido sem peca_id)
create table if not exists public.mkt_pedidos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  peca_id uuid references public.mkt_pecas(id) on delete cascade,

  agente text not null
    check (agente in ('estrategista','copywriter','diretor-arte','revisor','tudo','pautas')),
  entrada jsonb not null default '{}'::jsonb,

  status text not null default 'na_fila'
    check (status in ('na_fila','rodando','feito','erro')),
  -- No `tudo`, qual dos quatro está rodando agora (é o que a tela mostra).
  etapa text,
  erro text,

  criado_em timestamptz not null default now(),
  iniciado_em timestamptz,
  terminado_em timestamptz
);

create index if not exists mkt_pedidos_fila_idx on public.mkt_pedidos (status, criado_em);
create index if not exists mkt_pedidos_peca_idx on public.mkt_pedidos (peca_id, criado_em desc);


-- ============================================================
-- 3. O BATIMENTO DO WORKER
-- ============================================================
create table if not exists public.mkt_sinal (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  visto_em timestamptz not null default now()
);


-- ============================================================
-- 4. RLS
-- ============================================================
alter table public.mkt_pecas enable row level security;
alter table public.mkt_pedidos enable row level security;
alter table public.mkt_sinal enable row level security;

drop policy if exists mkt_pecas_dono on public.mkt_pecas;
create policy mkt_pecas_dono on public.mkt_pecas
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists mkt_pedidos_dono on public.mkt_pedidos;
create policy mkt_pedidos_dono on public.mkt_pedidos
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists mkt_sinal_dono on public.mkt_sinal;
create policy mkt_sinal_dono on public.mkt_sinal
  for select to authenticated
  using (owner_id = (select auth.uid()));


-- ============================================================
-- 5. O BUCKET DOS FUNDOS
-- ============================================================
--
-- Público para leitura pelo mesmo motivo do `producao`: a mesa monta o PNG
-- no navegador, e o canvas recusa imagem sem CORS. O que mora aqui é fundo
-- de post que vai para o feed público de qualquer jeito.
insert into storage.buckets (id, name, public)
values ('marketing', 'marketing', true)
on conflict (id) do update set public = true;

drop policy if exists mkt_fundos_leitura on storage.objects;
create policy mkt_fundos_leitura on storage.objects
  for select to public
  using (bucket_id = 'marketing');

drop policy if exists mkt_fundos_escrita on storage.objects;
create policy mkt_fundos_escrita on storage.objects
  for insert to authenticated
  with check (bucket_id = 'marketing');

drop policy if exists mkt_fundos_troca on storage.objects;
create policy mkt_fundos_troca on storage.objects
  for update to authenticated
  using (bucket_id = 'marketing');

drop policy if exists mkt_fundos_faxina on storage.objects;
create policy mkt_fundos_faxina on storage.objects
  for delete to authenticated
  using (bucket_id = 'marketing');


-- ============================================================
-- 6. MIGRAÇÃO (30/09, a virada para conteúdo de valor)
-- ------------------------------------------------------------
-- O Rafael leu a primeira versão e disse que o conteúdo estava engessado
-- em "vitrine e preço": o feed precisa ensinar, mostrar bastidor e opinar,
-- e a venda é a minoria (80% valor, 20% venda). E o design tem que ser dele,
-- num editor, e não só aprovado.
--
--   pilar   o tipo de VALOR da peça (tendência, conceito, comparação,
--           curadoria, bastidor, opinião, case) ou 'oferta'. É ele, e não
--           o código T1..F3, que decide se a oferta entra no prompt.
--   estilo  a direção visual da peça inteira: { familia, veu, grao }.
--           O fundo continua em `fundo`; o que muda por slide mora no
--           próprio slide.
-- ============================================================
alter table public.mkt_pecas add column if not exists pilar text;
alter table public.mkt_pecas add column if not exists estilo jsonb not null default '{}'::jsonb;
