-- ============================================================
-- 01/10/2026: O LEITOR DO WHATSAPP (etapa 1 do plano crm-leitor-whatsapp)
--
-- O scripts/whatsapp-leitor.mts fica ligado ao número do estúdio como
-- aparelho conectado e SÓ LÊ. Cada mensagem trocada com um número que já é
-- lead vira uma linha em crm_mensagens; conversa com quem não é lead nunca
-- chega aqui.
--
-- crm_interacoes continua sendo o TOQUE, e um toque é uma vez de falar:
-- três bolhas seguidas da loja são uma entrada só, não três. Se cada bolha
-- virasse um toque, duas mensagens minhas seguidas contariam como "dois
-- retornos sem resposta" na escada do silêncio. Por isso a bolha mora aqui
-- e aponta para o toque em que ela entrou (interacao_id).
--
-- `fonte` marca o toque que o leitor criou ('whatsapp'); os registrados à
-- mão pelo modal ficam com null. É o que deixa o leitor reconhecer o toque
-- que o modal acabou de gravar e não criar um segundo.
--
-- Rodar uma vez no SQL Editor do Supabase.
-- ============================================================
alter table public.crm_interacoes add column if not exists fonte text;

create table if not exists public.crm_mensagens (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references public.crm_leads(id) on delete cascade,
  interacao_id uuid references public.crm_interacoes(id) on delete set null,
  -- O id da mensagem no WhatsApp: o leitor pode receber a mesma mensagem
  -- duas vezes (reconexão, mensagens offline), e a segunda é ignorada.
  wa_id text not null unique,
  direcao text not null check (direcao in ('saida','entrada')),
  -- 'texto', 'audio', 'foto', 'video', 'documento', 'figurinha', 'outro'
  tipo text not null default 'texto',
  texto text,
  enviada_em timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists crm_mensagens_lead_idx
  on public.crm_mensagens (lead_id, enviada_em desc);

alter table public.crm_mensagens enable row level security;

drop policy if exists crm_mensagens_dono on public.crm_mensagens;
create policy crm_mensagens_dono on public.crm_mensagens
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- A conferência: tem que sair a tabela e a coluna.
select 'crm_mensagens' as criado, count(*) as linhas from public.crm_mensagens
union all
select 'crm_interacoes.fonte', count(*) from information_schema.columns
 where table_schema = 'public' and table_name = 'crm_interacoes' and column_name = 'fonte';
