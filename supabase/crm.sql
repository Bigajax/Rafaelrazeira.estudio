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
    check (estagio in ('lista','contatado','follow_up','conversa','previa','proposta','negociacao','geladeira','ganho','perdido')),
  -- numérica de propósito: reordenar por arrastar vira "média entre o vizinho
  -- de cima e o de baixo", uma linha alterada em vez da coluna inteira.
  posicao numeric not null default 1000,

  proximo_passo text,
  proxima_acao_em date,
  ultimo_toque_em timestamptz,
  entrou_no_estagio_em timestamptz not null default now(),

  motivo_perda text
    check (motivo_perda in ('preco','sem_interesse','sem_resposta','timing','fechou_com_outro','fora_do_perfil','desistiu')),
  valor_fechado numeric,
  fechado_em date,

  notas text,

  -- O DOSSIÊ DA PESQUISA COM IA (16/08/2026): o que a rota
  -- /api/crm/pesquisa escreve depois de pesquisar o negócio na web.
  -- jsonb e não colunas porque o dossiê é um documento de leitura (resumo,
  -- achados, gancho, mensagem pronta, fontes) que nunca entra em filtro
  -- nem em índice; o formato vive em lib/crm/tipos.ts (type Dossie).
  dossie jsonb,

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
    check (categoria in ('abertura_fria','abertura_morna','segundo_toque','follow_up','encerramento','indicacao','objecao','previa','proposta','reativacao')),
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
   -- O PRIMEIRO TOQUE NÃO VENDE, ELE PERGUNTA. Duas linhas, uma pergunta,
   -- sem apresentação, sem oferta e sem link: é o que cabe inteiro na
   -- notificação do WhatsApp, e é na notificação que a pessoa decide se
   -- abre. A apresentação e a oferta moram no 'segundo_toque'.
   ('Primeiro toque, só a pergunta', 'abertura_fria',
    'oi, {saudacao}! entrei no perfil da {empresa} procurando {nicho} e não achei onde ver os preços. é só por aqui no direct mesmo?',
    1),
   ('Depois de curtir ou comentar', 'abertura_morna',
    'oi {nome}, {saudacao}! vi que você passou por aqui. posso te fazer uma pergunta rápida sobre a {empresa}?',
    2),
   -- Só depois da resposta. Aqui o comprimento lê como cuidado, e é o
   -- único lugar onde o link do exemplo não vira etiqueta de anúncio.
   ('Segundo toque, depois que responder', 'segundo_toque',
    'ah, entendi! é que eu faço site aqui de Maringá e entrei pra ver as coisas de vocês antes de perguntar. sem uma página com tudo organizado, quem só ia dar uma olhada acaba te chamando no WhatsApp, e boa parte desiste antes. posso montar uma prévia da {empresa} pra você ver, sem compromisso e sem cobrar nada por isso. quer?',
    3),
   -- ---------- A ESCADA DO SILÊNCIO ----------
   -- A ORDEM DESTES DOIS É A ESCADA (ver `degrauDoSilencio`): o primeiro
   -- follow-up é o primeiro retorno, o segundo é o segundo. Nenhum deles
   -- insiste, porque insistir é o que faz virar contato arquivado sem ler.
   --
   -- Retorno 1, uns 2 ou 3 dias depois: TROCA A PERGUNTA. Não pergunta se
   -- viu a mensagem (isso só faz lembrar que escolheu não responder), não
   -- cobra e não repete o pitch. Dá um motivo digno para o silêncio.
   ('Retorno 1, a hora ruim (2 a 3 dias)', 'follow_up',
    '{nome}, {saudacao}! acho que te peguei numa hora corrida. era uma dúvida rápida só, sem pressa nenhuma: quando sobrar um minuto aí me diz',
    4),
   -- Retorno 2, uns 4 a 6 dias depois: PARA DE PEDIR E MOSTRA. Sem
   -- pergunta no fim, de propósito: a mensagem inteira é um presente, e
   -- presente com pergunta colada vira cobrança. É o único retorno em que
   -- o link é bem-vindo, porque agora ele é a prova e não a isca. Trocar
   -- [link] pelo projeto do portfólio mais parecido com o negócio dela.
   ('Retorno 2, mostra em vez de pedir (4 a 6 dias)', 'follow_up',
    '{nome}, não vou mais te encher, prometo. só te deixo isto aqui pra você ver o tipo de coisa que eu faço: é uma loja daqui da região que hoje vende pela própria página. [link] se um dia a {empresa} quiser algo assim, é só me chamar que eu monto uma prévia sem cobrar nada.',
    5),
   -- E A SAÍDA. Encerrar não é mais um retorno, é a decisão de parar, e
   -- por isso tem categoria própria. É também a mensagem que mais recebe
   -- resposta em prospecção, justamente porque tira o peso de responder.
   -- Nada de "última chance": isso é a mesma insistência de gravata.
   ('Retorno 3, a saída honrosa (8 a 10 dias)', 'encerramento',
    '{nome}, {saudacao}. vou parar de te chamar pra não virar chateação. deixo meu contato salvo aqui: se um dia a {empresa} precisar de site, me manda mensagem que eu te atendo na hora. sucesso aí!',
    6),
   -- Daqui para baixo a conversa já está aberta, e por isso estes
   -- continuam compridos e caprichados: depois de uma resposta, texto
   -- longo lê como cuidado; antes dela, lê como mala direta.
   ('Chegou por indicação', 'indicacao',
    'Oi, {nome}! Fiquei sabendo da {empresa} por indicação, e por isso já chego direto ao ponto: faço site e loja virtual para negócios como o seu, com prazo fechado e preço fechado. Quer ver dois exemplos e o que costuma custar?',
    7),
   ('Quando o preço trava', 'objecao',
    '{nome}, entendo. O valor é fechado e não tem surpresa depois: escopo, prazo e preço saem por escrito antes de começar. Se o momento não permite agora, dá para começar por uma landing page e evoluir para o site completo depois. Quer que eu monte assim?',
    8),
   -- ---------- A PRÉVIA, que é a etapa que ganha o cliente ----------
   -- Ela existia no funil e não existia em texto nenhum, então a hora mais
   -- importante do processo era improvisada toda vez. Duas coisas
   -- carregam esta mensagem: convidar a CRITICAR (crítica é conversa, e
   -- elogio educado é fim de papo) e repetir que é de graça, porque a
   -- pergunta silenciosa de quem recebe é sempre "quanto isso vai custar".
   ('Mandando a prévia', 'previa',
    '{nome}, ficou pronta! esta é a prévia da {empresa}: [link]. pode abrir no celular e clicar em tudo, é uma página de verdade. como eu fiz sem compromisso, me diz sem dó o que você mudaria: cor, texto, ordem das coisas, o que for. e se não gostar, não tem problema nenhum e não te custa nada.',
    9),
   -- Sumiu DEPOIS de ver a prévia é outro silêncio: essa pessoa já
   -- investiu atenção, e quase sempre o que trava é preço ou tempo. A
   -- mensagem nomeia isso primeiro, para ela não precisar dizer.
   ('Prévia mandada, sem resposta', 'previa',
    '{nome}, {saudacao}! e a prévia, o que você achou? pode falar o que não gostou, é pra isso que ela existe. e se o que travou foi preço ou o momento, me fala também, que aí a gente vê um caminho menor pra começar.',
    10),
   ('Enviando a proposta', 'proposta',
    'Prontinho, {nome}. A proposta da {empresa} está aqui: [link]. Ela vale por 7 dias, tem o escopo item a item e as formas de pagamento no fim. Qualquer dúvida me chama por aqui mesmo que eu respondo na hora.',
    11),
   -- Proposta no vácuo NÃO é a escada do silêncio: aqui a pessoa já falou
   -- com você, já viu preço, e sumir costuma ser dúvida não dita. Oferecer
   -- a saída ("me diz que não") é o que destrava, porque a maioria some
   -- por não saber como recusar.
   ('Proposta sem resposta', 'proposta',
    '{nome}, {saudacao}! a proposta da {empresa} vence sexta e eu não quero que ela caduque por esquecimento. se ficou alguma dúvida, me pergunta; e se a resposta for não, pode me dizer sem cerimônia que eu não fico chateado, de verdade.',
    12),
   ('Reativar contato antigo', 'reativacao',
    '{Saudacao}, {nome}! Faz um tempo que a gente conversou sobre o site da {empresa} e eu lembrei de você agora. Mudou alguma coisa aí desde então? Se ainda fizer sentido, consigo te encaixar no calendário deste mês.',
    13)
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
-- ⚠️ A LISTA ABAIXO INCLUI 'geladeira', que é de 20/08 e não de 15/08, e
-- isso é de propósito. Pela regra escrita no bloco de 19/08: este arquivo
-- roda inteiro toda vez, então um `check` de um bloco antigo não pode ser
-- mais estreito do que um bloco de baixo precisa. Escrito com as nove
-- etapas daquela data, o primeiro lead que fosse para a geladeira faria
-- esta linha derrubar o arquivo na próxima execução, e nada depois dela
-- seria aplicado. Restrição é estado de HOJE; o histórico é o comentário.
alter table public.crm_leads drop constraint if exists crm_leads_estagio_check;

alter table public.crm_leads
  add constraint crm_leads_estagio_check
  check (estagio in ('lista','contatado','follow_up','conversa','previa','proposta','negociacao','geladeira','ganho','perdido'))
  not valid;

alter table public.crm_leads validate constraint crm_leads_estagio_check;


-- ============================================================
-- ⚠️ MIGRAÇÃO (16/08/2026) — o DOSSIÊ da pesquisa com IA.
--
-- Rode este bloco se você já executou este arquivo antes. Quem estiver
-- criando o banco agora não precisa: o `create table` lá em cima já
-- conhece a coluna.
--
-- O QUE ELE É: quando um lead entra, a rota /api/crm/pesquisa manda a IA
-- pesquisar o negócio na web e escreve aqui o dossiê (resumo, presença
-- digital, dor, gancho, primeira mensagem pronta, fontes). A ficha e o
-- modal de mensagem leem daqui.
--
-- POR QUE A VIEW É DERRUBADA E RECRIADA: ela seleciona `l.*`, e o
-- Postgres congela a lista de colunas de uma view no momento do create.
-- `create or replace` recusa coluna nova no meio da lista, então o
-- caminho é drop + create com o MESMO corpo da seção 8. Nenhum dado se
-- perde: view não guarda nada.
-- ============================================================
alter table public.crm_leads add column if not exists dossie jsonb;

drop view if exists public.crm_leads_painel;

create view public.crm_leads_painel
with (security_invoker = on) as
select
  l.*,
  (select count(*) from public.crm_interacoes i where i.lead_id = l.id) as toques,
  (select count(*) from public.crm_interacoes i where i.lead_id = l.id and i.direcao = 'entrada') as toques_entrada,
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
-- ⚠️ MIGRAÇÃO (19/08/2026) — os DOIS TOQUES e a saudação do relógio.
--
-- Rode este bloco se você já executou este arquivo antes. Quem estiver
-- criando o banco agora não precisa: a seção 3 já nasce assim.
--
-- POR QUE. Duas coisas estavam matando a mensagem antes de ela ser lida.
--
-- 1. O PRIMEIRO TOQUE VENDIA. Na lista de conversas do WhatsApp cabem
--    duas linhas, e era ali, na notificação, que a pessoa via "aqui é o
--    Rafael, do estúdio de web design" com um cartão de preview embaixo e
--    entendia propaganda antes de abrir. Agora a oferta, a apresentação e
--    o link do exemplo moram no SEGUNDO toque, que só existe depois de uma
--    resposta; o primeiro é uma pergunta curta sobre o negócio da pessoa.
--    Daí a categoria nova 'segundo_toque': ela não é follow-up, que é
--    insistir sem resposta, é o contrário disso.
--
-- 2. A SAUDAÇÃO ENVELHECIA. O texto nasce na pesquisa e é mandado horas
--    ou dias depois, então "boa tarde" escrito à mão chegava às nove da
--    manhã e entregava na primeira linha que o texto era pronto. A
--    variável {saudacao} ({Saudacao} para abrir frase) resolve no fuso de
--    Maringá no instante do envio, e não tem lacuna possível.
--
-- OS TEMPLATES EDITADOS À MÃO SÃO PRESERVADOS: o update só toca as linhas
-- cujo conteúdo ainda é exatamente o texto semeado. Quem reescreveu o seu
-- fica com o seu, e o de baixo entra do lado.
-- ============================================================
-- ⚠️ AQUI HAVIA UM `check` QUE QUEBRAVA O ARQUIVO INTEIRO (removido em
-- 20/08). Ele reescrevia `crm_templates_categoria_check` com as OITO
-- categorias que existiam nesta manhã, e o bloco de 19/08 setenta linhas
-- abaixo alarga a lista para dez e insere templates em 'encerramento' e
-- 'previa'. Rodar o arquivo pela segunda vez morria exatamente aqui:
--
--   ERROR: 23514: check constraint "crm_templates_categoria_check" of
--   relation "crm_templates" is violated by some row
--
-- e como o editor do Supabase roda tudo numa transação só, NADA depois
-- disto era aplicado, migração nova inclusive.
--
-- A REGRA QUE ISSO DEIXA, e que vale para as próximas: este arquivo é
-- rodado INTEIRO, de cima a baixo, toda vez. Então um `check` escrito num
-- bloco antigo não pode ser mais estreito do que um bloco de baixo precisa.
-- Ou ele já nasce com a lista final, ou ele não existe. Restrição é estado
-- de HOJE, não registro histórico; o registro histórico é este comentário.
--
-- Nada se perdeu ao tirar: a lista de dez está no `create table` da seção 3
-- e no bloco da segunda migração de 19/08. O que este bloco veio fazer de
-- verdade são os UPDATEs de texto logo abaixo.

-- 2.1 o primeiro toque, encurtado
update public.crm_templates
   set titulo = 'Primeiro toque, só a pergunta',
       conteudo = 'oi, {saudacao}! entrei no perfil da {empresa} procurando {nicho} e não achei onde ver os preços. é só por aqui no direct mesmo?'
 where categoria = 'abertura_fria'
   and conteudo like 'Oi, {nome}! Aqui é o Rafael, do estúdio de web design em Maringá.%';

update public.crm_templates
   set conteudo = 'oi {nome}, {saudacao}! vi que você passou por aqui. posso te fazer uma pergunta rápida sobre a {empresa}?'
 where categoria = 'abertura_morna'
   and conteudo like 'Oi, {nome}! Vi que você acompanha o estúdio por aqui.%';

-- 2.2 o follow-up perde o nome "segundo toque", que agora é de outro
update public.crm_templates
   set titulo = 'Subindo a conversa, sem resposta',
       conteudo = '{nome}, {saudacao}. só subindo aqui pra não sumir na sua lista. se não for a hora, me diz que eu te procuro mais pra frente'
 where categoria = 'follow_up'
   and conteudo like 'Oi, {nome}, tudo certo? Só subindo a conversa aqui%';

-- 2.3 a saudação do texto de reativação vira variável
update public.crm_templates
   set conteudo = replace(conteudo, 'Oi, {nome}! Faz um tempo', '{Saudacao}, {nome}! Faz um tempo')
 where categoria = 'reativacao'
   and conteudo like 'Oi, {nome}! Faz um tempo%';

-- 2.4 o segundo toque, que não existia
insert into public.crm_templates (owner_id, titulo, canal, categoria, conteudo, ordem)
select t.owner_id, 'Segundo toque, depois que responder', 'whatsapp', 'segundo_toque',
       'ah, entendi! é que eu faço site aqui de Maringá e entrei pra ver as coisas de vocês antes de perguntar. sem uma página com tudo organizado, quem só ia dar uma olhada acaba te chamando no WhatsApp, e boa parte desiste antes. posso montar uma prévia da {empresa} pra você ver, sem compromisso e sem cobrar nada por isso. quer?',
       3
  from (select distinct owner_id from public.crm_templates) t
 where not exists (
   select 1 from public.crm_templates x
    where x.owner_id = t.owner_id and x.categoria = 'segundo_toque');


-- ============================================================
-- ⚠️ MIGRAÇÃO (19/08/2026, a segunda do dia) — a ESCADA DO SILÊNCIO,
--    a PRÉVIA e a proposta no vácuo.
--
-- Rode este bloco se você já executou este arquivo antes. Quem estiver
-- criando o banco agora não precisa: a seção 3 já nasce assim.
--
-- POR QUE. O quadro tinha 32 leads em Contatado e ZERO respostas, com um
-- único template de follow-up dizendo "só subindo aqui pra não sumir na
-- sua lista". Mandar isso três vezes é a forma mais rápida de virar o
-- contato que a pessoa arquiva sem ler: cada mensagem custa alguma coisa
-- para quem recebe e não traz nada de novo. Agora cada retorno tem um
-- trabalho diferente, e nenhum deles é insistir:
--
--   Retorno 1 (2 a 3 dias) ... troca a pergunta, dá um motivo digno para
--                              o silêncio, não cobra e não repete o pitch.
--   Retorno 2 (4 a 6 dias) ... para de pedir e MOSTRA: uma prova do
--                              trabalho, de graça, sem pergunta no fim.
--   Retorno 3 (8 a 10 dias) .. encerra. Categoria própria ('encerramento')
--                              porque parar é uma decisão, não mais um
--                              retorno, e essa é a mensagem que mais
--                              recebe resposta em prospecção.
--
-- E DUAS ETAPAS QUE NÃO TINHAM TEXTO NENHUM: a PRÉVIA (a etapa que ganha
-- o cliente neste estúdio, improvisada toda vez até hoje) e a PROPOSTA NO
-- VÁCUO, que não é o mesmo silêncio de quem nunca falou com você.
--
-- A ORDEM IMPORTA AGORA: `degrauDoSilencio` (lib/crm/regras.ts) escolhe o
-- retorno pela POSIÇÃO do template dentro da categoria, e a lista chega
-- ordenada por `ordem`. Por isso o bloco termina renumerando tudo. Se você
-- tinha uma ordem própria, ela é refeita aqui: é o preço de o CRM saber
-- qual degrau é a vez.
-- ============================================================
alter table public.crm_templates drop constraint if exists crm_templates_categoria_check;
alter table public.crm_templates
  add constraint crm_templates_categoria_check
  check (categoria in ('abertura_fria','abertura_morna','segundo_toque','follow_up','encerramento','indicacao','objecao','previa','proposta','reativacao'));

-- 3.1 o retorno 1 no lugar do "só subindo aqui"
update public.crm_templates
   set titulo = 'Retorno 1, a hora ruim (2 a 3 dias)',
       conteudo = '{nome}, {saudacao}! acho que te peguei numa hora corrida. era uma dúvida rápida só, sem pressa nenhuma: quando sobrar um minuto aí me diz'
 where categoria = 'follow_up'
   and (conteudo like '{nome}, {saudacao}. só subindo aqui%'
     or conteudo like 'Oi, {nome}, tudo certo? Só subindo a conversa aqui%');

-- 3.2 os cinco que não existiam, um por dono que já tem templates
insert into public.crm_templates (owner_id, titulo, canal, categoria, conteudo, ordem)
select d.owner_id, n.titulo, 'whatsapp', n.categoria, n.conteudo, n.ordem
  from (select distinct owner_id from public.crm_templates) d
 cross join (values
   ('Retorno 2, mostra em vez de pedir (4 a 6 dias)', 'follow_up',
    '{nome}, não vou mais te encher, prometo. só te deixo isto aqui pra você ver o tipo de coisa que eu faço: é uma loja daqui da região que hoje vende pela própria página. [link] se um dia a {empresa} quiser algo assim, é só me chamar que eu monto uma prévia sem cobrar nada.',
    5),
   ('Retorno 3, a saída honrosa (8 a 10 dias)', 'encerramento',
    '{nome}, {saudacao}. vou parar de te chamar pra não virar chateação. deixo meu contato salvo aqui: se um dia a {empresa} precisar de site, me manda mensagem que eu te atendo na hora. sucesso aí!',
    6),
   ('Mandando a prévia', 'previa',
    '{nome}, ficou pronta! esta é a prévia da {empresa}: [link]. pode abrir no celular e clicar em tudo, é uma página de verdade. como eu fiz sem compromisso, me diz sem dó o que você mudaria: cor, texto, ordem das coisas, o que for. e se não gostar, não tem problema nenhum e não te custa nada.',
    9),
   ('Prévia mandada, sem resposta', 'previa',
    '{nome}, {saudacao}! e a prévia, o que você achou? pode falar o que não gostou, é pra isso que ela existe. e se o que travou foi preço ou o momento, me fala também, que aí a gente vê um caminho menor pra começar.',
    10),
   ('Proposta sem resposta', 'proposta',
    '{nome}, {saudacao}! a proposta da {empresa} vence sexta e eu não quero que ela caduque por esquecimento. se ficou alguma dúvida, me pergunta; e se a resposta for não, pode me dizer sem cerimônia que eu não fico chateado, de verdade.',
    12)
 ) as n(titulo, categoria, conteudo, ordem)
 where not exists (
   select 1 from public.crm_templates x
    where x.owner_id = d.owner_id and x.titulo = n.titulo);

-- 3.3 a numeração, refeita pela categoria (e não pelo valor antigo, que
--     variava conforme quais migrações cada banco já tinha rodado). Os
--     dois `case` internos desempatam as categorias com dois templates.
update public.crm_templates
   set ordem = case categoria
     when 'abertura_fria'  then 1
     when 'abertura_morna' then 2
     when 'segundo_toque'  then 3
     when 'follow_up'      then case when titulo like 'Retorno 2%' then 5 else 4 end
     when 'encerramento'   then 6
     when 'indicacao'      then 7
     when 'objecao'        then 8
     when 'previa'         then case when titulo like 'Prévia mandada%' then 10 else 9 end
     when 'proposta'       then case when titulo like 'Proposta sem resposta%' then 12 else 11 end
     when 'reativacao'     then 13
     else ordem
   end
 where categoria is not null;


-- ============================================================
-- ⚠️ MIGRAÇÃO (20/08/2026) — a GELADEIRA e o "não tem interesse".
--
-- Rode este bloco se você já executou este arquivo antes. Quem estiver
-- criando o banco agora precisa dele do mesmo jeito: os `check` da seção
-- 1 já conhecem os dois valores novos, mas rodar isto de novo não custa
-- nada e não muda nada.
--
-- SE VOCÊ CHEGOU AQUI PELO ERRO "check constraint
-- crm_templates_categoria_check ... is violated by some row": era o bloco
-- de 19/08, que reescrevia aquela restrição com uma lista velha e mais
-- estreita. Está resolvido no próprio bloco, com a explicação inteira.
--
-- POR QUE. "Me responderam" era um balde só para dois fatos opostos: "me
-- conta mais" e "não me chama mais". O trilho do funil lia os dois igual e
-- promovia os dois para Conversa, então quem tinha acabado de dizer não
-- voltava na fila do dia seguinte com o passo "Responder a conversa". O
-- CRM mandava insistir com quem já tinha recusado, que é a coisa mais cara
-- que uma ferramenta de prospecção pode fazer.
--
-- Agora o toque de entrada tem TEOR, e cada teor tem um destino:
--
--   quer saber mais .. Conversa    (o trilho de sempre)
--   não é a hora ..... GELADEIRA   (novo)
--   é não ............ Perdido, com motivo
--
-- 1. A GELADEIRA. "Agora não, me chame mais pra frente" é uma resposta, e
--    ela não tinha lugar nenhum: virava Conversa (mentira, a conversa
--    acabou) ou virava Perdido (mentira maior, ele volta em outubro).
--    Ela é o único estágio dos dois lados da linha: ATIVA, então
--    `painelHoje` a lê e devolve o lead na data marcada com o passo de
--    reativação já escrito; e FORA DO QUADRO, porque coluna é o que se
--    trabalha todo dia. Ela mora nas placas do fim, junto com ganho e
--    perdido, com filete tracejado: é a única saída de onde se volta.
--
--    A ORDEM da coluna no quadro continua saindo de ESTAGIOS em
--    lib/crm/tipos.ts, não daqui: o banco guarda o conjunto de valores
--    aceitos, nunca a sequência.
--
-- 2. `sem_interesse` NÃO é `desistiu`. Desistir é ter tido um projeto e
--    largar; quem responde "não tenho interesse" a uma abordagem fria
--    nunca teve projeto nenhum. No mesmo balde, o gráfico de motivos das
--    métricas deixaria de responder a única pergunta que ele faz.
--
-- POR QUE `not valid` e depois `validate`: sem isso o Postgres trava a
-- tabela inteira enquanto confere linha por linha.
-- ============================================================
alter table public.crm_leads drop constraint if exists crm_leads_estagio_check;

alter table public.crm_leads
  add constraint crm_leads_estagio_check
  check (estagio in ('lista','contatado','follow_up','conversa','previa','proposta','negociacao','geladeira','ganho','perdido'))
  not valid;

alter table public.crm_leads validate constraint crm_leads_estagio_check;

alter table public.crm_leads drop constraint if exists crm_leads_motivo_perda_check;

alter table public.crm_leads
  add constraint crm_leads_motivo_perda_check
  check (motivo_perda in ('preco','sem_interesse','sem_resposta','timing','fechou_com_outro','fora_do_perfil','desistiu'))
  not valid;

alter table public.crm_leads validate constraint crm_leads_motivo_perda_check;


-- ============================================================
-- ⚠️ MIGRAÇÃO (20/08/2026, a segunda do dia) — o CAIXA.
--    Três tabelas novas: crm_contratos, crm_parcelas, crm_recebimentos.
--
-- Rode este bloco. Ele é autossuficiente: cria as tabelas, os índices, o
-- RLS e os gatilhos de relógio, e roda quantas vezes você quiser.
--
-- POR QUE. Hoje um pagamento aprovado existe em UM lugar só: o painel do
-- Mercado Pago. A rota /api/proposta-pagamento monta um `external_reference`
-- com toda a informação certa e joga fora; não há webhook; o checkout
-- desenha um "✓" e não grava nada; não há sequer um log no caminho de
-- sucesso. O único registro de venda no CRM é `crm_leads.valor_fechado`, um
-- número digitado à mão.
--
-- Resultado prático: o CRM sabe que a ArraZou fechou por R$ 999 e NÃO sabe
-- que ela pagou R$ 500 e deve R$ 499 desde o dia 18. Cobrar a segunda
-- parcela é a conversa mais fácil e mais esquecida do estúdio, e ela não
-- está em fila nenhuma.
--
-- ------------------------------------------------------------
-- TRÊS TABELAS, E CADA UMA É UMA LISTA DIFERENTE
--
--   crm_contratos ...... o que foi COMBINADO      (R$ 999, em duas etapas)
--   crm_parcelas ....... o que é ESPERADO, e quando
--   crm_recebimentos ... o dinheiro que CHEGOU
--
-- A terceira é a que quase não nasceu, e ela é a mais importante das três.
-- Com o `mp_payment_id` morando na parcela, a idempotência do webhook
-- dependeria de ELE ACHAR A PARCELA: quando o pagamento não bate com
-- nenhuma (o cliente pagou a entrada no minuto seguinte a receber a
-- proposta, antes de o contrato existir), o webhook não teria onde
-- registrar "já vi este pagamento", e o Mercado Pago, que reenvia por
-- horas, seria atendido com dinheiro descartado em silêncio, várias vezes.
--
-- Com o razão de caixa separado, o webhook GRAVA PRIMEIRO E ENTENDE
-- DEPOIS: a linha entra com `parcela_id` nulo e aparece na bandeja
-- "dinheiro sem dono", para ser amarrada em dois cliques. De quebra ela
-- resolve outras três coisas que uma parcela sozinha não resolve: pagamento
-- parcial, estorno (o cartão em serviço sofre chargeback, e o CHECKOUT.md
-- já avisa disso) e recebimento que não pertence a parcela nenhuma.
--
-- ------------------------------------------------------------
-- CARTÃO PARCELADO NÃO É PARCELA A RECEBER
--
-- Quando o cliente paga R$ 800 em 4x no cartão, o Mercado Pago repassa ao
-- estúdio de uma vez; quem parcela é o banco DELE. O `maxParcelas` da
-- tabela PROPOSTAS descreve como o cliente paga, não o cronograma do que
-- entra aqui. Por isso a unidade da parcela é o ITEM da proposta:
--
--   entrada_pix R$ 199 + saldo_card R$ 800 em 4x  →  DUAS parcelas
--   avista_pix R$ 899                             →  UMA parcela
--
-- Errar isto multiplica o plano inteiro por quatro.
--
-- ------------------------------------------------------------
-- O QUE NÃO É COLUNA
--
-- "Atrasado" e "quitado" são derivados, pela mesma regra que já vale para
-- `urgencia()` e `temperatura()` em lib/crm/regras.ts: atrasado é parcela
-- viva com `vence_em` no passado, e quitado é a soma dos recebimentos
-- batendo o valor. Guardados, virariam estado para manter sincronizado, e
-- um dia estariam errados. Cancelado, esse sim, é DECISÃO, e por isso é
-- guardado.
--
-- ------------------------------------------------------------
-- E NENHUMA COLUNA NOVA EM `crm_leads`, de propósito
--
-- `crm_leads_painel` é `select l.*`, e o Postgres congela a lista de
-- colunas de uma view no momento do create: coluna nova ali obriga a
-- derrubar e recriar a view com o corpo duplicado, que é o próximo lugar
-- onde duas cópias divergem. Já custou uma migração em 16/08. O contrato
-- aponta para o lead, nunca o contrário.
-- ============================================================

create table if not exists public.crm_contratos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lead_id uuid not null references public.crm_leads(id) on delete cascade,

  -- "Vitrine Digital ArraZou". O nome do PROJETO e não o do cliente: o
  -- cliente já está no lead, e um dia são dois contratos para o mesmo nome.
  titulo text not null,

  -- A PONTE COM O CHECKOUT: a mesma chave da constante PROPOSTAS em
  -- lib/propostas.js, que é quem cobra o cliente de verdade. É por ela que
  -- o webhook do Mercado Pago acha este contrato. Nula quando a venda não
  -- passou por proposta nenhuma (Pix na chave direta, indicação, permuta).
  proposta_slug text,

  -- 'projeto' é tudo hoje. 'recorrencia' é o buraco por onde a mensalidade
  -- entra depois: as quatro colunas abaixo nascem nulas e não custam nada,
  -- e no dia D o único código novo é um laço que gera as parcelas do ciclo.
  -- Nem a fila do Hoje, nem a tela do Caixa, nem o webhook mudam uma linha.
  tipo text not null default 'projeto' check (tipo in ('projeto','recorrencia')),
  valor_total numeric check (valor_total >= 0),
  valor_ciclo numeric check (valor_ciclo >= 0),
  ciclo text check (ciclo in ('mensal','trimestral','anual')),
  -- até 28 porque nem todo mês tem 29, 30 ou 31, e uma mensalidade que some
  -- em fevereiro é pior do que uma que vence três dias antes.
  dia_vencimento int check (dia_vencimento between 1 and 28),
  vigente_ate date,

  status text not null default 'ativo' check (status in ('ativo','cancelado')),
  assinado_em date,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_parcelas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  contrato_id uuid not null references public.crm_contratos(id) on delete cascade,
  -- DESNORMALIZADO de propósito: a fila do dia e a ficha filtram parcela por
  -- lead, e sem esta coluna toda leitura do painel Hoje vira um join a mais
  -- na consulta mais quente da ferramenta.
  lead_id uuid not null references public.crm_leads(id) on delete cascade,

  numero int not null default 1,
  de int,                        -- o "de" de "2 de 4"; nulo em recorrência
  -- "Entrada", "Saldo na entrega", "2ª parcela". Escrito e não calculado:
  -- "1 de 2" não diz o que a parcela É, e é o rótulo que a pessoa lê na
  -- hora de cobrar.
  rotulo text not null,

  valor numeric not null check (valor > 0),
  vence_em date not null,

  -- De qual item do checkout ela nasceu ('entrada_pix', 'saldo_card'…).
  -- Slug acha o contrato, item acha a parcela: são as duas metades da
  -- amarração automática.
  item_slug text,
  metodo_previsto text
    -- `permuta` porque a proposta da vérít.lab aceita peças como parte do
    -- pagamento: é recebimento que não é dinheiro, e fingir que não existe
    -- faria o contrato nunca quitar.
    check (metodo_previsto in ('pix','cartao','boleto','transferencia','dinheiro','permuta')),

  -- QUANDO EU QUERO SER COBRADO por ela, que é o `proxima_acao_em` da
  -- parcela: decisão, não derivação. É o que os botões +3d/+7d empurram
  -- sem mentir sobre a data de vencimento, que é um fato combinado com o
  -- cliente. Nulo = cobre no dia do vencimento.
  cobrar_em date,
  -- Deixou de ser devida sem sumir do histórico. Data e não booleano: saber
  -- QUANDO deixou de valer é o que permite reconstruir um mês fechado.
  cancelada_em date,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_recebimentos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,

  -- ⚠️ OS DOIS SÃO NULOS ATÉ ALGUÉM AMARRAR, e é exatamente isso que deixa
  -- o webhook gravar sem entender. Ver a nota longa lá em cima.
  parcela_id uuid references public.crm_parcelas(id) on delete set null,
  lead_id uuid references public.crm_leads(id) on delete set null,

  -- O que o cliente pagou. É este que quita a parcela.
  valor numeric not null check (valor > 0),
  -- O que sobrou depois da taxa do Mercado Pago (~1% no Pix, ~5% no
  -- cartão). Dois fatos diferentes, nenhum derivado do outro: o cliente
  -- quitou R$ 999 e no bolso entraram R$ 949.
  valor_liquido numeric,
  -- NO FUSO DE MARINGÁ, sempre. O servidor da Vercel roda em UTC e um Pix
  -- pago às 22h de sexta é sábado lá: sem isso, todo pagamento depois das
  -- 21h cai no dia seguinte, e na virada do mês cai no mês seguinte.
  recebido_em date not null,

  metodo text not null
    check (metodo in ('pix','cartao','boleto','transferencia','dinheiro','permuta')),
  origem text not null default 'manual' check (origem in ('manual','mercadopago')),

  mp_payment_id text,
  mp_status text,
  mp_external_reference text,
  -- Estorno e chargeback: a partir daqui a linha para de contar em toda
  -- soma de "recebido". Sem ela, o mês fecha com dinheiro que voltou.
  estornado_em date,
  -- A resposta do Mercado Pago inteira, para conferência. Quando o número
  -- não bater com o extrato, a verdade está aqui e não na memória de
  -- ninguém.
  bruto jsonb,

  notas text,
  created_at timestamptz not null default now()
);

-- ---------- índices ----------
-- Os de leitura começam por owner_id, pela regra da seção 6: o RLS injeta
-- `owner_id = auth.uid()` em toda consulta, e índice que não começa por ele
-- não é usado.
create index if not exists crm_contratos_lead_idx    on public.crm_contratos (owner_id, lead_id);
create index if not exists crm_contratos_slug_idx    on public.crm_contratos (owner_id, proposta_slug);
create index if not exists crm_parcelas_agenda_idx   on public.crm_parcelas (owner_id, vence_em);
create index if not exists crm_parcelas_lead_idx     on public.crm_parcelas (owner_id, lead_id);
create index if not exists crm_parcelas_contrato_idx on public.crm_parcelas (contrato_id, numero);
create index if not exists crm_receb_caixa_idx       on public.crm_recebimentos (owner_id, recebido_em desc);
create index if not exists crm_receb_parcela_idx     on public.crm_recebimentos (owner_id, parcela_id);

-- ⚠️ A TRAVA DE IDEMPOTÊNCIA DO WEBHOOK, e ela não é otimização: é a única
-- coisa que impede duas notificações simultâneas do Mercado Pago de virarem
-- dois recebimentos. O MP manda várias do mesmo pagamento na transição de
-- `pending` para `approved` e reenvia com backoff por horas; um "consulta e
-- depois insere" na aplicação perde essa corrida. Quem decide é o banco.
--
-- Não confundir com o `X-Idempotency-Key` que já existe em
-- proposta-pagamento.js: aquele protege contra COBRAR duas vezes, este
-- contra CONTABILIZAR duas vezes.
create unique index if not exists crm_receb_mp_uniq
  on public.crm_recebimentos (owner_id, mp_payment_id)
  where mp_payment_id is not null;

-- ---------- RLS ----------
alter table public.crm_contratos    enable row level security;
alter table public.crm_parcelas     enable row level security;
alter table public.crm_recebimentos enable row level security;

drop policy if exists crm_contratos_dono on public.crm_contratos;
create policy crm_contratos_dono on public.crm_contratos
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists crm_parcelas_dono on public.crm_parcelas;
create policy crm_parcelas_dono on public.crm_parcelas
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists crm_recebimentos_dono on public.crm_recebimentos;
create policy crm_recebimentos_dono on public.crm_recebimentos
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- ---------- o relógio ----------
-- Genérica, ao contrário de `crm_relogios_do_lead()` da seção 5, que carrega
-- a regra do `entrou_no_estagio_em` junto. Aqui não há nada além do
-- updated_at, e duas funções idênticas com nomes diferentes seriam duas para
-- manter.
create or replace function public.crm_relogio()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists crm_contratos_relogio on public.crm_contratos;
create trigger crm_contratos_relogio
  before update on public.crm_contratos
  for each row execute function public.crm_relogio();

drop trigger if exists crm_parcelas_relogio on public.crm_parcelas;
create trigger crm_parcelas_relogio
  before update on public.crm_parcelas
  for each row execute function public.crm_relogio();



-- ============================================================
-- ⚠️ OS DOIS CONTRATOS QUE JÁ ESTAVAM FECHADOS (20/08/2026)
--
-- Rode DEPOIS do bloco do Caixa logo acima. É idempotente: rodar de novo
-- não duplica lead, contrato, parcela nem recebimento.
--
--   PR Grife ......... R$ 450, à vista, JÁ PAGO
--   Xavier's Sports .. R$ 999 = entrada de R$ 199 (JÁ PAGA)
--                      + 4 x R$ 200, a primeira vencendo em 22/08
--
-- ------------------------------------------------------------
-- ELE CRIA O LEAD SE NÃO ACHAR, e a primeira versão não criava.
--
-- Ela procurava o lead por nome, e quando não achava dava `raise notice` e
-- seguia. O problema é que os dois clientes são ANTERIORES ao CRM: as
-- propostas deles são de julho, o CRM nasceu em 15/08, e nenhum dos dois
-- foi garimpado. Resultado: o bloco rodou sem erro nenhum, não criou nada,
-- e "deu certo" no SQL Editor — porque `raise notice` sai no log e passa
-- batido. Um bloco que não faz nada e não reclama é pior do que um que
-- falha.
--
-- Agora o lead nasce junto, já em `ganho`. Os dados vêm de
-- data/portfolio.ts, que é onde os dois já estavam descritos.
--
-- ------------------------------------------------------------
-- ⚠️ AS 4x DA XAVIER'S SÃO QUATRO COBRANÇAS, NÃO UMA NO CARTÃO. Se fosse
-- cartão parcelado, o Mercado Pago repassaria de uma vez e seria UMA
-- parcela de R$ 800. Como a cobrança é mês a mês, são quatro linhas, e cada
-- uma aparece na fila do dia no dia de vencer. O `item_slug` delas fica
-- NULO de propósito: elas não nasceram de um botão do checkout, e amarrá-las
-- ao `saldo_card` faria o webhook dar baixa na parcela errada se alguém um
-- dia clicasse naquele botão.
--
-- ⚠️ AS DATAS DE PAGAMENTO SÃO UM CHUTE: 20/08, o dia em que isto foi
-- escrito. Se o Pix caiu em outro dia, troque as duas variáveis logo abaixo
-- ANTES de rodar: é a data que decide em que mês o dinheiro conta no caixa.
-- ============================================================
do $$
declare
  -- os dois lugares para mexer, se as datas forem outras
  d_pago_prgrife date := date '2026-08-20';
  d_pago_xavier  date := date '2026-08-20';

  v_lead     uuid;
  v_dono     uuid;
  v_contrato uuid;
  v_parcela  uuid;
begin
  -- O dono é quem já tem leads aqui, e não o primeiro de `auth.users`: num
  -- banco com mais de uma conta, a segunda regra escolheria a errada e o
  -- RLS esconderia tudo do Rafael sem dizer por quê.
  select owner_id into v_dono
    from public.crm_leads
   group by owner_id
   order by count(*) desc
   limit 1;

  if v_dono is null then
    select id into v_dono from auth.users order by created_at limit 1;
  end if;

  -- ============ PR GRIFE ============
  select id into v_lead
    from public.crm_leads
   where owner_id = v_dono
     and (nome ilike '%pr%grife%' or empresa ilike '%pr%grife%')
   order by created_at
   limit 1;

  if v_lead is null then
    insert into public.crm_leads
      (owner_id, nome, empresa, nicho, cidade, tipo_projeto, origem, estagio)
    values
      (v_dono, 'PR Grife', 'PR Grife', 'moda e vestuário', 'Maringá',
       'vitrine', 'prospeccao', 'ganho')
    returning id into v_lead;
  end if;

  select id into v_contrato
    from public.crm_contratos
   where lead_id = v_lead and titulo = 'Vitrine Digital PR Grife';

  if v_contrato is null then
    insert into public.crm_contratos
      (owner_id, lead_id, titulo, proposta_slug, tipo, valor_total, assinado_em, notas)
    values
      (v_dono, v_lead, 'Vitrine Digital PR Grife', 'pr-grife', 'projeto', 450,
       d_pago_prgrife, 'Fechado antes do Caixa existir; lançado à mão em 20/08.')
    returning id into v_contrato;

    insert into public.crm_parcelas
      (owner_id, contrato_id, lead_id, numero, de, rotulo, valor, vence_em, metodo_previsto)
    values
      (v_dono, v_contrato, v_lead, 1, 1, 'À vista', 450, d_pago_prgrife, 'pix')
    returning id into v_parcela;

    insert into public.crm_recebimentos
      (owner_id, parcela_id, lead_id, valor, recebido_em, metodo, origem, notas)
    values
      (v_dono, v_parcela, v_lead, 450, d_pago_prgrife, 'pix', 'manual',
       'Pagamento à vista, lançado à mão na criação do Caixa.');
  end if;

  -- O lead vira ganho e carimba o valor, exatamente como a ação
  -- `fecharContrato` faz na tela: o contrato é a fonte e `valor_fechado` é o
  -- espelho dele. Ganho sai da agenda, senão o negócio fechado reaparece na
  -- fila do dia seguinte como pendência.
  update public.crm_leads
     set estagio = 'ganho', valor_fechado = 450, fechado_em = d_pago_prgrife,
         proxima_acao_em = null, proximo_passo = null, motivo_perda = null
   where id = v_lead and (estagio <> 'ganho' or valor_fechado is distinct from 450);

  -- ============ XAVIER'S SPORTS ============
  v_lead := null; v_contrato := null; v_parcela := null;

  select id into v_lead
    from public.crm_leads
   where owner_id = v_dono
     and (nome ilike '%xavier%' or empresa ilike '%xavier%')
   order by created_at
   limit 1;

  if v_lead is null then
    insert into public.crm_leads
      (owner_id, nome, empresa, nicho, cidade, tipo_projeto, origem, estagio)
    values
      (v_dono, 'Xavier''s Sports', 'Xavier''s Sports',
       'camisas de futebol', null, 'vitrine', 'prospeccao', 'ganho')
    returning id into v_lead;
  end if;

  select id into v_contrato
    from public.crm_contratos
   where lead_id = v_lead and titulo = 'Vitrine Digital Xavier''s Sports';

  if v_contrato is null then
    insert into public.crm_contratos
      (owner_id, lead_id, titulo, proposta_slug, tipo, valor_total, assinado_em, notas)
    values
      (v_dono, v_lead, 'Vitrine Digital Xavier''s Sports', 'xavier-sports', 'projeto', 999,
       d_pago_xavier,
       'Fechado antes do Caixa existir; lançado à mão em 20/08. As 4x de R$ 200 são cobranças mensais, não parcelamento de cartão.')
    returning id into v_contrato;

    -- A entrada, já paga. `item_slug` aponta para o botão real da proposta:
    -- se um dia alguém pagar a entrada de novo pelo checkout, o webhook acha
    -- esta parcela em vez de inventar uma órfã.
    insert into public.crm_parcelas
      (owner_id, contrato_id, lead_id, numero, de, rotulo, valor, vence_em, item_slug, metodo_previsto)
    values
      (v_dono, v_contrato, v_lead, 1, 5, 'Entrada', 199, d_pago_xavier, 'entrada_pix', 'pix')
    returning id into v_parcela;

    insert into public.crm_recebimentos
      (owner_id, parcela_id, lead_id, valor, recebido_em, metodo, origem, notas)
    values
      (v_dono, v_parcela, v_lead, 199, d_pago_xavier, 'pix', 'manual',
       'Entrada paga à vista, lançada à mão na criação do Caixa.');

    insert into public.crm_parcelas
      (owner_id, contrato_id, lead_id, numero, de, rotulo, valor, vence_em, metodo_previsto)
    select v_dono, v_contrato, v_lead, n.numero, 5, n.rotulo, 200, n.vence, 'pix'
      from (values
        (2, '2ª parcela', date '2026-08-22'),
        (3, '3ª parcela', date '2026-09-22'),
        (4, '4ª parcela', date '2026-10-22'),
        (5, '5ª parcela', date '2026-11-22')
      ) as n(numero, rotulo, vence);
  end if;

  update public.crm_leads
     set estagio = 'ganho', valor_fechado = 999, fechado_em = d_pago_xavier,
         proxima_acao_em = null, proximo_passo = null, motivo_perda = null
   where id = v_lead and (estagio <> 'ganho' or valor_fechado is distinct from 999);
end $$;

-- ============================================================
-- A CONFERÊNCIA — e ela é o ponto, não enfeite.
--
-- O bloco acima fala por `raise notice`, que sai no log e ninguém lê: foi
-- exatamente assim que a primeira versão rodou "com sucesso" sem criar nada.
-- Este `select` devolve LINHAS, e linha o SQL Editor mostra na tela.
--
-- Tem que sair duas: PR Grife com 1 parcela e R$ 450 recebidos, e Xavier's
-- Sports com 5 parcelas e R$ 199 recebidos. Se sair vazio, nada entrou.
-- ============================================================
select
  l.nome                                as cliente,
  c.titulo                              as contrato,
  c.valor_total,
  (select count(*) from public.crm_parcelas p
    where p.contrato_id = c.id)         as parcelas,
  (select coalesce(sum(r.valor), 0)
     from public.crm_recebimentos r
     join public.crm_parcelas p2 on p2.id = r.parcela_id
    where p2.contrato_id = c.id
      and r.estornado_em is null)       as recebido
from public.crm_contratos c
join public.crm_leads l on l.id = c.lead_id
order by c.created_at;
