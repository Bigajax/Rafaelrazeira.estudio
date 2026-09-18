-- ============================================================
-- PRODUÇÃO DE VITRINES — schema da oficina
-- Cole este arquivo inteiro em: Supabase → SQL Editor → Run.
-- Ele é idempotente: rodar duas vezes não quebra nem duplica nada.
-- ============================================================
--
-- POR QUE `prod_` E NÃO DENTRO DO CRM
--
-- O CRM responde "com quem eu falo hoje". Esta parte responde "o que eu
-- monto hoje", e as duas vidas têm ritmos diferentes: um lead vive semanas
-- e some; uma loja colhida vive enquanto a marca existir, e pode ser
-- recolhida seis meses depois sem nada a ver com o funil.
--
-- Elas se encontram numa coluna só: `prod_lojas.lead_id`. Ela é opcional de
-- propósito. Nem toda loja que você desenha veio do funil (a Sölo Urb é
-- projeto seu), e um lead apagado não pode levar junto o catálogo de uma
-- loja que já está no ar. Por isso `on delete set null`, e não cascade.
--
-- ------------------------------------------------------------
-- O QUE ESTE SCHEMA NÃO É
--
-- Ele não é o banco da loja do cliente. A loja contratada continua com o
-- Supabase dela, duplicado como sempre. Aqui mora a MATÉRIA-PRIMA: o que
-- foi colhido do Instagram, o catálogo lido das legendas e a ficha de
-- identidade. O que sai daqui é exportação (CSV, SQL de insert e o JSON da
-- marca), não o dado de produção da loja.
--
-- É a mesma regra de RLS do CRM: toda tabela tem `owner_id`, toda policy
-- compara com `auth.uid()`, e a chave anônima sozinha não abre nada.
-- ============================================================


-- ============================================================
-- 1. LOJAS
-- ============================================================
create table if not exists public.prod_lojas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,

  -- O elo com o funil. Opcional: ver a nota no cabeçalho.
  lead_id uuid references public.crm_leads(id) on delete set null,

  -- Sempre SEM o "@" e em minúsculas. É a chave humana desta tabela, e o
  -- índice único lá embaixo só funciona como trava se a forma armazenada
  -- for uma só: "@UseKanton", "usekanton" e "instagram.com/usekanton"
  -- precisam colidir.
  arroba text not null,

  -- Tudo daqui para baixo é COLHIDO, não digitado. Fica gravado porque a
  -- Business Discovery tem teto de 200 consultas por hora: recolher para
  -- reler a bio seria gastar cota com o que já se sabe.
  nome text,
  bio text,
  site text,
  seguidores integer,
  publicacoes integer,
  avatar text,

  -- A ficha da marca, o único bloco que é seu e não da API:
  --   { paleta: ["#111111", …], fundo: "claro"|"escuro", tipografia: "…",
  --     observacoes: "…" }
  -- jsonb e não colunas porque esta ficha ainda vai mudar de forma umas
  -- cinco vezes, e cada mudança seria uma migração numa tabela de uma
  -- pessoa só.
  identidade jsonb not null default '{}'::jsonb,

  -- 'nova'      criada, nada colhido ainda
  -- 'colhendo'  a rota está rodando (é o que a tela lê para mostrar a régua)
  -- 'colhida'   imagens e legendas no lugar, catálogo ainda não lido
  -- 'catalogo'  o modelo já leu as legendas e virou produto
  -- 'pronta'    você revisou e exportou
  -- 'erro'      a última colheita falhou; a frase fica em `nota`
  status text not null default 'nova'
    check (status in ('nova','colhendo','colhida','catalogo','pronta','erro')),
  nota text,

  colhido_em timestamptz,
  criado_em timestamptz not null default now()
);

-- Duas lojas com o mesmo arroba são sempre a mesma loja colhida duas vezes.
create unique index if not exists prod_lojas_arroba_idx
  on public.prod_lojas (owner_id, lower(arroba));


-- ============================================================
-- 2. ATIVOS — o que veio do Instagram, cru
-- ============================================================
--
-- Uma linha por IMAGEM, não por post: um carrossel de cinco peças é o lugar
-- onde mais produto se esconde, e tratá-lo como uma mídia só jogaria fora
-- quatro. O filho ganha `media_id` com sufixo (`17900…_2`), que é o que
-- mantém a trava de duplicata funcionando na recolheita.
--
-- POR QUE O ARQUIVO É BAIXADO, E NÃO SÓ APONTADO: a `media_url` da Graph
-- API é uma URL assinada do CDN da Meta e expira em poucos dias. Uma prévia
-- montada em cima dela funcionaria na demonstração e apareceria quebrada na
-- semana seguinte, que é exatamente quando o cliente decide.
create table if not exists public.prod_ativos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  loja_id uuid not null references public.prod_lojas(id) on delete cascade,

  media_id text not null,
  ordem integer not null default 0,          -- cronológica, do post mais novo para o mais velho
  tipo text,                                 -- IMAGE, CAROUSEL_ALBUM, VIDEO
  caminho text not null,                     -- caminho no bucket `producao`
  legenda text,
  permalink text,
  publicado_em timestamptz,
  criado_em timestamptz not null default now()
);

create unique index if not exists prod_ativos_media_idx
  on public.prod_ativos (loja_id, media_id);

create index if not exists prod_ativos_loja_idx
  on public.prod_ativos (loja_id, ordem);


-- ============================================================
-- 3. PRODUTOS — a legenda depois de virar catálogo
-- ============================================================
--
-- `revisado` é a coluna mais importante da tabela e a mais fácil de achar
-- que é enfeite. O modelo lê sessenta legendas e acerta a maioria; o que
-- ele erra, erra em silêncio (preço de parcela lido como preço à vista é o
-- caso clássico). Sem uma marca de "eu conferi", não existe diferença
-- visível entre o produto que você leu e o que ninguém leu, e o catálogo
-- inteiro passa a valer o que vale o pior item dele.
create table if not exists public.prod_produtos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  loja_id uuid not null references public.prod_lojas(id) on delete cascade,

  -- De qual imagem este produto saiu. `set null` porque apagar uma foto do
  -- material colhido não pode apagar o produto que você já corrigiu à mão.
  ativo_id uuid references public.prod_ativos(id) on delete set null,

  ordem integer not null default 0,
  nome text not null,

  -- numeric e não centavos inteiros, ao contrário do financeiro do CRM: ali
  -- o valor vira parcela e soma de recebimento, e centavo em float vira
  -- diferença de um real no fim do mês. Aqui o número é vitrine, entra
  -- editado por você e sai formatado; a precisão exata não decide nada.
  preco numeric,
  preco_de numeric,                          -- o preço riscado, quando a legenda anuncia desconto

  -- Texto solto ("P, M, G" ou "36 ao 40") e não array: é assim que a
  -- legenda escreve e é assim que você corrige, num campo só.
  tamanhos text,
  categoria text,
  descricao text,

  revisado boolean not null default false,
  criado_em timestamptz not null default now()
);

create index if not exists prod_produtos_loja_idx
  on public.prod_produtos (loja_id, ordem);


-- ============================================================
-- 4. RLS — a mesma regra do CRM, palavra por palavra
-- ============================================================
alter table public.prod_lojas    enable row level security;
alter table public.prod_ativos   enable row level security;
alter table public.prod_produtos enable row level security;

drop policy if exists prod_lojas_dono on public.prod_lojas;
create policy prod_lojas_dono on public.prod_lojas
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists prod_ativos_dono on public.prod_ativos;
create policy prod_ativos_dono on public.prod_ativos
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists prod_produtos_dono on public.prod_produtos;
create policy prod_produtos_dono on public.prod_produtos
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));


-- ============================================================
-- 5. O BUCKET DAS IMAGENS
-- ============================================================
--
-- PÚBLICO PARA LEITURA, e isso é decisão, não descuido. Três coisas
-- dependem disso: a miniatura na tabela de produtos, a leitura da paleta no
-- navegador (o `<canvas>` recusa imagem sem CORS, e o Storage público
-- responde com CORS aberto) e a prévia que um dia vai ser mandada para o
-- cliente. O que mora aqui é foto que a loja publicou no Instagram para o
-- mundo inteiro ver.
--
-- ESCRITA SÓ AUTENTICADA: o caminho é `<loja_id>/<media_id>.jpg`, e quem
-- grava é a rota de colheita com a sua sessão.
insert into storage.buckets (id, name, public)
values ('producao', 'producao', true)
on conflict (id) do update set public = true;

drop policy if exists prod_ativos_leitura on storage.objects;
create policy prod_ativos_leitura on storage.objects
  for select to public
  using (bucket_id = 'producao');

drop policy if exists prod_ativos_escrita on storage.objects;
create policy prod_ativos_escrita on storage.objects
  for insert to authenticated
  with check (bucket_id = 'producao');

drop policy if exists prod_ativos_troca on storage.objects;
create policy prod_ativos_troca on storage.objects
  for update to authenticated
  using (bucket_id = 'producao');

drop policy if exists prod_ativos_faxina on storage.objects;
create policy prod_ativos_faxina on storage.objects
  for delete to authenticated
  using (bucket_id = 'producao');


-- ============================================================
-- 6. MIGRAÇÕES (26/08, depois do primeiro teste real)
-- ------------------------------------------------------------
-- Rodar de novo o arquivo inteiro é seguro: tudo aqui é `if not exists`.
-- ============================================================

-- ---------- O ENGAJAMENTO DE CADA POST ----------
-- A Business Discovery já devolvia curtidas e comentários na mesma chamada,
-- e a gente simplesmente não pedia. Eles não são vaidade: são a única
-- medida de qual peça o público DESTA loja já validou, e é por eles que o
-- catálogo passa a ser ordenado. Uma vitrine que abre pela peça de 300
-- curtidas vende melhor que uma que abre pelo post de ontem.
--
-- Nulo é "não sei", não "zero": post antigo pode vir sem o número, e um
-- zero inventado jogaria a peça para o fim da fila sem motivo.
alter table public.prod_ativos add column if not exists curtidas integer;
alter table public.prod_ativos add column if not exists comentarios integer;

-- ---------- A LOJA FÍSICA, PELO GOOGLE ----------
-- { endereco, horario: [...], telefone, nota, avaliacoes, maps, place_id }
--
-- Vem do Places com a chave que o garimpo já usa. É o que preenche a seção
-- "a loja" da vitrine (endereço, horário, rota) e, principalmente, a prova
-- social: nota e número de avaliações do Google são a única prova que a
-- concorrência não consegue fabricar.
--
-- jsonb porque este bloco é ESTRANGEIRO: a forma dele é a do Google, não a
-- minha, e no dia em que a API mudar um campo eu não quero uma migração.
alter table public.prod_lojas add column if not exists lugar jsonb;

-- ---------- AS CONDIÇÕES COMERCIAIS ----------
-- { frete, pagamento, retirada, troca }
--
-- Estas quatro aparecem no TOPO de toda vitrine e mudam a decisão de
-- compra, e nenhuma delas está no Instagram: só o dono da loja sabe. Ficam
-- aqui para serem perguntadas UMA vez e nunca mais, em vez de descobertas
-- no meio da conversa e digitadas direto na página.
alter table public.prod_lojas add column if not exists condicoes jsonb;


-- ============================================================
-- 7. MIGRAÇÕES (26/08, segunda leva)
-- ============================================================

-- ---------- AS FOTOS EXTRAS DA MESMA PEÇA ----------
-- Um carrossel vira quatro imagens da MESMA peça, e loja pequena reposta o
-- mesmo tênis três vezes. Sem agrupamento, isso vira quatro produtos e você
-- apaga três na mão, toda vez.
--
-- Agora a leitura por visão diz quais fotos são a mesma peça: uma vira o
-- produto e as outras viram as fotos extras dele, que é o que a vitrine usa
-- na página do produto. Guarda ids de `prod_ativos`, não URLs: a URL é
-- derivada do caminho e mudaria junto se o bucket mudasse de nome.
alter table public.prod_produtos add column if not exists fotos_extras jsonb;

-- ---------- O QUE TEM NO LINK DA BIO ----------
-- Quando a loja já tem linktree ou um site antigo, é ali que costumam estar
-- a tabela de preços, o catálogo e as condições de entrega. O CRM já sabe
-- ler esse link (`colherLinkDaBio`), e o texto colhido entra no briefing
-- como "o que a loja já publica hoje".
alter table public.prod_lojas add column if not exists link_bio text;

-- ---------- MARCA E COR, que a foto entrega e a legenda não ----------
-- A leitura por visão devolve "Adidas" e "creme" olhando o produto. As duas
-- viram coisa na vitrine: a marca vira a faixa de marcas parceiras (que a
-- concorrência não tem como preencher sem digitar), e a cor vira filtro e
-- nome de variação.
--
-- Colunas de verdade, e não um campo dentro do nome: no dia em que a
-- vitrine quiser agrupar por marca, agrupar por coluna é uma linha de SQL e
-- agrupar por pedaço de texto é uma heurística.
alter table public.prod_produtos add column if not exists marca text;
alter table public.prod_produtos add column if not exists cor text;

-- ---------- O CONCEITO DA MARCA ----------
-- { personalidade: [...], autoridade: [...], publico, promessa, evitar }
--
-- É o que separa uma vitrine com posicionamento de um catálogo bonito. Nada
-- disso está no Instagram nem sai de API: metade você sabe da conversa,
-- metade se DEDUZ do que já foi colhido (a nota do Google, as marcas que
-- aparecem nas fotos, a cidade da bio).
--
-- Vai inteiro para o briefing, e é o bloco que impede o gerador de escrever
-- "descubra a excelência em calçados femininos" numa loja que fala "corre
-- que tem pouquinho".
alter table public.prod_lojas add column if not exists conceito jsonb;


-- ============================================================
-- 8. A FORMA E OS PROMPTS (27/08)
-- ============================================================

-- ---------- A FORMA ----------
-- { volume, faixa, foto, variacao[], preco, clique, categorias, n_categorias,
--   esgotado, layout, origem: { campo: 'inferido' | 'confirmado' } }
--
-- Marca diz a cor, conceito diz a voz, e nada dizia a ESTRUTURA. Estes
-- campos não são gosto: o catálogo os determina. Sessenta peças com foto
-- quadrada e numeração pedem uma página; oito peças de corpo inteiro pedem
-- outra, e a diferença não é de estilo, é de o que cabe na tela.
--
-- `origem` guarda, campo a campo, se o valor foi INFERIDO da leitura ou
-- CONFIRMADO por você. É a coluna mais importante do bloco: sem ela, um
-- palpite do sistema e uma decisão sua ficam com a mesma cara, e a decisão
-- some no meio do palpite.
alter table public.prod_lojas add column if not exists forma jsonb;

-- ---------- OS PROMPTS GERADOS ----------
-- Tabela, e não um array na loja: cada geração guarda o markdown inteiro
-- mais o retrato da ficha naquele instante, e isso engorda depressa. Numa
-- coluna da loja, abrir a ficha carregaria cinco prompts inteiros que
-- ninguém pediu.
--
-- A listagem da ficha lê só `id` e `criado_em`; o markdown é buscado quando
-- você clica em copiar.
create table if not exists public.prod_prompts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  loja_id uuid not null references public.prod_lojas(id) on delete cascade,

  markdown text not null,
  -- O retrato da ficha no momento da geração. É o que permite entender, um
  -- mês depois, por que aquele prompt dizia o que dizia: a ficha mudou, o
  -- prompt antigo não.
  snapshot jsonb,
  -- 'previa', 'completa' ou 'ajuste' (ver o bloco 10): o mesmo catálogo gera artefatos diferentes,
  -- e confundir os dois é entregar site pronto de graça.
  modo text not null default 'previa' check (modo in ('previa','completa','ajuste')),

  criado_em timestamptz not null default now()
);

create index if not exists prod_prompts_loja_idx
  on public.prod_prompts (loja_id, criado_em desc);

alter table public.prod_prompts enable row level security;

drop policy if exists prod_prompts_dono on public.prod_prompts;
create policy prod_prompts_dono on public.prod_prompts
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));


-- ============================================================
-- 9. AS PEÇAS ESCOLHIDAS (27/08)
-- ============================================================
-- O compilador mandava o agente usar "as de melhor foto". Isso não é
-- instrução: é um adjetivo. Quem lê pega as primeiras da lista, que são as
-- primeiras do feed, que não têm relação nenhuma com qual foto aguenta
-- aparecer a 800px de largura na primeira tela.
--
-- A escolha é sua, feita olhando as miniaturas, e ela decide duas coisas ao
-- mesmo tempo: quais peças entram no hero e quais são as doze da prévia.
alter table public.prod_produtos add column if not exists destaque boolean not null default false;

-- A ORDEM da escolha, que é a ordem em que as peças aparecem no hero. Ela
-- não pode ser a ordem do catálogo: a primeira foto que a pessoa vê é a
-- decisão mais cara da página, e ela quase nunca é a primeira do feed.
--
-- Nulo quer dizer "estrelada, mas ainda não posicionada": entra no fim.
alter table public.prod_produtos add column if not exists ordem_destaque int;

-- O índice serve à tira de escolhidas, que é lida a cada abertura da ficha.
create index if not exists prod_produtos_destaque_idx
  on public.prod_produtos (loja_id, ordem_destaque)
  where destaque;


-- ============================================================
-- 10. O AJUSTE (18/09)
-- ============================================================
-- Terceiro modo do prompt. Ele não constrói: muda uma vitrine que já está
-- no ar (o link do Instagram, um texto, o hero conforme as estrelas da
-- oficina) e repete as travas comerciais da prévia para elas não caírem
-- na passagem. A versão guarda o modo para a lista da ficha dizer o que
-- cada geração foi.
alter table public.prod_prompts drop constraint if exists prod_prompts_modo_check;
alter table public.prod_prompts
  add constraint prod_prompts_modo_check check (modo in ('previa','completa','ajuste'));
