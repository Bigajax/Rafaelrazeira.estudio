-- ═══ OS CRIATIVOS DO ESTÚDIO NO PERFORMANCE (19/10/2026) ═══
--
-- A fase 1 do docs/plano-performance-criativos.md: o que a Meta diz de cada
-- anúncio do estúdio, por dia. Quem grava é o scripts/ler-meta.ts --gravar
-- (Marketing API, usuário do sistema leitor-crm, só ads_read); a subaba
-- /crm/performance/criativos só lê.
--
-- É do ESTÚDIO, não das lojas: prefixo ads_, longe do perf_, e nenhuma função
-- da vitrine lê daqui.
--
-- Rodar no SQL Editor do Supabase do ESTÚDIO. Reexecutável.

-- ---------- a conta: o retrato da última leitura ----------
-- Uma linha por conta. Existe para o aviso que faltou em setembro: a conta
-- parou de gastar em 28/09 e ninguém viu por três semanas.
create table if not exists public.ads_conta (
  owner_id uuid not null,
  conta_id text not null,                 -- act_1263674748563404
  nome text,
  status int,                             -- account_status da Meta: 1 = ativa
  motivo int,                             -- disable_reason: 0 = nenhum
  moeda text,
  gasto_vida numeric(12,2),
  ultimo_gasto_em date,                   -- o último dia (BRT) com gasto > 0
  lido_em timestamptz not null default now(),
  primary key (owner_id, conta_id)
);

-- ---------- os anúncios: quem é quem ----------
-- O nome muda, o ad_id não. O utm_content sai do link do criativo e é a chave
-- que amarra Meta, Mixpanel, lead e venda (fase 2). Nunca mapear por nome sem
-- o conjunto: o mesmo nome já existiu em três conjuntos (11/08).
create table if not exists public.ads_anuncios (
  owner_id uuid not null,
  ad_id text not null,
  nome text not null,
  status text,                            -- effective_status: ACTIVE, PAUSED, ...
  conjunto_id text,
  conjunto text,
  campanha_id text,
  campanha text,
  utm_content text,                       -- null quando o link não tem
  destino text,                           -- o caminho da página, sem a query
  criado_na_meta timestamptz,
  lido_em timestamptz not null default now(),
  primary key (owner_id, ad_id)
);

create index if not exists ads_anuncios_utm on public.ads_anuncios (owner_id, utm_content);

-- ---------- o que a Meta diz, por anúncio e por dia ----------
-- O dia é o da conta (America/Sao_Paulo), nunca UTC: em 14/08 o fuso do
-- Mixpanel inverteu uma conclusão. As ações cruas ficam em `acoes` para
-- nenhuma métrica nova exigir leitura de novo.
create table if not exists public.ads_meta_dia (
  owner_id uuid not null,
  ad_id text not null,
  dia date not null,
  gasto numeric(12,2) not null default 0,
  impressoes int not null default 0,
  alcance int not null default 0,
  plays_3s int not null default 0,        -- o hook rate é plays_3s / impressoes
  thruplay int not null default 0,        -- o hold rate é thruplay / impressoes
  p25 int not null default 0,
  p50 int not null default 0,
  p75 int not null default 0,
  p100 int not null default 0,
  cliques_link int not null default 0,
  lpv int not null default 0,             -- visualização da página de destino
  formularios int not null default 0,     -- Contact ("Vitrine: formulário enviado")
  checkouts int not null default 0,       -- InitiateCheckout (o toque em pagar da v4)
  compras int not null default 0,         -- Purchase
  acoes jsonb,
  lido_em timestamptz not null default now(),
  primary key (owner_id, ad_id, dia)
);

create index if not exists ads_meta_dia_periodo on public.ads_meta_dia (owner_id, dia desc);

-- ---------- quem lê e quem grava ----------
-- O dono do CRM lê o que é dele. Ninguém logado escreve: o script grava com a
-- chave de serviço, que passa por cima do RLS.
alter table public.ads_conta enable row level security;
alter table public.ads_anuncios enable row level security;
alter table public.ads_meta_dia enable row level security;

drop policy if exists ads_conta_le on public.ads_conta;
create policy ads_conta_le on public.ads_conta for select to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists ads_anuncios_le on public.ads_anuncios;
create policy ads_anuncios_le on public.ads_anuncios for select to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists ads_meta_dia_le on public.ads_meta_dia;
create policy ads_meta_dia_le on public.ads_meta_dia for select to authenticated
  using (owner_id = (select auth.uid()));

revoke insert, update, delete on public.ads_conta, public.ads_anuncios, public.ads_meta_dia from anon, authenticated;
revoke select on public.ads_conta, public.ads_anuncios, public.ads_meta_dia from anon;

-- ═══ FASE 2 (19/10/2026): a página, pelo Mixpanel ═══
-- O que aconteceu na página com quem veio de cada criativo, por dia (BRT) e
-- por página. Só visitante real (a mesma régua do scripts/mixpanel-funil.mjs:
-- fora localhost, fora do Brasil, fora datacenter da Meta e fora Maringá).
-- Gravado já somado pelo scripts/ler-pagina.ts --gravar: nenhum visitante,
-- cidade ou URL entra no CRM. Basta rodar este arquivo inteiro de novo.
create table if not exists public.ads_pagina_dia (
  owner_id uuid not null,
  utm_content text not null,
  pagina text not null,                   -- vitrine-digital, vitrine-v4
  dia date not null,                      -- o dia da primeira visita, em BRT
  visitantes int not null default 0,
  interagiram int not null default 0,     -- tocaram, rolaram ou digitaram
  rolaram int not null default 0,         -- passaram da metade da página
  viram_oferta int not null default 0,
  comecaram int not null default 0,       -- tocaram no formulário ou em pagar
  enviaram int not null default 0,        -- enviaram o formulário
  lido_em timestamptz not null default now(),
  primary key (owner_id, utm_content, pagina, dia)
);

alter table public.ads_pagina_dia enable row level security;
drop policy if exists ads_pagina_dia_le on public.ads_pagina_dia;
create policy ads_pagina_dia_le on public.ads_pagina_dia for select to authenticated
  using (owner_id = (select auth.uid()));
revoke insert, update, delete on public.ads_pagina_dia from anon, authenticated;
revoke select on public.ads_pagina_dia from anon;

-- ═══ FASE 3 (19/10/2026): a ficha do criativo ═══

-- A curva de retenção segundo a segundo (video_play_curve_actions da Meta:
-- de 0 a 15 s, um ponto por segundo; depois 15-20, 20-25, 25-30, 30-40,
-- 40-50 e 50-60) e a faixa de quadros do vídeo, um por segundo, em JPEG
-- pequeno. Gravadas pelo scripts/ler-curvas.ts --gravar. A faixa é
-- data URI de propósito: uns 60 KB por anúncio, sem bucket nem URL assinada.
create table if not exists public.ads_curvas (
  owner_id uuid not null,
  ad_id text not null,
  curva jsonb not null,                   -- [100, 70, 37, 26, ...] em %
  duracao numeric(8,2),                   -- segundos do vídeo
  folha text,                             -- data:image/jpeg;base64,... (1 quadro por segundo)
  lido_em timestamptz not null default now(),
  primary key (owner_id, ad_id)
);

alter table public.ads_curvas enable row level security;
drop policy if exists ads_curvas_le on public.ads_curvas;
create policy ads_curvas_le on public.ads_curvas for select to authenticated
  using (owner_id = (select auth.uid()));
revoke insert, update, delete on public.ads_curvas from anon, authenticated;
revoke select on public.ads_curvas from anon;

-- O que o Rafael anota na ficha: quanto custou fazer, o projeto do AI Studio
-- que fez o vídeo (o custo em dólar soma sozinho) e as decisões com data.
-- A chave é a do criativo (o utm_content, ou "nome:<anúncio>" sem utm).
create table if not exists public.ads_criativos (
  owner_id uuid not null default auth.uid(),
  chave text not null,
  custo_producao numeric(12,2),           -- em reais, o que não passou pelo AI Studio
  ai_projeto_id uuid references public.ai_projetos(id) on delete set null,
  decisoes jsonb not null default '[]'::jsonb,   -- [{ "quando": "2026-10-19", "texto": "..." }]
  updated_at timestamptz not null default now(),
  primary key (owner_id, chave)
);

alter table public.ads_criativos enable row level security;
drop policy if exists ads_criativos_dono on public.ads_criativos;
create policy ads_criativos_dono on public.ads_criativos for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
revoke all on public.ads_criativos from anon;
