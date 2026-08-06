-- ============================================================
-- TABELA leads — o formulário de diagnóstico da /e-commerce
-- Cole este script inteiro em: Supabase → SQL Editor → Run
-- ============================================================
-- POR QUE ELA EXISTE, e por que não é a `briefings`:
--
-- A `briefings` recebe o formulário da landing e é escrita pelo NAVEGADOR,
-- com a chave publicável e uma policy de insert para `anon`. Funciona, mas
-- significa que a chave de escrita está no código que qualquer pessoa lê.
--
-- Esta aqui é escrita SÓ pelo servidor (/api/lead, com a service role key),
-- e por isso não tem policy nenhuma para `anon`: com o RLS ligado e sem
-- policy, ninguém escreve nem lê pelo lado do cliente, aconteça o que
-- acontecer com a chave publicável. Você lê pelo painel do Supabase, logado.
--
-- O motivo do formulário inteiro mudar: até 06/08 o lead só existia se a
-- pessoa completasse o handoff para o WhatsApp E tocasse em enviar lá. Quem
-- desistia no meio sumia sem deixar rastro, e no navegador interno do
-- Instagram o handoff falhava sozinho. Agora o dado é salvo primeiro e a
-- conversa é consequência.
-- ============================================================

create table if not exists public.leads (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),

  -- de onde veio: "e-commerce" hoje, "vitrine-digital" quando ela entrar.
  -- É o mesmo vocabulário da propriedade `page` da Mixpanel, de propósito:
  -- assim dá para cruzar a tabela com o funil sem tabela de-para na cabeça.
  pagina       text not null,

  -- contato (etapa 2 do formulário)
  nome         text not null,
  whatsapp     text not null,
  canal        text,          -- instagram ou site da loja
  empresa      text,

  -- a operação (etapa 1 do formulário)
  vende        text,
  produtos     text,          -- faixa: "Até 20", "20 a 100", ...
  site         text,          -- "Não tenho", "Tenho site institucional", ...
  necessidade  text,
  investimento text,

  -- de qual campanha veio. Guardadas como colunas e não como json para
  -- poderem ser filtradas direto na interface do Supabase.
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  utm_content  text,
  utm_term     text,

  -- rastro da sessão: a URL exata (com a query da campanha), de onde a pessoa
  -- chegou, e as duas chaves que amarram esta linha aos painéis.
  url          text,
  referrer     text,
  ref          text,          -- external_id do Pixel/CAPI: liga o lead ao evento na Meta
  distinct_id  text,          -- mp_distinct_id: liga o lead à sessão na Mixpanel

  -- operacional: sem isto a tabela vira uma caixa de entrada sem "lido".
  -- O fluxo novo promete "te chamo no WhatsApp", então precisa dar para saber
  -- quem já foi chamado.
  status       text not null default 'novo'
);

-- created_at desc é o único jeito que esta tabela vai ser lida na prática
create index if not exists leads_created_at_idx on public.leads (created_at desc);

-- ============================================================
-- RLS ligado e NENHUMA policy: o acesso anônimo fica trancado por completo.
-- A service role key usada por /api/lead ignora o RLS por definição, então o
-- servidor escreve normalmente. Não crie policy para `anon` aqui: seria
-- desfazer justamente o que separa esta tabela da `briefings`.
-- ============================================================
alter table public.leads enable row level security;

-- ============================================================
-- ⚠️ MIGRAÇÃO (06/08/2026) — a /vitrine-digital entrou na captura.
-- Rode este bloco ANTES de publicar, senão todo envio da vitrine cai no
-- fallback (o Postgres recusa a coluna inexistente e a rota devolve 502).
--
-- `plano` é a escolha de pagamento do formulário de lá ("Entrada de R$500" ou
-- "À vista R$999"). Não existe na /e-commerce, que não tem preço fixo, e por
-- isso chega nula naqueles leads.
-- ============================================================
alter table public.leads add column if not exists plano text;
