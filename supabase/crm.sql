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
