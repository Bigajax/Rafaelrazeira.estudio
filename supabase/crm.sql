-- ============================================================
-- CRM DE PROSPECÇÃO — schema completo
-- Cole este arquivo inteiro em: Supabase → SQL Editor → Run.
-- Ele é idempotente: rodar duas vezes não quebra nem duplica nada.
-- ============================================================
--
-- POR QUE TODA TABELA COMEÇA COM `crm_`
--
-- Já existe uma `public.leads` neste projeto: é a captura do site, escrita
-- pelo servidor em /api/lead, com colunas de formulário (pagina, vende,
-- produtos, investimento…) e sem policy nenhuma de RLS. Ela não é um lead de
-- pipeline, é um envio de formulário.
--
-- O CRM precisa de uma tabela de leads com outra vida: estágio, posição,
-- próximo passo, dono. Chamá-la de `leads` significaria migrar a tabela do
-- site ou perder o histórico dela. O prefixo evita as duas coisas e deixa
-- claro no painel do Supabase o que é captura e o que é operação.
--
-- As duas se encontram num lugar só: /api/lead grava a captura em `leads` e
-- em seguida joga o mesmo contato em `crm_leads` (regra 7 do escopo, "inbound
-- entra sozinho"). Ver a seção INBOUND no fim deste arquivo.
--
-- ------------------------------------------------------------
-- QUEM PODE LER O QUÊ
--
-- O CRM é de usuário único, mas o RLS é escrito como se não fosse: toda
-- tabela tem `owner_id` e toda policy compara com `auth.uid()`. Não é
-- burocracia. `anon` é a chave que vive no navegador, e sem policy por dono
-- qualquer pessoa com a chave publicável leria o pipeline inteiro do estúdio,
-- com telefone e ticket de cada cliente. O custo de escrever assim é uma
-- coluna; o custo de não escrever é a lista de clientes na rua.
-- ============================================================


-- ============================================================
-- 1. LEADS
-- ============================================================
create table if not exists public.crm_leads (
  id uuid primary key default gen_random_uuid(),

  -- `default auth.uid()` faz o dono se preencher sozinho quando a inserção
  -- vem do navegador logado. Quando vem do servidor (a rota /api/lead usa a
  -- service role key, que não tem usuário), o dono precisa ir explícito.
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,

  nome text not null,
  empresa text,
  instagram text,
  -- Guardado SÓ EM DÍGITOS ("44999997219"), nunca com máscara. É o que
  -- permite o índice único lá embaixo funcionar como trava de duplicata: o
  -- mesmo número digitado como "(44) 99999-7219" e como "44 99999 7219" tem
  -- que colidir, e só colide se a forma armazenada for uma só.
  whatsapp text,
  -- Guardado em minúsculas, pelo mesmo motivo.
  email text,
  nicho text,
  cidade text,

  tipo_projeto text check (tipo_projeto in ('vitrine','ecommerce','landing','site')),
  ticket_estimado numeric,

  origem text not null default 'prospeccao'
    check (origem in ('prospeccao','indicacao','trafego_pago','inbound','evento')),
  -- `set null` e não `cascade`: apagar quem indicou não pode levar junto o
  -- lead indicado, que é um negócio próprio e possivelmente já ganho.
  indicado_por uuid references public.crm_leads(id) on delete set null,

  estagio text not null default 'lista'
    check (estagio in ('lista','contatado','follow_up','conversa','proposta','negociacao','ganho','perdido')),
  -- numérica de propósito: reordenar por arrastar vira "média entre o vizinho
  -- de cima e o de baixo", uma linha alterada em vez da coluna inteira.
  posicao numeric not null default 1000,

  proximo_passo text,
  proxima_acao_em date,
  ultimo_toque_em timestamptz,
  entrou_no_estagio_em timestamptz not null default now(),

  motivo_perda text
    check (motivo_perda in ('preco','sem_resposta','timing','fechou_com_outro','fora_do_perfil','desistiu')),
  valor_fechado numeric,
  fechado_em date,

  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ============================================================
-- 2. INTERAÇÕES — a linha do tempo de toques
-- ============================================================
create table if not exists public.crm_interacoes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lead_id uuid not null references public.crm_leads(id) on delete cascade,
  canal text not null check (canal in ('whatsapp','instagram','ligacao','email','reuniao','proposta')),
  direcao text not null check (direcao in ('saida','entrada')),
  resumo text,
  created_at timestamptz not null default now()
);


-- ============================================================
-- 3. TEMPLATES DE MENSAGEM
-- ============================================================
create table if not exists public.crm_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  titulo text not null,
  canal text not null default 'whatsapp',
  categoria text
    check (categoria in ('abertura_fria','abertura_morna','follow_up','indicacao','objecao','proposta','reativacao')),
  conteudo text not null,
  ordem int not null default 0
);


-- ============================================================
-- 4. METAS
-- ============================================================
create table if not exists public.crm_metas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  toques_semana int not null default 50,
  atualizado_em timestamptz not null default now()
);

-- Uma linha de meta por dono. Sem isto, salvar a meta duas vezes cria duas
-- metas e a tela passa a mostrar a que o Postgres devolver primeiro.
create unique index if not exists crm_metas_owner_uniq on public.crm_metas (owner_id);


-- ============================================================
-- 5. TRIGGERS
-- ============================================================

-- ---------- 5.1 registrar toque atualiza o lead ----------
-- Regra 6 do escopo. Mora aqui e não no aplicativo porque `ultimo_toque_em`
-- é uma consequência mecânica de existir uma interação: qualquer caminho que
-- insira um toque (a tela, o botão de WhatsApp, a rota de inbound) tem que
-- deixar o lead consistente, e um trigger é o único lugar que garante isso
-- para os três de uma vez.
create or replace function public.crm_toque_no_lead()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.crm_leads
     set ultimo_toque_em = greatest(coalesce(ultimo_toque_em, new.created_at), new.created_at)
   where id = new.lead_id;
  return new;
end;
$$;

drop trigger if exists crm_interacoes_toque on public.crm_interacoes;
create trigger crm_interacoes_toque
  after insert on public.crm_interacoes
  for each row execute function public.crm_toque_no_lead();


-- ---------- 5.2 e 5.3 relógios do lead ----------
-- Os dois pedidos (resetar `entrou_no_estagio_em` na troca de estágio e tocar
-- `updated_at` em toda alteração) viram UM trigger BEFORE UPDATE de
-- propósito. Como dois triggers separados na mesma tabela e no mesmo evento,
-- a ordem de execução passa a ser a ordem alfabética do nome, que é uma
-- dependência invisível: basta alguém renomear um deles para o comportamento
-- mudar sem que nenhuma linha de lógica tenha sido tocada.
create or replace function public.crm_relogios_do_lead()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();

  -- `is distinct from` e não `<>`: estágio é not null hoje, mas `<>` devolve
  -- null (e não true) se um dos lados for nulo, e o reset simplesmente não
  -- aconteceria em silêncio.
  if new.estagio is distinct from old.estagio then
    new.entrou_no_estagio_em := now();
  end if;

  return new;
end;
$$;

drop trigger if exists crm_leads_relogios on public.crm_leads;
create trigger crm_leads_relogios
  before update on public.crm_leads
  for each row execute function public.crm_relogios_do_lead();


-- ============================================================
-- 6. ÍNDICES
--
-- Todos começam por `owner_id` porque o RLS injeta `owner_id = auth.uid()`
-- em TODA consulta: um índice em `(estagio, posicao)` sem o dono na frente
-- obriga o Postgres a filtrar o dono depois de varrer o índice.
-- ============================================================
create index if not exists crm_leads_quadro_idx
  on public.crm_leads (owner_id, estagio, posicao);

create index if not exists crm_leads_agenda_idx
  on public.crm_leads (owner_id, proxima_acao_em);

create index if not exists crm_interacoes_timeline_idx
  on public.crm_interacoes (lead_id, created_at desc);

-- ---------- as travas de duplicata ----------
-- Regra 7: "não duplicar: se já existir lead com mesmo whatsapp ou email".
-- A checagem também é feita no aplicativo, para dar mensagem decente, mas ela
-- é uma leitura seguida de uma escrita: dois formulários enviados no mesmo
-- segundo passam os dois pela checagem e criam os dois. O índice único é o
-- que fecha essa fresta, e o código trata o erro 23505 como "já existe".
-- Parcial (`where … <> ''`) porque lead sem telefone é comum e vários nulos
-- não colidem entre si, mas várias strings vazias colidiriam.
create unique index if not exists crm_leads_whatsapp_uniq
  on public.crm_leads (owner_id, whatsapp)
  where whatsapp is not null and whatsapp <> '';

create unique index if not exists crm_leads_email_uniq
  on public.crm_leads (owner_id, email)
  where email is not null and email <> '';


-- ============================================================
-- 7. RLS
-- ============================================================
alter table public.crm_leads      enable row level security;
alter table public.crm_interacoes enable row level security;
alter table public.crm_templates  enable row level security;
alter table public.crm_metas      enable row level security;

-- `for all` com `using` (o que dá para ler/alterar/apagar) e `with check`
-- (o que dá para gravar). Sem o `with check`, um usuário logado poderia
-- inserir uma linha com o owner_id de outra pessoa: passaria na escrita e
-- sumiria da própria tela, que é o pior dos dois mundos.
drop policy if exists crm_leads_dono on public.crm_leads;
create policy crm_leads_dono on public.crm_leads
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists crm_interacoes_dono on public.crm_interacoes;
create policy crm_interacoes_dono on public.crm_interacoes
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists crm_templates_dono on public.crm_templates;
create policy crm_templates_dono on public.crm_templates
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists crm_metas_dono on public.crm_metas;
create policy crm_metas_dono on public.crm_metas
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- Nenhuma policy para `anon`, em nenhuma das quatro: sem sessão, o banco não
-- devolve linha nenhuma, aconteça o que acontecer com o middleware.


-- ============================================================
-- 8. A VISÃO DO PAINEL
--
-- Três números que o card do lead precisa e que só a tabela de interações
-- sabe. Vêm de uma view e não de três consultas na tela porque o kanban
-- mostra até oito colunas de cards de uma vez: seriam centenas de idas ao
-- banco para desenhar uma tela.
--
-- `security_invoker = on` é o que mantém o RLS honesto: sem ele a view roda
-- com os poderes de quem a criou (você, o dono do projeto) e passaria por
-- cima das policies de todo mundo. Com ele, a view enxerga exatamente o que
-- quem consulta enxergaria.
-- ============================================================
create or replace view public.crm_leads_painel
with (security_invoker = on) as
select
  l.*,
  (select count(*) from public.crm_interacoes i where i.lead_id = l.id) as toques,
  (select count(*) from public.crm_interacoes i where i.lead_id = l.id and i.direcao = 'entrada') as toques_entrada,
  -- REGRA DOS 2 RETORNOS: quantas saídas existem DEPOIS da última entrada.
  -- Contar "saídas consecutivas no fim da lista" desse jeito é exato e cabe
  -- numa subconsulta: se nunca houve entrada, o `-infinity` faz a conta valer
  -- para o histórico inteiro.
  (select count(*)
     from public.crm_interacoes i
    where i.lead_id = l.id
      and i.direcao = 'saida'
      and i.created_at > coalesce(
            (select max(e.created_at) from public.crm_interacoes e
              where e.lead_id = l.id and e.direcao = 'entrada'),
            '-infinity'::timestamptz)
  ) as saidas_seguidas
from public.crm_leads l;


-- ============================================================
-- 9. SEMENTES — a meta e os primeiros templates
--
-- Rodam para todo usuário que ainda não tem linha, então são seguras de
-- reexecutar e já deixam o CRM utilizável no primeiro login. Os textos são
-- ponto de partida para editar em /crm/templates, não escritura.
-- ============================================================
insert into public.crm_metas (owner_id, toques_semana)
select u.id, 50
  from auth.users u
 where not exists (select 1 from public.crm_metas m where m.owner_id = u.id);

insert into public.crm_templates (owner_id, titulo, canal, categoria, conteudo, ordem)
select u.id, t.titulo, 'whatsapp', t.categoria, t.conteudo, t.ordem
  from auth.users u
 cross join (values
   ('Primeira abordagem', 'abertura_fria',
    'Oi, {nome}! Aqui é o Rafael, do estúdio de web design em Maringá. Entrei no perfil da {empresa} e a operação de vocês em {nicho} tem cara de quem já vende bem por indicação. Fiz uma olhada no que existe hoje de site e vi um ponto que dá para melhorar rápido. Posso te mandar em uns 2 minutos de áudio o que eu faria?',
    1),
   ('Depois de curtir ou comentar', 'abertura_morna',
    'Oi, {nome}! Vi que você acompanha o estúdio por aqui. Trabalho com site e loja virtual para negócios de {cidade}, e a {empresa} é exatamente o tipo de operação em que a diferença aparece rápido. Quer que eu te mostre dois trabalhos parecidos com o seu?',
    2),
   ('Segundo toque, sem resposta', 'follow_up',
    'Oi, {nome}, tudo certo? Só subindo a conversa aqui para não sumir na sua lista. Se agora não for a hora, me diz e eu te procuro mais para a frente, sem problema nenhum.',
    3),
   ('Chegou por indicação', 'indicacao',
    'Oi, {nome}! Fiquei sabendo da {empresa} por indicação, e por isso já chego direto ao ponto: faço site e loja virtual para negócios como o seu, com prazo fechado e preço fechado. Quer ver dois exemplos e o que costuma custar?',
    4),
   ('Quando o preço trava', 'objecao',
    '{nome}, entendo. O valor é fechado e não tem surpresa depois: escopo, prazo e preço saem por escrito antes de começar. Se o momento não permite agora, dá para começar por uma landing page e evoluir para o site completo depois. Quer que eu monte assim?',
    5),
   ('Enviando a proposta', 'proposta',
    'Prontinho, {nome}. A proposta da {empresa} está aqui: [link]. Ela vale por 7 dias, tem o escopo item a item e as formas de pagamento no fim. Qualquer dúvida me chama por aqui mesmo que eu respondo na hora.',
    6),
   ('Reativar contato antigo', 'reativacao',
    'Oi, {nome}! Faz um tempo que a gente conversou sobre o site da {empresa} e eu lembrei de você agora. Mudou alguma coisa aí desde então? Se ainda fizer sentido, consigo te encaixar no calendário deste mês.',
    7)
 ) as t(titulo, categoria, conteudo, ordem)
 where not exists (select 1 from public.crm_templates x where x.owner_id = u.id);


-- ============================================================
-- 10. INBOUND — o que o servidor precisa para escrever aqui
--
-- /api/lead roda com a service role key, que ignora o RLS mas também não tem
-- usuário: `auth.uid()` é nulo lá, e o `default` do owner_id não resolve.
-- Por isso a rota manda o dono explícito, lido da variável de ambiente
-- CRM_OWNER_ID.
--
-- Pegue o valor rodando isto e copiando o id (é o mesmo uuid que o login do
-- CRM usa; se aparecer mais de uma linha, use a do e-mail com que você entra):
--
--   select id, email from auth.users;
--
-- e cadastre em Vercel → Settings → Environment Variables:
--
--   CRM_OWNER_ID=<o uuid>
--
-- Sem a variável, a captura do site continua funcionando igual e só a cópia
-- no CRM é pulada, com um aviso no log. Nunca o contrário: o lead do site
-- não pode se perder por causa de uma configuração do CRM.
-- ============================================================


-- ============================================================
-- ⚠️ MIGRAÇÃO (15/08/2026) — a etapa PRÉVIA entrou no funil.
--
-- Rode este bloco se você já executou este arquivo antes. Quem estiver
-- criando o banco agora não precisa de nada: o `create table` lá em cima
-- ainda não conhece 'previa', e é este bloco que ensina.
--
-- O QUE ELA É: o Rafael desenha uma prévia do site e manda para a pessoa
-- ver, sem cobrar. É uma etapa de verdade do processo dele, e ela estava
-- acontecendo escondida dentro de "Conversa": um lead que já viu o próprio
-- site desenhado tem uma temperatura completamente diferente de um lead
-- que só trocou mensagens, e o quadro mostrava os dois iguais.
--
-- ONDE ELA ENTRA: entre Conversa e Proposta. Mostra, depois cobra. Se um
-- dia a ordem mudar (prévia como ferramenta de fechamento, depois da
-- proposta), o que muda é a ordem do array ESTAGIOS em lib/crm/tipos.ts:
-- o banco não guarda ordem nenhuma, só o conjunto de valores aceitos.
--
-- POR QUE `not valid` e depois `validate`: sem isso o Postgres trava a
-- tabela inteira enquanto confere linha por linha. Com o volume de um
-- estúdio solo a diferença é imperceptível, mas o hábito é o certo.
-- ============================================================
alter table public.crm_leads drop constraint if exists crm_leads_estagio_check;

alter table public.crm_leads
  add constraint crm_leads_estagio_check
  check (estagio in ('lista','contatado','follow_up','conversa','previa','proposta','negociacao','ganho','perdido'))
  not valid;

alter table public.crm_leads validate constraint crm_leads_estagio_check;
