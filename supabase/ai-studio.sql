-- ============================================================
-- AI STUDIO: os vídeos e as imagens gerados pelo OpenRouter, os projetos e as
-- sequências
-- Cole este arquivo inteiro em: Supabase → SQL Editor → Run.
-- Idempotente: rodar duas vezes não quebra nem duplica nada.
-- Depende do crm.sql (a função crm_relogio).
-- ============================================================
--
-- POR QUE EXISTE (13/10/2026)
--
-- O AI Studio (/crm/ai-studio) gera vídeo (Veo 3.1, Seedance) e imagem
-- (GPT Image, Nano Banana Pro) pelo OpenRouter. Cada imagem gerada é uma
-- linha em `ai_imagens`, cada vídeo uma linha em `ai_videos`. A de imagem faz três
-- trabalhos de uma vez: a galeria, o histórico de versões (pelo `pai_id` e
-- pelo `raiz_id`) e o consumo do mês (pelo `custo_usd`).
--
-- APAGAR NÃO APAGA A LINHA. Excluir uma imagem remove os arquivos do bucket
-- e marca `apagada_em`; a linha fica, porque o custo dela já foi pago. Se a
-- linha sumisse, o "Consumo de IA" do mês mentiria para baixo, e o limite
-- mensal poderia ser contornado apagando imagens.
--
-- O BUCKET É PRIVADO, ao contrário de `marketing` e `producao`. Ali mora
-- fundo de post que vai para o feed de qualquer jeito; aqui mora conceito
-- de campanha de cliente e foto de produto que ainda não saiu. A tela
-- recebe signed URL de 1 hora, gerada no servidor a cada carregamento, e
-- cada dono só lê a própria pasta (`<auth.uid()>/...`).
-- ============================================================


-- ============================================================
-- 1. OS PROJETOS
-- ============================================================
create table if not exists public.ai_projetos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 120),
  descricao text,
  -- a imagem de capa; a FK entra no fim, porque ai_imagens ainda não existe
  capa_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists ai_projetos_relogio on public.ai_projetos;
create trigger ai_projetos_relogio
  before update on public.ai_projetos
  for each row execute function public.crm_relogio();


-- ============================================================
-- 2. OS QUADROS DA SEQUÊNCIA
--
-- Um quadro é um lugar na timeline, não uma imagem: ele aponta para a
-- versão atual (`imagem_id`), e as versões anteriores são as imagens com o
-- mesmo `quadro_id`. Trocar a versão é trocar o ponteiro, sem gerar nada.
-- ============================================================
create table if not exists public.ai_quadros (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  projeto_id uuid not null references public.ai_projetos(id) on delete cascade,
  ordem integer not null default 0,
  nome text not null default '' check (char_length(nome) <= 120),
  imagem_id uuid,
  created_at timestamptz not null default now()
);


-- ============================================================
-- 3. AS IMAGENS (e o consumo)
-- ============================================================
create table if not exists public.ai_imagens (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,

  -- a trava contra o envio duplicado: o navegador manda uma chave por
  -- clique, e o índice único abaixo recusa a segunda chegada da mesma
  chave uuid,

  projeto_id uuid references public.ai_projetos(id) on delete set null,
  quadro_id uuid references public.ai_quadros(id) on delete set null,
  -- a versão anterior (a imagem que entrou na edição) e a primeira da linha
  pai_id uuid references public.ai_imagens(id) on delete set null,
  raiz_id uuid references public.ai_imagens(id) on delete set null,

  origem text not null check (origem in ('criar', 'editar', 'variacao', 'quadro', 'upload')),
  prompt text not null default '',
  -- o que foi de fato enviado: o prompt com as funções das referências e o
  -- bloco de preservação montados por lib/ai-studio/prompt.ts
  prompt_final text,
  preservar text,

  modelo text,
  qualidade text,
  tamanho_pedido text,
  formato text,
  fundo text,
  -- as dimensões REAIS do arquivo, lidas depois de gerar
  largura integer,
  altura integer,

  -- [{ "caminho": "<uid>/ref/....webp", "funcao": "produto" }]
  referencias jsonb not null default '[]'::jsonb,

  caminho text,
  miniatura text,

  status text not null default 'gerando' check (status in ('gerando', 'pronta', 'falhou')),
  erro text,
  -- o objeto `usage` como a OpenAI devolveu, e o custo calculado dele pela
  -- tabela oficial (lib/ai-studio/precos.ts). É estimativa: a fatura real
  -- mora no painel da OpenAI.
  usage jsonb,
  custo_usd numeric(12, 6),
  duracao_ms integer,

  apagada_em timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists ai_imagens_chave
  on public.ai_imagens (owner_id, chave) where chave is not null;
create index if not exists ai_imagens_galeria
  on public.ai_imagens (owner_id, created_at desc);
create index if not exists ai_imagens_raiz on public.ai_imagens (owner_id, raiz_id);
create index if not exists ai_imagens_quadro on public.ai_imagens (owner_id, quadro_id);
create index if not exists ai_quadros_projeto on public.ai_quadros (owner_id, projeto_id, ordem);


-- ============================================================
-- 4. AS FKs CIRCULARES (projeto → capa, quadro → versão atual)
-- ============================================================
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ai_projetos_capa_fk') then
    alter table public.ai_projetos
      add constraint ai_projetos_capa_fk foreign key (capa_id)
      references public.ai_imagens(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ai_quadros_imagem_fk') then
    alter table public.ai_quadros
      add constraint ai_quadros_imagem_fk foreign key (imagem_id)
      references public.ai_imagens(id) on delete set null;
  end if;
end
$$;


-- ============================================================
-- 5. A CONFIGURAÇÃO: o limite mensal e o "confirmar antes de gerar"
--
-- O limite é do APP, conferido na rota antes de chamar a OpenAI. Ele não
-- substitui o limite de cobrança da conta da OpenAI, que é o único que a
-- OpenAI respeita.
-- ============================================================
create table if not exists public.ai_config (
  owner_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  limite_mensal_usd numeric(10, 2) check (limite_mensal_usd is null or limite_mensal_usd >= 0),
  confirmar_antes boolean not null default false,
  updated_at timestamptz not null default now()
);

drop trigger if exists ai_config_relogio on public.ai_config;
create trigger ai_config_relogio
  before update on public.ai_config
  for each row execute function public.crm_relogio();


-- ============================================================
-- 5b. OS VÍDEOS
--
-- O vídeo é ASSÍNCRONO no OpenRouter: o pedido devolve um `job_id` na hora
-- e o arquivo fica pronto de 30 s a vários minutos depois. A linha nasce
-- `pendente` com o job, a tela pergunta de tempos em tempos (a rota
-- /api/ai-studio/video/<id> consulta o OpenRouter), e quem vê o `completed`
-- primeiro marca `baixando`, baixa o MP4 para o bucket e marca `pronta`.
-- Fechar a aba não perde nada: a próxima visita retoma a consulta.
--
-- O custo aqui é o REAL: o OpenRouter devolve `usage.cost` em dólar.
-- ============================================================
create table if not exists public.ai_videos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  chave uuid,
  projeto_id uuid references public.ai_projetos(id) on delete set null,
  prompt text not null default '',
  prompt_final text,
  modelo text not null,
  resolucao text,
  proporcao text,
  duracao integer,
  audio boolean not null default true,
  -- as imagens que viraram primeiro e último quadro (ai_imagens)
  primeiro_id uuid references public.ai_imagens(id) on delete set null,
  ultimo_id uuid references public.ai_imagens(id) on delete set null,
  referencias jsonb not null default '[]'::jsonb,
  job_id text,
  status text not null default 'pendente'
    check (status in ('pendente', 'gerando', 'baixando', 'pronta', 'falhou')),
  erro text,
  caminho text,
  bytes bigint,
  custo_usd numeric(12, 6),
  estimativa_usd numeric(12, 6),
  baixando_em timestamptz,
  concluido_em timestamptz,
  apagada_em timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists ai_videos_chave
  on public.ai_videos (owner_id, chave) where chave is not null;
create index if not exists ai_videos_lista on public.ai_videos (owner_id, created_at desc);


-- ============================================================
-- 6. RLS: cada dono vê só o que é dele
-- ============================================================
alter table public.ai_videos enable row level security;
drop policy if exists ai_videos_dono on public.ai_videos;
create policy ai_videos_dono on public.ai_videos
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

alter table public.ai_projetos enable row level security;
drop policy if exists ai_projetos_dono on public.ai_projetos;
create policy ai_projetos_dono on public.ai_projetos
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

alter table public.ai_quadros enable row level security;
drop policy if exists ai_quadros_dono on public.ai_quadros;
create policy ai_quadros_dono on public.ai_quadros
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

alter table public.ai_imagens enable row level security;
drop policy if exists ai_imagens_dono on public.ai_imagens;
create policy ai_imagens_dono on public.ai_imagens
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

alter table public.ai_config enable row level security;
drop policy if exists ai_config_dono on public.ai_config;
create policy ai_config_dono on public.ai_config
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));


-- ============================================================
-- 7. O BUCKET PRIVADO
--
-- 500 MB por arquivo, porque um clipe 4K de 8 a 15 s passa fácil dos 50 MB.
-- ATENÇÃO: o Supabase tem um teto GLOBAL (Storage → Settings → Upload file
-- size limit, 50 MB no padrão) que vence o do bucket. Suba lá também.
-- Entram as três imagens e o MP4 que o OpenRouter devolve. A primeira pasta do caminho é
-- o uid do dono, e as policies conferem isso em toda operação: sem ela, o
-- "qualquer logado" voltava pela porta do storage (ver a armadilha
-- cadastro-aberto-qualquer-logado no cofre).
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ai-studio', 'ai-studio', false, 524288000, array['image/png', 'image/jpeg', 'image/webp', 'video/mp4'])
on conflict (id) do update
  set public = false,
      file_size_limit = 524288000,
      allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'video/mp4'];

drop policy if exists ai_studio_leitura on storage.objects;
create policy ai_studio_leitura on storage.objects
  for select to authenticated
  using (bucket_id = 'ai-studio' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists ai_studio_escrita on storage.objects;
create policy ai_studio_escrita on storage.objects
  for insert to authenticated
  with check (bucket_id = 'ai-studio' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists ai_studio_troca on storage.objects;
create policy ai_studio_troca on storage.objects
  for update to authenticated
  using (bucket_id = 'ai-studio' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists ai_studio_faxina on storage.objects;
create policy ai_studio_faxina on storage.objects
  for delete to authenticated
  using (bucket_id = 'ai-studio' and (storage.foldername(name))[1] = (select auth.uid())::text);
