/* ============================================================
   O TIME DE MARKETING, RODANDO NO PC

   A aba /crm/marketing grava pedidos em `mkt_pedidos`. Este script fica de
   pé no PC, pega o pedido mais antigo, roda o agente pelo `claude -p` (na
   ASSINATURA, sem API) e escreve o resultado de volta na peça.

       npx tsx scripts/marketing-agentes.ts

   Deixe a janela aberta enquanto trabalha. A tela mostra "o time está
   acordado" pelo batimento em `mkt_sinal`; fechou a janela, o site avisa.

   ---------- de onde vem o conhecimento ----------
   Os agentes continuam morando na pasta do squad, e é de lá que este script
   lê, a cada pedido: `squads/rafaelrazeira-estudio/agents/*.agent.md`, o
   `pipeline/data/posicionamento.md`, a memória do squad e as best practices
   do opensquad. Não há cópia: melhorou a Paula lá, ela melhora aqui.
   O bloco da marca veio do studio.db em 30/09 e mora em lib/marketing/marca.json.

   ---------- a armadilha que este script desarma ----------
   Se o `claude -p` herdar a ANTHROPIC_API_KEY do ambiente, ele autentica
   pela CHAVE e cobra na API em vez de usar a assinatura (e a chave de uma
   sessão do Claude Code ainda trava o filho). O ambiente do filho sai daqui
   sem ela e sem as variáveis CLAUDE_CODE_*, sempre.
   ============================================================ */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import marca from "../lib/marketing/marca.json";
import {
  AGENTES,
  CODIGOS,
  PAPEIS,
  LAYOUTS,
  composicaoDe,
  papelDe,
  legendaFinal,
  tituloProvisorio,
  PILARES,
  RESPIROS,
  ORDEM_AGENTES,
  TIPOS,
  TIPOS_SLIDE,
  type Agente,
  type Codigo,
  type Peca,
  type Pedido,
  type Pilar,
  type Slide,
  type TipoPeca,
} from "../lib/marketing/tipos";

function carregarEnv() {
  const arquivo = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(arquivo)) return;
  for (const linha of fs.readFileSync(arquivo, "utf8").split(/\r?\n/)) {
    if (!linha.includes("=") || linha.trim().startsWith("#")) continue;
    const i = linha.indexOf("=");
    const chave = linha.slice(0, i).trim();
    if (process.env[chave]) continue;
    process.env[chave] = linha.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
}
carregarEnv();

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dono = process.env.CRM_OWNER_ID;
if (!url || !chave || !dono) {
  console.error("Faltam SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ou CRM_OWNER_ID no .env.local.");
  process.exit(1);
}
const supabase = createClient(url, chave, { auth: { persistSession: false } });

const SQUAD_RAIZ =
  process.env.MKT_SQUAD_DIR || path.join(os.homedir(), "Desktop", "Time Agentes Marketing");
const SQUAD = path.join(SQUAD_RAIZ, "squads", "rafaelrazeira-estudio");
const BP_DIR = path.join(SQUAD_RAIZ, "_opensquad", "core", "best-practices");
if (!fs.existsSync(path.join(SQUAD, "agents"))) {
  console.error(`Não achei os agentes em ${SQUAD}. Aponte MKT_SQUAD_DIR para a pasta "Time Agentes Marketing".`);
  process.exit(1);
}

const BIN_PADRAO = path.join(os.homedir(), ".local", "bin", "claude.exe");
const CLAUDE_BIN = process.env.MKT_CLAUDE_BIN || (fs.existsSync(BIN_PADRAO) ? BIN_PADRAO : "claude");
/* Vazio = o modelo padrão da assinatura. */
const MODELO = process.env.MKT_MODELO || "";

/* ============================================================
   O CONHECIMENTO, LIDO DO DISCO A CADA PEDIDO
   ============================================================ */
function ler(p: string) {
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8").trim() : "";
}

function agenteMd(id: Agente) {
  const bruto = ler(path.join(SQUAD, "agents", `${id}.agent.md`));
  const m = bruto.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/);
  return (m ? m[1] : bruto).trim();
}

const posicionamento = () => ler(path.join(SQUAD, "pipeline", "data", "posicionamento.md"));
const memoria = () => ler(path.join(SQUAD, "_memory", "memories.md")).slice(-9000);

const BP_TIPO: Record<TipoPeca, string[]> = {
  criativo_ads: ["copywriting.md"],
  post_feed: ["instagram-feed.md"],
  story: ["instagram-stories.md"],
  carrossel: ["instagram-feed.md"],
};
const BP_AGENTE: Record<Agente, string[]> = {
  estrategista: ["strategist.md"],
  copywriter: ["copywriting.md"],
  "diretor-arte": ["image-design.md"],
  revisor: ["review.md"],
};
function bestPractices(tipo: TipoPeca, agente: Agente) {
  const arquivos = [...new Set([...BP_TIPO[tipo], ...BP_AGENTE[agente]])];
  return arquivos.map((a) => ler(path.join(BP_DIR, a))).filter(Boolean).join("\n\n");
}

type CampoMarca = keyof typeof marca;
const ROTULO_MARCA: Record<CampoMarca, string> = {
  nome: "Marca",
  tom_de_voz: "TOM DE VOZ",
  tons: "TONS (escolher exatamente 1 por pauta e declarar no output)",
  icp: "ICP · PÚBLICO",
  oferta_atual: "OFERTA ATUAL",
  provas: "PROVAS (inventário)",
  pilares_conteudo: "PILARES DE CONTEÚDO",
  do_nots: "NUNCA FAZER",
  checklist: "CHECKLIST DE SAÍDA (conferir antes de devolver)",
};
/* O que cada agente lê da marca. A OFERTA e as PROVAS de venda só entram
   quando o pilar é venda (30/09): na v1 elas entravam em toda copy, e o
   time girava em torno de "vitrine e R$ 999" em post que devia ensinar. */
function modulo(agente: Agente | "pautas", p?: Peca): CampoMarca[] {
  const venda = p ? ehVenda(p) : false;
  switch (agente) {
    case "estrategista":
    case "pautas":
      return ["nome", "tom_de_voz", "tons", "icp", "pilares_conteudo", "do_nots", "checklist"];
    case "copywriter":
      return venda
        ? ["nome", "tom_de_voz", "tons", "icp", "oferta_atual", "provas", "do_nots", "checklist"]
        : ["nome", "tom_de_voz", "tons", "icp", "provas", "do_nots", "checklist"];
    case "diretor-arte":
      return ["nome", "do_nots"];
    case "revisor":
      return venda
        ? ["nome", "tom_de_voz", "tons", "icp", "oferta_atual", "provas", "pilares_conteudo", "do_nots", "checklist"]
        : ["nome", "tom_de_voz", "tons", "icp", "pilares_conteudo", "do_nots", "checklist"];
  }
}
const REGRAS_DURAS =
  "REGRAS DURAS: Zero travessão (o caractere —) em qualquer texto. Zero métrica inventada: número só entra se estiver no briefing ou nas provas. Nunca escrever para outros designers.";

/* Venda é o pilar "oferta", ou (sem pilar) a camada de fundo do código. */
function ehVenda(p: Peca) {
  if (p.pilar) return !PILARES[p.pilar]?.valor;
  return p.codigo ? CODIGOS[p.codigo].camada === "fundo" : false;
}

function blocoMarca(agente: Agente | "pautas", p?: Peca) {
  const partes = modulo(agente, p)
    .filter((k) => String(marca[k] || "").trim())
    .map((k) => `### ${ROTULO_MARCA[k]}\n${marca[k]}`);
  partes.push(REGRAS_DURAS);
  return partes.join("\n\n");
}

const VALOR =
  "Este post é de GERAÇÃO DE VALOR. Ele ensina, mostra bastidor, opina ou faz curadoria, e a pessoa sai dele sabendo uma coisa que não sabia. " +
  "NÃO venda: não cite a vitrine digital, o preço, a entrada, o prazo nem \"fale comigo\". O estúdio aparece pela qualidade do raciocínio, não por pedido. " +
  "A voz é a de um ESTÚDIO DE DESIGN (Rafael Razeira Estúdio) que acompanha tendências de design, IA, marca e internet e mostra como elas mudam o trabalho: workflows, ferramentas, processo, decisão. O público é quem empreende, cria ou toca um negócio pequeno, não só dona de loja; a vitrine e o lojista são UM dos assuntos possíveis, nunca o assunto padrão. Ensine com exemplo concreto do dia a dia de quem trabalha, e só depois nomeie o conceito. " +
  "O CTA do fecho é de valor: salvar para consultar, mandar para quem precisa, ou uma pergunta real para os comentários (nunca \"comente EU QUERO\").";

/* As regras duras da peça: formato, pilar e, sem pilar, a camada do código. */
function espec(p: Peca) {
  const r: string[] = [];
  if (p.tipo === "story") {
    r.push('Story 9:16: NUNCA use hashtags (hashtags fica "").');
  } else if (p.tipo === "criativo_ads") {
    r.push('Anúncio: NUNCA use hashtags (hashtags fica "").');
    r.push("CTA obrigatório e alinhado ao botão do anúncio.");
  } else {
    r.push("Hashtags: 5 a 8, sobre o ASSUNTO do post (não sobre o estúdio). Nunca mais de 10.");
  }
  if (p.tipo === "post_feed" || p.tipo === "criativo_ads") r.push("Imagem ÚNICA: exatamente 1 slide, do tipo capa.");
  if (p.pilar) {
    r.push(`Pilar: ${PILARES[p.pilar].nome} (${PILARES[p.pilar].faz}).`);
    r.push(ehVenda(p) ? "Pilar de VENDA: a oferta entra, uma só, com o CTA para o link na bio ou o direct." : VALOR);
  } else {
    const camada = p.codigo ? CODIGOS[p.codigo].camada : null;
    if (camada === "fundo") r.push("Camada FUNDO: o CTA manda para o LINK NA BIO.");
    else r.push(VALOR);
  }
  return r.map((x) => `- ${x}`).join("\n");
}

function descreverSlide(s: Slide, i: number, estilo?: Peca["estilo"]) {
  const papel = s.papel ? `, imagem: ${PAPEIS[s.papel].nome.toLowerCase()} (${PAPEIS[s.papel].faz})` : "";
  const linhas = [`Slide ${i + 1} [${s.tipo ?? "livre"}${papel}]`];
  /* 30/09: o molde decide a forma da imagem e onde o texto cai; a cena da
     Dora tem de funcionar dentro disso (a composição entra sozinha no fim
     do prompt, pelo editor) */
  const cmp = composicaoDe(s, s.papel ?? (s.tipo ? papelDe(s, s.tipo) : null), estilo);
  linhas.push(`  molde: ${s.layout ? LAYOUTS[s.layout].nome : "o padrão do papel"}`);
  linhas.push(cmp ? `  composição (já vai no fim do prompt): ${cmp.texto} (${cmp.formato})` : "  composição: este molde não leva imagem gerada");
  if (s.rotulo) linhas.push(`  etiqueta: ${s.rotulo}`);
  if (s.manchete) linhas.push(`  voz 1: ${s.manchete}`);
  if (s.batida) linhas.push(`  voz 2: ${s.batida}`);
  if (s.numero) linhas.push(`  número: ${s.numero}`);
  if (s.itens?.length) linhas.push(`  itens: ${s.itens.join(" | ")}`);
  if (s.ruim || s.bom) linhas.push(`  ruim: ${s.ruim ?? ""} | bom: ${s.bom ?? ""}`);
  if (s.img || s.img2) linhas.push("  (tem imagem que o Rafael subiu: mantenha o slide e o tipo)");
  if (s.apoio) linhas.push(`  apoio: ${s.apoio}`);
  return linhas.join("\n");
}

function descreverPeca(p: Peca) {
  const l = [`Formato: ${TIPOS[p.tipo].nome} (${TIPOS[p.tipo].w}x${TIPOS[p.tipo].h})`];
  if (p.pilar) l.push(`Pilar: ${PILARES[p.pilar].nome}`);
  if (p.codigo) l.push(`Tipo de post (tabela mestra): ${p.codigo} ${CODIGOS[p.codigo].nome}`);
  l.push(`Briefing: ${p.briefing || "(vazio)"}`);
  if (p.gancho) l.push(`Gancho: ${p.gancho}`);
  if (p.slides.length) l.push("Slides (a estrutura que o Rafael montou):\n" + p.slides.map((s, i) => descreverSlide(s, i, p.estilo)).join("\n"));
  if (p.cta) l.push(`CTA: ${p.cta}`);
  /* 30/09: a Vera via só a legenda crua (sem as hashtags, que moram noutro
     campo) e só o prompt da capa, e barrava o post por "faltam hashtags" e
     "falta o prompt do slide 4", que existiam. Ela vê o que vai ser postado. */
  const final = legendaFinal(p);
  if (final) l.push(`Legenda (exatamente como vai ser postada, com as hashtags):\n${final}`);
  if (p.prompt_capa) l.push(`Prompt da imagem do slide 1: ${p.prompt_capa}`);
  (p.estilo?.extras ?? []).forEach((x) => {
    if (x.prompt?.trim()) l.push(`Prompt da imagem do slide ${x.slide ?? "?"}: ${x.prompt.trim()}`);
  });
  return l.join("\n\n");
}

const TIPOS_DE_SLIDE =
  "capa (título nas duas vozes + uma linha de apoio), texto (uma ideia: título + parágrafo curto), conceito (etiqueta = o termo; título; apoio = a definição em até 3 linhas), " +
  "comparacao (o MESMO objeto dos dois jeitos: ruim e bom, cada um em até 14 palavras), lista (3 a 6 itens curtos, em ordem), citacao (uma tese em uma frase; apoio = a fonte, se houver), " +
  "tela (um print de página real que o Rafael vai subir: escreva o título e o apoio do que a pessoa deve notar no print), numero (um número REAL + título), fecho (o que fazer agora)";

const TAREFA: Record<Agente, string> = {
  estrategista:
    "Proponha a melhor pauta para esta peça a partir do briefing: o ângulo, a persona, a ideia central e o que a pessoa leva. " +
    "Se a peça ainda não tem pilar, recomende um em `pilar` (tendencia, conceito, comparacao, curadoria, bastidor, opiniao, case ou oferta), lembrando que 4 de cada 5 posts são de valor. " +
    "Escreva QUATRO opções de gancho em `opcoes_gancho`, com abordagens diferentes (pergunta, afirmação que confronta, imagem concreta do dia a dia da loja, dado real). " +
    "Em `gancho` repita a que você recomenda. O raciocínio vai em `notas`, curto.",
  copywriter:
    "Escreva a copy como SLIDES prontos para diagramar. O título de todo slide tem DUAS VOZES: `manchete` (voz 1, serifa leve, 1 a 4 palavras, caixa normal) e `batida` (voz 2, condensada em caixa alta, 1 a 4 palavras): lidas juntas, formam uma frase (\"Páginas que\" + \"parecem caras\"). " +
    "`destaque` é UMA palavra do título que ganha cor (opcional). Um slide, uma ideia: menos texto é melhor. " +
    "`rotulo` é uma etiqueta para o LEITOR (o termo do conceito, \"passo 2\", a fonte de uma tese) e aparece escrita no post; deixe vazio quando não houver. NUNCA ponha nele o nome do papel da imagem (\"Abertura\", \"Zoom\", \"Respiro\", \"Prova\"...): isso é instrução interna, não texto de post. " +
    `Tipos de slide: ${TIPOS_DE_SLIDE}. ` +
    "Se a peça já tem slides, RESPEITE a estrutura: mesma quantidade e mesmo `tipo` em cada posição (o Rafael montou o roteiro e pode ter subido imagens). Só crie a estrutura do zero se não houver slides. " +
    "Cada slide diz o PAPEL DA IMAGEM nele, e o texto trabalha junto com ela: na abertura o título é a promessa; no zoom o texto fala do DETALHE que a imagem aproxima; no contraste `ruim` e `bom` viram as duas etiquetas curtas (até 4 palavras cada) da mesma imagem apagada e viva; na resposta o texto responde à abertura; no fecho e no \"você\" o título é o convite. A história avança de slide para slide: abrir, aproximar, explicar, provar, fechar. " +
    "LIMITES DE TEXTO POR PAPEL (o texto mora em cima ou ao lado da imagem): abertura, apoio de até 10 palavras; zoom, apoio de até 18; resposta, até 25; fecho e \"você\", apoio de até 18. O `cta` tem até 5 palavras (ele vira selo no fecho); o convite longo mora na legenda. " +
    "Preencha também `gancho` (a primeira linha da legenda), `cta` (conforme a regra do pilar), `hashtags` (string única) e `legenda` (primeira linha forte, 2 a 5 parágrafos curtos que entregam o valor também para quem não abrir o carrossel, o CTA no fim, sem hashtags dentro). " +
    "Seu raciocínio vai em `notas`, curto.",
  /* 30/09: a régua da imagem saiu do código e foi para um arquivo do
     Rafael, `pipeline/data/imagem-ia.md` na pasta do squad, que ele edita
     à mão ("quero modelar para deixar exatamente como eu quero"). Aqui fica
     só a moldura; o gosto mora lá. */
  "diretor-arte":
    /* 30/09, pedido do Rafael: "cada slide é melhor colocar uma geração de
       imagem; nem todos vão precisar, mas alguns vão, para não ficar
       repetitivo". A Dora decide SLIDE A SLIDE. */
    "Escreva os prompts que o Rafael vai colar no ChatGPT, SLIDE A SLIDE, seguindo À RISCA a régua da imagem que está neste prompt (ela é do Rafael e vence qualquer instrução da sua definição de agente). " +
    "Leia o roteiro (o tipo e o papel da imagem de cada slide) e decida, para cada slide, uma de três coisas: " +
    "(a) GERAÇÃO PRÓPRIA: o slide ganha uma imagem nova, uma cena diferente das outras (outro ângulo, outro momento, outro personagem ou objeto), no mesmo mundo, paleta e luz da série; " +
    "(b) REAPROVEITA: só o slide de papel \"fecho\" (a capa voltando menor) usa a imagem de outro slide, e ele não entra na lista; " +
    "(c) SEM IMAGEM: slide de respiro de cor, lista ou número, que também não entra na lista. " +
    "Regra do Rafael (30/09): CADA SLIDE COM IMAGEM TEM A SUA GERAÇÃO, com um prompt específico para aquele slide; o molde é fixo e as imagens entram nele, sem um slide herdar a imagem do outro. Zoom e contraste também ganham geração própria (o zoom é um close fotografado do detalhe; o contraste é uma cena que funciona apagada e viva). Cada imagem nova é uma cena diferente (outro ângulo, momento, personagem ou objeto) no mesmo mundo, paleta e luz. A imagem do slide 1 mostra o ASSUNTO do post (se o post é sobre uma ferramenta, a capa é a ferramenta, representada como objeto ou personagem, sem logo nem marca registrada). Declare em `respiro` onde a imagem do slide 1 deixa espaço para o título (topo-esquerda, topo-direita, topo ou base). " +
    "Se o slide tem papel \"voce\" (só em Bastidor, Opinião e Oferta), o prompt dele começa por \"Using the attached photo of me as the face reference,\" e mostra o Rafael no mesmo mundo. " +
    "Em `slide` vai o NÚMERO do slide (1, 2, 3...). Cada prompt em INGLÊS, um parágrafo específico: assunto, composição, ângulo de câmera, luz, paleta com cores nomeadas, material, época, começando pela abertura fixa da régua. " +
    "SEQUÊNCIA (30/09, pedido do Rafael: \"progressão, sequência\"): a série é UMA história contada em planos, como um storyboard. Primeiro escreva a `biblia`, em inglês: a descrição fixa dos personagens (espécie ou pessoa, material, cor, roupa, acessório de cada um) e do mundo (cenário, paleta, luz, câmera). " +
    "Todo prompt repete a bíblia IGUAL, palavra por palavra, e depois descreve o PRÓXIMO PLANO da história: o que acontece depois do slide anterior (o personagem chega, trabalha, erra, é corrigido, conclui), com câmera e enquadramento que variam como num filme (plano aberto, close, detalhe, plano de reação). " +
    "Os prompts do slide 2 em diante começam por \"Continue the same series as the attached previous image: same characters, same world, same lighting.\", porque o Rafael gera na MESMA conversa do ChatGPT anexando a imagem anterior. " +
    "COMPOSIÇÃO PELO MOLDE (30/09): o roteiro diz o molde de cada slide e a composição dele (a forma da área da imagem e onde o texto cai). O editor acrescenta essa composição e a proporção SOZINHO no fim do prompt; você NÃO escreve proporção nem espaço vazio. Você escreve a CENA para funcionar dentro dela (num círculo, um assunto só e centrado; numa coluna estreita, uma cena vertical; com o texto no pé, o assunto no alto) e a cena ilustra o que o texto DAQUELE slide diz. " +
    "Em `notas`, em português, uma frase: a história que a série conta, plano a plano.",
  revisor:
    "LINHAS VERMELHAS (qualquer uma = REJECT): número com destaque sem ser real; post de VALOR que vende (cita vitrine, preço, prazo ou pede contato); CTA fora da regra do pilar; post que não ensina nada concreto; tese que soa dogma; travessão em qualquer texto; título que não cabe (voz 1 ou voz 2 com mais de 5 palavras). " +
    "NÃO JULGUE A COR NEM O ESTILO DA IMAGEM: desde 30/09 o feed usa as direções Pôster ácido e Colagem, com muita cor e a régua de imagem do Rafael; o papel e a tinta da seção 4.1 valem só para o site. Avalie o visual apenas por: a imagem serve à ideia do post e o texto de cada slide trabalha com o papel da imagem nele. " +
    "Avalie contra sua rubrica e emita `veredito` conforme o schema, e um resumo curto em `notas`.",
};

const SCHEMA: Record<Agente, string> = {
  estrategista:
    '{"notas": "string", "pilar": "conceito", "opcoes_gancho": ["string","string","string","string"], "gancho": "string"}',
  copywriter:
    '{"notas": "string", "slides": [{"tipo": "capa", "rotulo": "string", "manchete": "string", "batida": "string", "destaque": "string", "apoio": "string", "numero": "string", "itens": ["string"], "ruim": "string", "bom": "string"}], "gancho": "string", "cta": "string", "hashtags": "string", "legenda": "string"}',
  "diretor-arte":
    '{"notas": "string", "biblia": "string (os personagens e o mundo, em inglês, idênticos em toda imagem)", "imagens": [{"slide": 1, "papel": "abertura", "prompt": "string", "respiro": "topo-esquerda|topo-direita|topo|base"}, {"slide": 3, "papel": "resposta", "prompt": "string"}]}',
  revisor:
    '{"notas": "string", "veredito": {"status": "APPROVE|CONDITIONAL|REJECT", "media_ponderada": 0.0, "bloqueadores": ["string"], "correcoes_prioritarias": ["string"]}}',
};

function montarPrompt(agente: Agente, p: Peca, anteriores: string[] = []) {
  const a = AGENTES[agente];
  const secoes = [
    `Você é ${a.nome}, do time de marketing do Rafael Razeira Estúdio. Incorpore a definição de agente abaixo. ` +
      "Não use nenhuma ferramenta, não leia nem escreva arquivos: todo o contexto está neste prompt.",
    `## Contexto da marca\n\n${blocoMarca(agente, p)}`,
    `## Definição do agente\n\n${agenteMd(agente)}`,
  ];
  const pos = posicionamento();
  if (pos) secoes.push(`## Posicionamento (ALICERCE: obedeça o teste da 2.5 e o "nunca entra" da 3.4)\n\n${pos}`);
  const bp = bestPractices(p.tipo, agente);
  if (bp) secoes.push(`## Best practices do formato\n\n${bp}`);
  secoes.push(`## Peça atual\n\n${descreverPeca(p)}`);
  secoes.push(`## Regras duras DESTA peça (acima de qualquer template da sua definição)\n\n${espec(p)}`);
  if (agente === "copywriter" && p.veredito && p.veredito.status !== "APPROVE") {
    const v = p.veredito;
    secoes.push(
      "## A Vera reprovou a versão anterior: corrija isto antes de qualquer outra coisa\n\n" +
        [...(v.bloqueadores ?? []), ...(v.correcoes_prioritarias ?? [])].map((x) => `- ${x}`).join("\n"),
    );
  }
  if (agente === "diretor-arte") {
    const regua = ler(path.join(SQUAD, "pipeline", "data", "imagem-ia.md"));
    const prop = p.tipo === "story" ? "9:16 (1080x1920)" : "4:5 (1080x1350)";
    if (regua) secoes.push(`## A régua da imagem (do Rafael, acima de tudo)\n\n${regua.replaceAll("{PROPORCAO}", prop)}`);
  }
  if (agente === "diretor-arte" && anteriores.length) {
    secoes.push(
      "## Imagens pedidas nas últimas peças (NÃO repita a cena, a paleta nem o tipo de imagem)\n\n" +
        anteriores.map((x) => `- ${x.slice(0, 240)}`).join("\n"),
    );
  }
  const proporcao = p.tipo === "story" ? "9:16 (1080x1920)" : "4:5 (1080x1350)";

  secoes.push(
    `## Sua tarefa\n\n${TAREFA[agente].replace("{PROPORCAO}", proporcao)}`,
  );
  secoes.push(formatoSaida(SCHEMA[agente]));
  return secoes.join("\n\n---\n\n");
}

function formatoSaida(schema: string) {
  return (
    "## Formato de saída (OBRIGATÓRIO)\n\n" +
    "Responda APENAS com um objeto JSON válido, sem markdown, sem cercas de código, sem texto antes ou depois. " +
    "Os templates da sua definição de agente descrevem seu método de raciocínio, NÃO o formato de saída: condense o raciocínio em `notas`.\n\n" +
    `Schema:\n${schema}\n\n` +
    "Confira que o JSON está completo e fechado. Nunca use travessão."
  );
}

function montarPromptPautas(n: number, tipo: TipoPeca | null, jaFeitas: string[]) {
  const secoes = [
    "Você é Paula, estrategista de conteúdo do Rafael Razeira Estúdio. Incorpore a definição abaixo. Não use ferramentas.",
    `## Contexto da marca\n\n${blocoMarca("pautas")}`,
    `## Definição do agente\n\n${agenteMd("estrategista")}`,
    `## Posicionamento (ALICERCE)\n\n${posicionamento()}`,
  ];
  const mem = memoria();
  if (mem) secoes.push(`## Memória do squad (o que já funcionou e o que o Rafael pediu)\n\n${mem}`);
  if (jaFeitas.length) {
    secoes.push(
      "## Pautas que JÁ EXISTEM: nenhuma delas pode voltar\n\n" +
        "Regra do Rafael (30/09): pauta usada não entra de novo, nem com outras palavras, nem com outro ângulo do mesmo assunto. " +
        "A ÚNICA exceção é PROGRESSÃO: um post que avança o que aquele ensinou (a parte 2, o aprofundamento, o caso prático, o erro comum depois do conceito). " +
        "Nesse caso preencha `progressao_de` com o gancho da pauta original, copiado da lista, e diga no briefing o que este post acrescenta. Sem progressão, `progressao_de` fica \"\".\n\n" +
        jaFeitas.map((x) => `- ${x}`).join("\n"),
    );
  }
  const pilares = (Object.keys(PILARES) as Pilar[]).map((k) => `${k} (${PILARES[k].nome}: ${PILARES[k].faz})`).join("; ");
  const nVenda = Math.max(0, Math.round(n / 5));
  secoes.push(
    "## Sua tarefa\n\n" +
      `Proponha ${n} pautas para o Instagram do estúdio. A regra é 80/20: ${n - nVenda} de VALOR e ${nVenda} de venda (pilar oferta). ` +
      `Pilares: ${pilares}. Varie os pilares de valor; não repita o mesmo pilar mais de duas vezes. ` +
      "Conteúdo de valor mostra um estúdio de design olhando o mundo: tendências (IA, ferramentas novas, design, marca, internet), como melhorar workflows e processo, bastidores de decisões de design, opiniões sobre o mercado criativo e digital. Vitrine e loja são só UM dos temas possíveis, no máximo 1 a cada 5 pautas. " +
      "Pauta de valor não cita a vitrine nem o preço do estúdio. " +
      (tipo ? `Todas no formato ${TIPOS[tipo].nome}. ` : "Formato: carrossel na maioria; post único para tese curta; story para bastidor. ") +
      "Cada pauta: `pilar`, `tipo` (carrossel|post_feed|story), `briefing` (2 a 4 frases: o tema, o ângulo, o exemplo concreto e o que a pessoa leva) e `gancho` (a primeira frase). " +
      "Número só se estiver nas provas da marca ou na memória com fonte.",
  );
  secoes.push(
    formatoSaida('{"notas": "string", "pautas": [{"pilar": "conceito", "tipo": "carrossel", "briefing": "string", "gancho": "string"}]}'),
  );
  return secoes.join("\n\n---\n\n");
}

/* ============================================================
   O CLAUDE -P
   ============================================================ */
const SEM_FERRAMENTAS =
  "Bash,Edit,Write,Read,Glob,Grep,WebFetch,WebSearch,Task,TodoWrite,Skill,SlashCommand,NotebookEdit," +
  "KillShell,BashOutput,EnterPlanMode,ExitPlanMode,ListMcpResourcesTool,ReadMcpResourceTool";

function fecharJson(txt: string) {
  const pilha: string[] = [];
  let emString = false;
  let escape = false;
  for (const ch of txt) {
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { emString = !emString; continue; }
    if (emString) continue;
    if (ch === "{" || ch === "[") pilha.push(ch);
    else if (ch === "}" || ch === "]") pilha.pop();
  }
  if (emString) return txt;
  return txt + pilha.reverse().map((c) => (c === "{" ? "}" : "]")).join("");
}

function extrairJson(texto: string) {
  const cerca = texto.match(/```(?:json)?\s*([\s\S]*?)```/);
  const bruto = cerca ? cerca[1] : texto.slice(texto.indexOf("{"));
  try {
    return JSON.parse(bruto.slice(0, bruto.lastIndexOf("}") + 1));
  } catch {
    return JSON.parse(fecharJson(bruto.trim()));
  }
}

/* `visao`: a pasta onde está a imagem que o agente precisa VER. Só nesse
   caso o Read é liberado, e o processo roda DENTRO dessa pasta, que tem só a
   imagem: o Read abre o disco inteiro (o studio já registrou que o escopo por
   caminho não é respeitado), então a mitigação é o prompt listar o arquivo
   exato e a pasta não ter mais nada. */
function rodarClaude(prompt: string, visao?: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const env = {} as NodeJS.ProcessEnv;
    for (const [k, v] of Object.entries(process.env)) {
      if (k === "ANTHROPIC_API_KEY" || k === "CLAUDECODE" || k === "CLAUDE_PID") continue;
      if (k.startsWith("CLAUDE_CODE_")) continue;
      env[k] = v;
    }
    const args = [
      "-p", "--output-format", "json",
      "--strict-mcp-config", "--mcp-config", '{"mcpServers":{}}',
      "--max-turns", visao ? "8" : "3",
      "--disallowedTools", visao ? SEM_FERRAMENTAS.replace("Read,", "") : SEM_FERRAMENTAS,
    ];
    if (visao) args.push("--allowedTools", "Read");
    if (MODELO) args.push("--model", MODELO);

    const filho = spawn(CLAUDE_BIN, args, { cwd: visao ?? os.tmpdir(), env, windowsHide: true });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      if (process.platform === "win32") spawn("taskkill", ["/pid", String(filho.pid), "/T", "/F"], { windowsHide: true });
      else filho.kill("SIGKILL");
      reject(new Error("O agente passou de 4 minutos e foi interrompido."));
    }, 240_000);

    filho.stdout.on("data", (d) => (out += d));
    filho.stderr.on("data", (d) => (err += d));
    filho.on("error", (e) => {
      clearTimeout(timer);
      reject(new Error(`Não consegui abrir o claude (${CLAUDE_BIN}): ${e.message}`));
    });
    filho.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(`O claude saiu com código ${code}: ${(out || err).slice(0, 400)}`));
      let fora: { subtype?: string; result?: string };
      try {
        fora = JSON.parse(out);
      } catch {
        return reject(new Error("O claude respondeu fora do JSON."));
      }
      if (fora.subtype !== "success" || typeof fora.result !== "string") {
        return reject(new Error(`O agente não terminou (${fora.subtype ?? "?"}).`));
      }
      try {
        resolve(extrairJson(fora.result));
      } catch {
        reject(new Error(`A resposta do agente não é JSON: ${fora.result.slice(0, 300)}`));
      }
    });
    filho.stdin.on("error", () => {});
    filho.stdin.write(prompt);
    filho.stdin.end();
  });
}

/* ============================================================
   APLICAR O RESULTADO NA PEÇA
   ============================================================ */
const texto = (v: unknown) => (typeof v === "string" ? v.replace(/\s*—\s*/g, ", ").trim() : "");

async function lerPeca(id: string) {
  const { data, error } = await supabase.from("mkt_pecas").select("*").eq("id", id).single<Peca>();
  if (error || !data) throw new Error("A peça sumiu antes do agente terminar.");
  return data;
}

async function gravar(id: string, campos: Partial<Peca>) {
  const { error } = await supabase
    .from("mkt_pecas")
    .update({ ...campos, atualizado_em: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`Não gravei a peça: ${error.message}`);
}

/* os slides (numerados a partir de 1) que podem ter imagem e ainda não têm
   prompt: todos, menos o "só texto" e os que levam print (prova, tela,
   comparação) */
function slidesSemPrompt(p: Peca) {
  const extras = p.estilo?.extras ?? [];
  return p.slides
    .map((s, i) => {
      const papel = s.papel ?? (s.tipo ? papelDe(s, s.tipo) : null);
      if (s.layout === "so-texto" || papel === "prova" || s.tipo === "tela" || s.tipo === "comparacao") return 0;
      if (i === 0) return p.prompt_capa.trim() ? 0 : 1;
      const idx = s.imagem ?? 0;
      const doSlide = idx > 0 ? extras[idx - 1] : extras.find((x) => x.slide === i + 1);
      return doSlide?.prompt?.trim() ? 0 : i + 1;
    })
    .filter(Boolean);
}

/* o slide passa a apontar para a sua imagem; o respiro de cor não desenha
   imagem, então com imagem ele vira "imagem própria" (a menos que tenha molde) */
function comImagem(s: Slide, indice: number): Slide {
  const papel = s.papel ?? (s.tipo ? papelDe(s, s.tipo) : undefined);
  return { ...s, imagem: indice, papel: papel === "respiro" && !s.layout ? "resposta" : papel };
}

async function rodarAgente(agente: Agente, pecaId: string, entrada: Record<string, unknown> = {}) {
  const p = await lerPeca(pecaId);
  console.log(`  ${AGENTES[agente].nome} escrevendo ${AGENTES[agente].faz}…`);
  /* A Dora vê as últimas imagens pedidas, para cada peça sair numa direção
     diferente: o feed "bem diverso" que o Rafael pediu. */
  let anteriores: string[] = [];
  if (agente === "diretor-arte") {
    const { data } = await supabase
      .from("mkt_pecas")
      .select("prompt_capa")
      .neq("id", pecaId)
      .neq("prompt_capa", "")
      .order("atualizado_em", { ascending: false })
      .limit(8);
    anteriores = (data ?? []).map((x) => String(x.prompt_capa));
  }
  /* "Continuar a série a partir da capa": a Dora VÊ a imagem que o Rafael
     gerou e reescreve os prompts seguintes em cima dela (30/09: a capa do
     Dots veio com bonecos de pelúcia, e os prompts seguintes pediam esferas
     lisas; a série quebraria). */
  let pastaVisao: string | undefined;
  let continuar = "";
  /* baixa uma imagem do bucket para a pasta que a Dora pode ler */
  const baixar = async (caminho: string, base: string) => {
    const { data: arquivo, error } = await supabase.storage.from("marketing").download(caminho);
    if (error || !arquivo) throw new Error("Não consegui baixar a imagem para a Dora ver.");
    pastaVisao ??= fs.mkdtempSync(path.join(os.tmpdir(), "mkt-capa-"));
    const ext = (caminho.split(".").pop() || "png").toLowerCase();
    const nome = `${base}.${ext === "webp" || ext === "jpg" || ext === "jpeg" ? ext : "png"}`;
    fs.writeFileSync(path.join(pastaVisao, nome), Buffer.from(await arquivo.arrayBuffer()));
    return nome;
  };

  /* "Outra versão deste slide" (30/09): o Rafael escreve o que quer mudar
     e a Dora refaz SÓ o prompt daquele slide, vendo a capa e a imagem atual
     dele, sem mexer nos outros. */
  const slideAlvo = typeof entrada.slide === "number" ? Math.round(entrada.slide) : 0;
  if (agente === "diretor-arte" && entrada.modo === "slide" && slideAlvo >= 1 && slideAlvo <= p.slides.length) {
    const s = p.slides[slideAlvo - 1];
    const idx = slideAlvo === 1 ? 0 : s?.imagem ?? -1;
    const extra = idx > 0 ? p.estilo?.extras?.[idx - 1] : undefined;
    const promptAtual = slideAlvo === 1 ? p.prompt_capa : extra?.prompt ?? "";
    const vistas: string[] = [];
    if (p.fundo) vistas.push(`\`${await baixar(p.fundo, "capa")}\` (a capa, slide 1)`);
    if (extra?.caminho) vistas.push(`\`${await baixar(extra.caminho, "slide-atual")}\` (a imagem que o slide ${slideAlvo} tem hoje)`);
    continuar =
      `## OUTRA VERSÃO DO SLIDE ${slideAlvo}, E SÓ DELE\n\n` +
      `O pedido do Rafael, que manda sobre tudo: "${String(entrada.instrucao ?? "").trim() || "uma versão diferente, mais forte"}".\n\n` +
      (vistas.length ? `Leia com a ferramenta Read: ${vistas.join(" e ")}. Não leia nenhum outro arquivo.\n\n` : "") +
      (promptAtual ? `O prompt atual deste slide:\n${promptAtual}\n\n` : "") +
      (p.estilo?.biblia ? `A bíblia da série (mantenha IGUAL no prompt novo):\n${p.estilo.biblia}\n\n` : "") +
      `Escreva UM prompt novo só para o slide ${slideAlvo}, atendendo o pedido, no mesmo mundo e com os mesmos personagens, como um plano da mesma história. ` +
      `Devolva \`imagens\` com UM item só: {"slide": ${slideAlvo}, "prompt": "..."}. Deixe \`biblia\` vazia se ela não mudou.`;
  } else if (agente === "diretor-arte" && entrada.modo === "faltantes") {
    /* "Do slide 4 adiante não tem os prompts" (30/09): a Dora escreve só os
       que faltam, a partir do texto de cada slide e do molde dele */
    const faltam = slidesSemPrompt(p);
    if (!faltam.length) throw new Error("Todos os slides com imagem já têm prompt.");
    const vista = p.fundo ? `\`${await baixar(p.fundo, "capa")}\`` : "";
    continuar =
      `## OS PROMPTS QUE FALTAM: slides ${faltam.join(", ")}\n\n` +
      "Pedido do Rafael (30/09): todo slide pode ter a sua imagem gerada, e o prompt nasce do que o slide DIZ e do molde dele. " +
      (vista ? `Leia com a ferramenta Read ${vista} (a capa, slide 1): a série continua ESTA imagem. Não leia nenhum outro arquivo. ` : "") +
      (p.estilo?.biblia ? `A bíblia da série, IGUAL em todo prompt:\n${p.estilo.biblia}\n\n` : "") +
      `Escreva UM prompt para cada um destes slides, e só deles: ${faltam.join(", ")}. Cada um é um plano diferente da mesma história, ilustra o texto daquele slide e funciona na composição do molde dele. ` +
      "Um slide que hoje é respiro de cor ou lista ganha uma imagem que acompanha o texto, sem repetir a cena de outro slide. Devolva `imagens` só com esses slides; deixe `biblia` vazia se ela não mudou.";
  } else if (agente === "diretor-arte" && entrada.modo === "continuar" && p.fundo) {
    const nome = await baixar(p.fundo, "capa");
    continuar =
      "## A CAPA JÁ FOI GERADA: continue a partir dela\n\n" +
      `Leia o arquivo \`${nome}\` (na pasta atual) com a ferramenta Read. É a imagem do slide 1 que o Rafael gerou no ChatGPT, e ela MANDA sobre o prompt antigo da capa. ` +
      "Descreva o que existe nela de verdade (personagens, material, roupas e acessórios, cenário, objetos, paleta, luz, câmera) e escreva isso na `biblia`. " +
      "Depois reescreva os prompts dos OUTROS slides com imagem para continuar ESTA imagem: os mesmos personagens, iguais, e o mesmo mundo. NÃO devolva o slide 1 na lista (a capa já existe). " +
      "Não leia nenhum outro arquivo.";
  }
  const prompt = montarPrompt(agente, p, anteriores) + (continuar ? `\n\n---\n\n${continuar}` : "");
  let r: Record<string, unknown>;
  try {
    r = await rodarClaude(prompt, pastaVisao);
  } finally {
    if (pastaVisao) fs.rmSync(pastaVisao, { recursive: true, force: true });
  }
  const notas = { ...p.notas, [agente]: texto(r.notas) };

  if (agente === "estrategista") {
    const codigo = typeof r.codigo === "string" && r.codigo in CODIGOS ? (r.codigo as Codigo) : null;
    const pilar = typeof r.pilar === "string" && r.pilar in PILARES ? (r.pilar as Pilar) : null;
    const campos: Partial<Peca> = {
      notas,
      gancho: texto(r.gancho) || p.gancho,
      opcoes_gancho: Array.isArray(r.opcoes_gancho) ? r.opcoes_gancho.map(texto).filter(Boolean) : [],
      codigo: p.codigo ?? codigo,
    };
    /* A coluna pilar só existe depois da migração de 30/09. */
    if (!p.pilar && pilar && "pilar" in p) campos.pilar = pilar;
    await gravar(pecaId, campos);
  } else if (agente === "copywriter") {
    const lista = (v: unknown) => (Array.isArray(v) ? v.map(texto).filter(Boolean).slice(0, 6) : undefined);
    const novos: Slide[] = (Array.isArray(r.slides) ? r.slides : [])
      .map((s: Record<string, unknown>) => ({
        tipo: typeof s.tipo === "string" && s.tipo in TIPOS_SLIDE ? (s.tipo as Slide["tipo"]) : undefined,
        rotulo: texto(s.rotulo) || undefined,
        manchete: texto(s.manchete),
        batida: texto(s.batida) || undefined,
        destaque: texto(s.destaque) || undefined,
        apoio: texto(s.apoio) || undefined,
        numero: texto(s.numero) || undefined,
        itens: lista(s.itens),
        ruim: texto(s.ruim) || undefined,
        bom: texto(s.bom) || undefined,
      }))
      .filter((s: Slide) => s.manchete || s.batida || s.itens?.length || s.ruim || s.bom);
    if (!novos.length) throw new Error("O Caetano devolveu a peça sem slides.");
    /* O design é do Rafael: o que ele decidiu em cada slide (superfície,
       imagens, tamanho, posição) fica onde está. O Caetano só troca texto. */
    const slides: Slide[] = novos.map((n, i) => {
      const velho = p.slides[i];
      if (!velho) return n;
      /* 30/09: a lista de campos guardados era fechada e esquecia o que veio
         depois (leitura, molde, texto solto, cor do título e do destaque): o
         Caetano apagava a "Faixa" de um post. Agora TUDO do slide fica, e só
         os campos de texto são trocados. */
      return {
        ...velho,
        rotulo: n.rotulo,
        manchete: n.manchete,
        batida: n.batida,
        destaque: n.destaque,
        apoio: n.apoio,
        numero: n.numero,
        itens: n.itens,
        ruim: n.ruim,
        bom: n.bom,
        tipo: velho.tipo ?? n.tipo,
        papel: velho.papel ?? n.papel,
      };
    });
    const semHashtag = p.tipo === "story" || p.tipo === "criativo_ads";
    await gravar(pecaId, {
      notas,
      slides,
      gancho: texto(r.gancho) || p.gancho,
      cta: texto(r.cta),
      hashtags: semHashtag ? "" : texto(r.hashtags),
      legenda: texto(r.legenda),
      corpo: slides.map((s, i) => `Slide ${i + 1}: ${[s.manchete, s.batida].filter(Boolean).join(" ")}${s.apoio ? `\n${s.apoio}` : ""}`).join("\n\n"),
      /* Copy nova, veredito velho não vale mais. */
      veredito: null,
    });
  } else if (agente === "diretor-arte") {
    /* Imagem por slide: a do slide 1 é a abertura (vira prompt_capa, e o
       respiro dela diz onde o título entra); as outras viram extras, cada
       uma presa ao slide para o qual foi pedida, e o slide passa a apontar
       para ela. Um arquivo já colado para o MESMO slide fica. */
    type Pedida = { slide: number; prompt: string; papel?: string; respiro?: string };
    if (entrada.modo === "slide" && slideAlvo >= 1) {
      const nova = (Array.isArray(r.imagens) ? r.imagens : [])
        .map((x: Record<string, unknown>) => (typeof x.prompt === "string" ? x.prompt.trim() : ""))
        .find(Boolean);
      if (!nova) throw new Error("A Dora devolveu sem o prompt novo do slide.");
      if (slideAlvo === 1) {
        await gravar(pecaId, { notas, prompt_capa: nova });
        return null;
      }
      const estilo = { ...(p.estilo ?? {}) } as Peca["estilo"];
      const extras = [...(estilo.extras ?? [])];
      const atualIdx = p.slides[slideAlvo - 1]?.imagem ?? 0;
      let slides = p.slides;
      if (atualIdx > 0 && extras[atualIdx - 1]) {
        /* o prompt muda; a imagem antiga fica até você colar a nova */
        extras[atualIdx - 1] = { ...extras[atualIdx - 1], prompt: nova, slide: slideAlvo };
      } else {
        extras.push({ prompt: nova, slide: slideAlvo });
        slides = p.slides.map((s, i) => (i === slideAlvo - 1 ? comImagem(s, extras.length) : s));
      }
      estilo.extras = extras;
      await gravar(pecaId, { notas, estilo, slides });
      return null;
    }
    if (entrada.modo === "faltantes") {
      const faltam = new Set(slidesSemPrompt(p));
      const novas = (Array.isArray(r.imagens) ? r.imagens : [])
        .map((x: Record<string, unknown>) => ({
          slide: typeof x.slide === "number" ? Math.round(x.slide) : 0,
          prompt: typeof x.prompt === "string" ? x.prompt.trim() : "",
        }))
        .filter((x: { slide: number; prompt: string }) => x.prompt && faltam.has(x.slide));
      if (!novas.length) throw new Error("A Dora devolveu sem os prompts que faltavam.");
      const estilo = { ...(p.estilo ?? {}) } as Peca["estilo"];
      const extras = [...(estilo.extras ?? [])];
      let slides = [...p.slides];
      let capa = p.prompt_capa;
      for (const n of novas) {
        if (n.slide === 1) {
          capa = n.prompt;
          continue;
        }
        const atualIdx = slides[n.slide - 1]?.imagem ?? 0;
        if (atualIdx > 0 && extras[atualIdx - 1]) {
          extras[atualIdx - 1] = { ...extras[atualIdx - 1], prompt: n.prompt, slide: n.slide };
        } else {
          extras.push({ prompt: n.prompt, slide: n.slide });
          slides = slides.map((s, i) => (i === n.slide - 1 ? comImagem(s, extras.length) : s));
        }
      }
      if (typeof r.biblia === "string" && r.biblia.trim() && !estilo.biblia) estilo.biblia = r.biblia.trim();
      estilo.extras = extras;
      await gravar(pecaId, { notas, estilo, slides, prompt_capa: capa });
      return null;
    }
    const continuando = entrada.modo === "continuar" && Boolean(p.fundo);
    const lista: Pedida[] = (Array.isArray(r.imagens) ? r.imagens : [])
      .map((x: Record<string, unknown>, k: number) => ({
        slide: typeof x.slide === "number" ? Math.round(x.slide) : k + 1,
        prompt: typeof x.prompt === "string" ? x.prompt.trim() : "",
        papel: typeof x.papel === "string" ? x.papel : undefined,
        respiro: typeof x.respiro === "string" ? x.respiro : undefined,
      }))
      .filter((x: Pedida) => x.prompt && x.slide >= 1 && x.slide <= Math.max(1, p.slides.length));
    const legado = typeof r.prompt_capa === "string" ? r.prompt_capa.trim() : "";
    if (!lista.length && legado) lista.push({ slide: 1, prompt: legado, papel: "abertura" });
    if (!lista.length) throw new Error("A Dora devolveu sem nenhum prompt de imagem.");
    lista.sort((a, b) => a.slide - b.slide);
    /* continuando, a capa é a imagem que já existe: o prompt dela fica */
    const primeira = continuando
      ? { slide: 1, prompt: p.prompt_capa, papel: "abertura" as string | undefined, respiro: p.estilo?.respiro as string | undefined }
      : lista.find((x) => x.slide === 1) ?? lista[0];
    const resto = lista.filter((x) => x !== primeira && x.slide !== 1).slice(0, 5);

    const estilo = { ...(p.estilo ?? {}) } as Peca["estilo"];
    if (primeira.respiro && primeira.respiro in RESPIROS) estilo.respiro = primeira.respiro as Peca["estilo"]["respiro"];
    if (typeof r.biblia === "string" && r.biblia.trim()) estilo.biblia = r.biblia.trim();
    const antigas = p.estilo?.extras ?? [];
    estilo.extras = resto.map((x) => ({
      prompt: x.prompt,
      papel: x.papel,
      slide: x.slide,
      caminho: antigas.find((a) => a.slide === x.slide)?.caminho,
    }));

    /* cada slide com geração própria aponta para ela; um slide de respiro
       que ganhou imagem vira "imagem própria" (a imagem ao lado do texto) */
    const slides = p.slides.map((s, i) => {
      const k = resto.findIndex((x) => x.slide === i + 1);
      if (k < 0) return s;
      const papel = !s.papel || s.papel === "respiro" || s.papel === "prova" ? "resposta" : s.papel;
      return { ...s, imagem: k + 1, papel };
    });
    await gravar(pecaId, { notas, prompt_capa: primeira.prompt, estilo, slides });
  } else {
    const v = r.veredito as Peca["veredito"];
    if (!v?.status) throw new Error("A Vera devolveu sem veredito.");
    await gravar(pecaId, { notas, veredito: v });
    return v.status;
  }
  return null;
}

async function etapa(pedidoId: string, nome: string) {
  await supabase.from("mkt_pedidos").update({ etapa: nome }).eq("id", pedidoId);
}

async function rodarTudo(pedido: Pedido) {
  const id = pedido.peca_id!;
  for (const agente of ORDEM_AGENTES) {
    await etapa(pedido.id, agente);
    const status = await rodarAgente(agente, id);
    /* Um ciclo de correção, como no studio: a Vera reprovou, o Caetano
       reescreve com os bloqueadores dela, e ela lê de novo. Uma vez só:
       dois REJECT seguidos é pauta ruim, e aí quem decide é o Rafael. */
    if (agente === "revisor" && status === "REJECT") {
      console.log("  A Vera reprovou. O Caetano refaz com os bloqueadores dela.");
      await etapa(pedido.id, "copywriter");
      await rodarAgente("copywriter", id);
      await etapa(pedido.id, "revisor");
      await rodarAgente("revisor", id);
    }
  }
}

/* Duas pautas são "a mesma" quando dividem metade das palavras que
   importam (sem acento, sem palavra curta). É grosseiro de propósito: pega
   o "O cliente confere antes de pagar" reescrito como "O que o cliente
   confere antes de comprar", que é exatamente a repetição que o Rafael
   não quer, e deixa passar assunto vizinho com ideia nova. */
function palavras(t: string) {
  return new Set(
    t
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((p) => p.length > 3),
  );
}
function parecida(a: string, b: string) {
  const A = palavras(a);
  const B = palavras(b);
  if (A.size < 3 || B.size < 3) return false;
  let comum = 0;
  for (const p of A) if (B.has(p)) comum++;
  return comum / Math.min(A.size, B.size) >= 0.5;
}

async function rodarPautas(pedido: Pedido) {
  const n = Math.min(Math.max(Number(pedido.entrada.n) || 5, 1), 10);
  const tipo = (pedido.entrada.tipo as TipoPeca) || null;
  /* TODAS as pautas que já existem, e não as últimas 40: pauta usada não
     volta (regra de 30/09), e uma de agosto conta tanto quanto a de ontem. */
  const { data: existentes } = await supabase
    .from("mkt_pecas")
    .select("gancho, briefing")
    .order("criado_em", { ascending: false })
    .limit(500);
  const jaFeitas = (existentes ?? [])
    .map((x) => String(x.gancho || x.briefing || "").replace(/\s+/g, " ").slice(0, 140))
    .filter(Boolean);

  console.log(`  Paula propondo ${n} pautas…`);
  const r = await rodarClaude(montarPromptPautas(n, tipo, jaFeitas));
  /* A trava não confia só no prompt: pauta parecida demais com uma que já
     existe é descartada aqui, a menos que venha declarada como progressão. */
  const pautas = (Array.isArray(r.pautas) ? r.pautas : []).filter((x: Record<string, unknown>) => {
    const progressao = texto(x.progressao_de);
    if (progressao) return true;
    const alvo = `${texto(x.gancho)} ${texto(x.briefing).slice(0, 160)}`;
    const repetida = jaFeitas.find((j) => parecida(alvo, j));
    if (repetida) console.log(`  descartada por repetir "${repetida.slice(0, 70)}": ${texto(x.gancho).slice(0, 70)}`);
    return !repetida;
  });
  /* As pautas nascem alternando as duas direções, a partir da oposta à da
     última peça criada. */
  const { data: ultima } = await supabase
    .from("mkt_pecas")
    .select("estilo")
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  const comeca = (ultima as { estilo?: { direcao?: string } } | null)?.estilo?.direcao === "acido" ? 1 : 0;
  const linhas = pautas
    .map((x: Record<string, unknown>, k: number) => {
      const formato = (["carrossel", "post_feed", "story"].includes(String(x.tipo)) ? x.tipo : tipo ?? "carrossel") as TipoPeca;
      const pilar = typeof x.pilar === "string" && x.pilar in PILARES ? (x.pilar as Pilar) : null;
      /* A pauta nasce com o roteiro do pilar (tipo e papel da imagem), igual
         à peça criada à mão. */
      const roteiro = pilar ? (formato === "post_feed" ? [["capa", "abertura"] as const] : PILARES[pilar].roteiro) : [];
      return {
        owner_id: dono,
        tipo: formato,
        pilar,
        estilo: { direcao: (k + comeca) % 2 === 0 ? "acido" : "colagem", foto: "cor" },
        slides: roteiro.map(([t, papel], i) => ({ tipo: t, papel, ...(i === 0 ? tituloProvisorio(texto(x.gancho)) : { manchete: "" }) })),
        briefing: texto(x.progressao_de)
          ? `Progressão de "${texto(x.progressao_de)}". ${texto(x.briefing)}`
          : texto(x.briefing),
        gancho: texto(x.gancho),
        notas: { estrategista: texto(r.notas) },
      };
    })
    .filter((x: { briefing: string }) => x.briefing);
  if (!linhas.length) throw new Error("A Paula não devolveu nenhuma pauta.");
  let { error } = await supabase.from("mkt_pecas").insert(linhas);
  /* Sem a migração de 30/09 as colunas pilar e estilo não existem: grava sem elas. */
  if (error && /pilar|estilo/.test(error.message)) {
    ({ error } = await supabase.from("mkt_pecas").insert(linhas.map(({ pilar: _p, estilo: _e, ...resto }: { pilar: unknown; estilo: unknown }) => resto)));
  }
  if (error) throw new Error(`Não gravei as pautas: ${error.message}`);
}

/* ============================================================
   O LAÇO
   ============================================================ */
async function bater() {
  await supabase.from("mkt_sinal").upsert({ owner_id: dono, visto_em: new Date().toISOString() });
}

async function pegarPedido(): Promise<Pedido | null> {
  const { data } = await supabase
    .from("mkt_pedidos")
    .select("*")
    .eq("status", "na_fila")
    .order("criado_em", { ascending: true })
    .limit(1)
    .maybeSingle<Pedido>();
  if (!data) return null;
  /* A trava: só leva quem ainda estiver na fila. Dois workers abertos por
     engano não rodam o mesmo pedido duas vezes. */
  const { data: meu } = await supabase
    .from("mkt_pedidos")
    .update({ status: "rodando", iniciado_em: new Date().toISOString() })
    .eq("id", data.id)
    .eq("status", "na_fila")
    .select("*")
    .maybeSingle<Pedido>();
  return meu ?? null;
}

async function processar(pedido: Pedido) {
  const inicio = Date.now();
  const nome = pedido.agente === "tudo" ? "a linha inteira" : pedido.agente === "pautas" ? "pautas" : AGENTES[pedido.agente].nome;
  console.log(`\n▸ ${new Date().toLocaleTimeString("pt-BR")} pedido: ${nome}`);
  try {
    if (pedido.agente === "pautas") await rodarPautas(pedido);
    else if (pedido.agente === "tudo") await rodarTudo(pedido);
    else await rodarAgente(pedido.agente, pedido.peca_id!, pedido.entrada ?? {});
    await supabase
      .from("mkt_pedidos")
      .update({ status: "feito", etapa: null, terminado_em: new Date().toISOString() })
      .eq("id", pedido.id);
    console.log(`  feito em ${Math.round((Date.now() - inicio) / 1000)}s`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`  ERRO: ${msg}`);
    await supabase
      .from("mkt_pedidos")
      .update({ status: "erro", erro: msg.slice(0, 900), terminado_em: new Date().toISOString() })
      .eq("id", pedido.id);
  }
}

async function main() {
  const { error } = await supabase.from("mkt_pedidos").select("id").limit(1);
  if (error) {
    console.error(`O banco ainda não tem as tabelas do marketing (${error.message}).`);
    console.error("Rode supabase/marketing.sql no SQL Editor do Supabase e abra de novo.");
    process.exit(1);
  }
  /* Pedido que ficou "rodando" é de um worker que caiu no meio. Volta para a
     fila: rodar de novo um agente custa um minuto, perder o pedido custa
     você descobrir sozinho que ele nunca terminou. */
  await supabase.from("mkt_pedidos").update({ status: "na_fila", etapa: null }).eq("status", "rodando");

  console.log("O time de marketing está acordado. Deixe esta janela aberta.");
  console.log(`  agentes: ${SQUAD}`);
  console.log(`  claude:  ${CLAUDE_BIN}${MODELO ? ` (modelo ${MODELO})` : " (modelo da assinatura)"}`);

  await bater();
  setInterval(() => void bater(), 10_000);

  for (;;) {
    const pedido = await pegarPedido().catch(() => null);
    if (pedido) await processar(pedido);
    else await new Promise((r) => setTimeout(r, 3000));
  }
}

void main();
