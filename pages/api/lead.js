/* ============================================================
   CAPTURA DO LEAD — grava no Supabase e avisa o Rafael.

   POR QUE EXISTE: até 06/08 o formulário da /e-commerce não guardava nada. Ele
   montava uma mensagem, abria o WhatsApp e torcia. Se o handoff falhasse (o
   navegador interno do Instagram bloqueia pop-up calado) ou se a pessoa
   desistisse antes de tocar em enviar lá, o lead evaporava: sem nome, sem
   telefone, sem registro nenhum. Do lado dos números ficava um Contact
   disparado e nenhuma conversa chegando, e não dava para saber se o problema
   era a oferta ou o encanamento.

   Agora a ordem é outra: o dado é salvo aqui primeiro, e a conversa no
   WhatsApp vira consequência, iniciada por quem chegar primeiro.

   NO SERVIDOR de propósito. A `briefings` da landing é escrita pelo navegador
   com a chave publicável; esta rota usa a service role key, que ignora o RLS e
   NUNCA pode aparecer no client. Por isso a tabela `leads` não tem policy
   nenhuma para `anon`: com o RLS ligado e sem policy, o único caminho de
   escrita é este arquivo.

   VARIÁVEIS DE AMBIENTE (Vercel → Settings → Environment Variables):
   • SUPABASE_URL               (obrigatória) https://SEU_PROJETO.supabase.co
   • SUPABASE_SERVICE_ROLE_KEY  (obrigatória) Supabase → Settings → API →
     service_role. É uma chave de administrador: só aqui, nunca no client,
     nunca em NEXT_PUBLIC_*.
   • RESEND_API_KEY             (opcional) sem ela o lead é salvo do mesmo
     jeito e o aviso é só pulado. Ver a nota do aviso mais abaixo.
   • LEAD_EMAIL_TO              (opcional) para onde vai o aviso.
   • LEAD_EMAIL_FROM            (opcional) remetente; o padrão só entrega no
     e-mail dono da conta Resend.
   • O aviso que VIBRA no celular vive em lib/push.js e tem as variáveis dele
     documentadas lá (Telegram ou ntfy, os dois opcionais). E-mail é registro,
     push é pressa: quem responde em minutos ganha o lead.

   RODE ANTES: supabase/leads.sql, senão todo envio cai no fallback.
   ============================================================ */

import { whatsappValido } from "../../components/telefone";
import { emailValido, telefoneInternacionalValido } from "../../components/telefone-intl";
import { avisarNoCelular } from "../../lib/push";
import { conferirArroba } from "../../lib/arroba";

/* ---------- a janela do envio repetido ----------
   A /vitrine-digital tem dois formulários (o do hero e o da oferta) e a
   mesma pessoa preenche os dois na mesma visita: primeiro deixa o contato
   lá em cima, depois desce, escolhe o plano e preenche de novo. Até 10/09
   cada um virava uma linha, um e-mail, um push e um Contact na Meta. Na
   primeira semana da campanha "prévia grátis" foram 24 linhas para 16
   pessoas, e o CPL da campanha parecia 40% melhor do que era.

   Dentro desta janela, mesmo navegador (`distinct_id`) ou mesmo WhatsApp
   na mesma página é a MESMA pessoa: a linha existente ganha o que veio de
   novo (o plano, o @ corrigido) e nada mais dispara. Fora dela é outra
   visita, e outra visita merece outro aviso. */
const JANELA_REPETIDO_MS = 24 * 60 * 60 * 1000;

/* Teto por campo. Não é validação de formulário, é limite de estrago: esta
   rota é pública e sem segredo (tem que ser, o formulário é anônimo), então o
   que dá para fazer é impedir que alguém encha a tabela com um texto de 4 MB. */
const LIMITE = 2000;
const LIMITE_CURTO = 200;

/* A gravação não pode prender a função serverless: se o Supabase estiver
   lento, é melhor devolver erro e deixar o site cair no fallback do WhatsApp
   do que segurar a pessoa numa tela travada. */
const TIMEOUT_MS = 6000;

const texto = (v, max = LIMITE_CURTO) => {
  const s = String(v == null ? "" : v).trim();
  return s ? s.slice(0, max) : null;
};

const erro = (res, status, mensagem) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ ok: false, erro: mensagem }));
};

async function comTimeout(url, opcoes) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...opcoes, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/* ---------- o aviso ----------
   Resend porque é o caminho mais curto que existe para "me avise por e-mail":
   uma chave, uma chamada HTTP, sem SDK e sem servidor de e-mail para manter.
   Com o remetente padrão (onboarding@resend.dev) a Resend só entrega no
   e-mail dono da conta, que aqui é justamente o destinatário, então funciona
   sem verificar domínio nenhum. Para mandar para outro endereço depois, é
   verificar o domínio e trocar LEAD_EMAIL_FROM.

   Falha aqui NÃO derruba a resposta: o lead já está salvo, e é o lead que
   importa. O erro vai para o log da Vercel. */
async function avisar(lead) {
  const chave = process.env.RESEND_API_KEY;
  const para = process.env.LEAD_EMAIL_TO;
  if (!chave || !para) return { enviado: false, motivo: "RESEND_API_KEY ou LEAD_EMAIL_TO ausente" };

  const linha = (rot, v) => (v ? `<tr><td style="padding:4px 12px 4px 0;color:#667;white-space:nowrap">${rot}</td><td style="padding:4px 0"><b>${String(v).replace(/</g, "&lt;")}</b></td></tr>` : "");
  const campanha = [lead.utm_source, lead.utm_campaign, lead.utm_content].filter(Boolean).join(" · ");
  const zap = String(lead.whatsapp || "").replace(/\D/g, "");
  const html = `
    <div style="font:15px/1.5 -apple-system,Segoe UI,sans-serif;color:#111">
      <p style="margin:0 0 14px">Lead novo em <b>/${lead.pagina}</b>.</p>
      <table style="border-collapse:collapse;font-size:14px">
        ${linha("Nome", lead.nome)}
        ${linha("WhatsApp", lead.whatsapp)}
        ${linha("E-mail", lead.email)}
        ${linha("Idioma", lead.pagina.endsWith("-en") ? "EN (responder em inglês, por e-mail)" : "")}
        ${linha("Empresa", lead.empresa)}
        ${linha("Instagram/site", lead.canal)}
        ${linha("Vende", lead.vende)}
        ${linha("Produtos", lead.produtos)}
        ${linha("Site hoje", lead.site)}
        ${linha("Investimento", lead.investimento)}
        ${linha("Plano", lead.plano)}
        ${linha("Dificuldade", lead.necessidade)}
        ${linha("Campanha", campanha)}
      </table>
      ${zap ? `<p style="margin:18px 0 0"><a href="https://wa.me/${zap.length > 11 || lead.pagina.endsWith("-en") ? zap : `55${zap}`}" style="background:#10b981;color:#052e21;padding:12px 18px;text-decoration:none;font-weight:700">Chamar no WhatsApp</a></p>` : ""}
      ${!zap && lead.email ? `<p style="margin:18px 0 0"><a href="mailto:${lead.email}" style="background:#111;color:#fff;padding:12px 18px;text-decoration:none;font-weight:700">Responder por e-mail</a></p>` : ""}
      <p style="margin:18px 0 0;font-size:12px;color:#889">A pessoa viu uma tela dizendo que você chama ainda hoje.</p>
    </div>`;

  try {
    const r = await comTimeout("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${chave}` },
      body: JSON.stringify({
        from: process.env.LEAD_EMAIL_FROM || "Estúdio <onboarding@resend.dev>",
        to: [para],
        /* nome e origem no assunto: dá para triar sem abrir */
        subject: `Lead ${lead.pagina}: ${lead.nome}`,
        html,
      }),
    });
    if (!r.ok) {
      const corpo = await r.text().catch(() => "");
      console.error("[lead] Resend recusou:", r.status, corpo.slice(0, 300));
      return { enviado: false, motivo: `resend ${r.status}` };
    }
    return { enviado: true };
  } catch (e) {
    console.error("[lead] falha ao avisar:", e?.message || e);
    return { enviado: false, motivo: "exceção" };
  }
}

/* ============================================================
   REGRA 7 — INBOUND ENTRA SOZINHO

   O mesmo envio que vira uma linha em `leads` (a captura, histórico do
   formulário) vira também um lead no pipeline, em `crm_leads`. As duas
   tabelas continuam separadas de propósito: a primeira é o que a pessoa
   respondeu naquele dia e não muda nunca; a segunda é um negócio que anda.

   ---------- não duplicar ----------
   Se já existe lead com o mesmo WhatsApp ou e-mail, NÃO nasce um segundo:
   entra uma interação de entrada no que já existe. É o caso mais comum de
   todos, e o mais fácil de errar: a mesma pessoa preenche o formulário de
   novo duas semanas depois, e um CRM que cria um segundo card faz o Rafael
   abordar como frio quem já está em negociação.

   A checagem é uma leitura seguida de uma escrita, então dois envios no
   mesmo segundo passariam os dois. Quem fecha essa fresta é o índice único
   do banco (ver supabase/crm.sql): quando ele recusa com 23509/23505, esta
   função lê de novo e cai no caminho da interação.

   ---------- por que a falha aqui é silenciosa ----------
   O lead do site JÁ ESTÁ SALVO quando esta função roda. Nada do que
   acontecer aqui pode mudar a resposta ao navegador: um CRM fora do ar não
   pode fazer o formulário do site parecer quebrado para a cliente. Todo
   erro vai para o log da Vercel e a rota segue.
   ============================================================ */

/* De qual página veio → que tipo de projeto é. O vocabulário de `pagina` é
   o mesmo da Mixpanel, e o de `tipo_projeto` é o do CRM. */
const TIPO_POR_PAGINA = {
  "e-commerce": "ecommerce",
  "vitrine-digital": "vitrine",
  "landing-page": "landing",
  /* as irmãs em inglês (11/09/2026): mesmo tipo de projeto, outro idioma */
  "vitrine-digital-en": "vitrine",
  "landing-page-en": "landing",
};

/* Tráfego pago ou orgânico. A régua é a UTM: quem chega por campanha traz
   `utm_source`, e a distinção importa porque as duas origens pedem abordagem
   diferente (quem veio de anúncio não conhece o estúdio de lugar nenhum). */
function origemDaUtm(utm) {
  const fonte = String(utm.utm_source || "").toLowerCase();
  const meio = String(utm.utm_medium || "").toLowerCase();
  if (!fonte && !meio) return "inbound";
  if (/paid|cpc|ppc|ads?$/.test(meio)) return "trafego_pago";
  if (/facebook|meta|instagram|^ig$|^fb$/.test(fonte)) return "trafego_pago";
  return "inbound";
}

const soDigitos = (v) => {
  const d = String(v ?? "").replace(/\D/g, "");
  if (!d) return null;
  return d.startsWith("55") && d.length > 11 ? d.slice(2) : d;
};

async function crmREST(url, chave, caminho, opcoes = {}) {
  return comTimeout(`${url.replace(/\/$/, "")}/rest/v1/${caminho}`, {
    ...opcoes,
    headers: {
      "Content-Type": "application/json",
      apikey: chave,
      Authorization: `Bearer ${chave}`,
      ...(opcoes.headers || {}),
    },
  });
}

async function sincronizarCRM(linha, utm, { emIngles = false, faixa = "" } = {}) {
  const url = process.env.SUPABASE_URL;
  /* A faixa canônica decide (é ela que o formulário manda desde 11/09, nos
     dois idiomas); a regex no texto fica só para o envio que ainda vier
     sem a chave, da página pt em cache durante o deploy. */
  const naoAnuncia = faixa
    ? faixa === "nao_anuncia"
    : /^ainda n[aã]o anuncio/i.test(linha.investimento || "");
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  /* A service role key não tem usuário, então `auth.uid()` é nulo e o
     `default` do owner_id não resolve: o dono precisa vir explícito. Ver a
     seção INBOUND no fim de supabase/crm.sql para pegar o uuid. */
  const dono = process.env.CRM_OWNER_ID;
  if (!dono) {
    console.warn("[lead] CRM_OWNER_ID ausente: o lead não foi para o pipeline.");
    return { ok: false, motivo: "sem CRM_OWNER_ID" };
  }

  const whatsapp = soDigitos(linha.whatsapp);
  const email = linha.email ? String(linha.email).trim().toLowerCase() : null;

  const procurar = async () => {
    const filtros = [];
    if (whatsapp) filtros.push(`whatsapp.eq.${whatsapp}`);
    if (email) filtros.push(`email.eq.${email}`);
    if (!filtros.length) return null;
    const r = await crmREST(
      url,
      chave,
      `crm_leads?owner_id=eq.${dono}&or=(${filtros.join(",")})&select=id&limit=1`,
    );
    if (!r.ok) return null;
    const corpo = await r.json().catch(() => []);
    return Array.isArray(corpo) && corpo[0] ? corpo[0].id : null;
  };

  /* O resumo diz de onde veio e o que a pessoa respondeu de mais decisivo.
     Numa timeline, "Preencheu o formulário da /vitrine-digital" é o que faz
     o toque ser útil dois meses depois. */
  const resumo = [
    `Preencheu o formulário da /${linha.pagina}`,
    linha.investimento ? `investimento: ${linha.investimento}` : "",
    linha.plano ? `plano: ${linha.plano}` : "",
  ]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 400);

  /* Canal `whatsapp` e direção `entrada`. A direção é a parte que importa:
     preencher o formulário É a pessoa procurando o estúdio, e por isso o
     toque zera o contador da regra dos 2 retornos. O canal é a aproximação
     conhecida desta rota: a lista de canais do CRM não tem "formulário", e
     o formulário do site promete "te chamo no WhatsApp", que é onde a
     conversa continua. */
  const registrarInteracao = async (leadId) =>
    crmREST(url, chave, "crm_interacoes", {
      method: "POST",
      body: JSON.stringify({
        owner_id: dono,
        lead_id: leadId,
        canal: "whatsapp",
        direcao: "entrada",
        resumo,
      }),
    });

  try {
    const existente = await procurar();
    if (existente) {
      await registrarInteracao(existente);
      return { ok: true, novo: false, id: existente };
    }

    const novo = {
      owner_id: dono,
      nome: linha.nome,
      empresa: linha.empresa,
      whatsapp,
      email,
      instagram: linha.canal,
      cidade: null,
      tipo_projeto: TIPO_POR_PAGINA[linha.pagina] || null,
      origem: origemDaUtm(utm),
      estagio: "lista",
      /* Sem próximo passo de propósito: quem chega pelo site cai no grupo
         "sem próximo passo" do painel Hoje, que é exatamente onde ele
         precisa ser visto e decidido. Inventar um retorno automático aqui
         esconderia o lead novo no meio dos agendados. */
      /* ---------- a regra da prévia da landing (10/09/2026) ----------
         O anúncio da /landing-page diz "para quem já anuncia" e a prévia
         de lá é uma página inteira escrita do zero, de graça. A pergunta de
         investimento do formulário existe para esta nota: quem respondeu
         "Ainda não anuncio" chega no card com a produção FECHADA, e os
         outros chegam com o passo que vem antes de desenhar (conferir na
         Biblioteca de Anúncios da Meta se o anúncio existe mesmo). A regra
         mora no card porque é lá que a decisão de produzir é tomada. */
      notas: [
        /* o lead gringo pede outra conversa: responder por e-mail, em
           inglês, e combinar o pagamento por lá (sem Stripe nesta fase) */
        emIngles ? "LEAD EM INGLÊS: responder por e-mail, em inglês. Pagamento combinado por e-mail." : "",
        linha.pagina.startsWith("landing-page")
          ? (naoAnuncia
              ? "NÃO ANUNCIA AINDA: não abrir prévia. Conversar primeiro, prévia só depois de rodar tráfego."
              : "PRÉVIA SÓ DEPOIS DE CONFERIR: abrir a Biblioteca de Anúncios da Meta e confirmar que a pessoa anuncia. Sem anúncio ativo, não produzir.")
          : "",
        linha.vende, linha.produtos, linha.site, linha.necessidade,
      ]
        .filter(Boolean)
        .join("\n")
        .slice(0, 2000) || null,
    };

    const r = await crmREST(url, chave, "crm_leads", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(novo),
    });

    if (!r.ok) {
      const corpo = await r.json().catch(() => null);
      /* 23505 é o índice único de duplicata: outro envio ganhou a corrida
         no meio do caminho. Não é erro, é o caso da regra 7 chegando por
         outro lado. */
      if (corpo?.code === "23505") {
        const agora = await procurar();
        if (agora) {
          await registrarInteracao(agora);
          return { ok: true, novo: false, id: agora };
        }
      }
      console.error("[lead] CRM recusou:", r.status, JSON.stringify(corpo).slice(0, 300));
      return { ok: false, motivo: `crm ${r.status}` };
    }

    const corpo = await r.json().catch(() => null);
    const criado = Array.isArray(corpo) ? corpo[0] : corpo;
    if (criado?.id) await registrarInteracao(criado.id);
    return { ok: true, novo: true, id: criado?.id || null };
  } catch (e) {
    console.error("[lead] falha ao sincronizar com o CRM:", e?.message || e);
    return { ok: false, motivo: "exceção" };
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return erro(res, 405, "use POST");

  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) {
    /* 503 e não 500: para o site isto é indistinguível de rede caindo, e o
       caminho é o mesmo, o fallback do WhatsApp. Mas no log precisa dizer
       exatamente o que falta, senão vira meia hora de adivinhação. */
    console.error("[lead] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente");
    return erro(res, 503, "captura indisponível");
  }

  const b = req.body || {};

  /* Só nome e WhatsApp são obrigatórios, os mesmos dois que o formulário
     marca como required. O resto da linha pode vir vazio: um lead com dado
     faltando continua sendo um lead, e recusar seria voltar a perder gente. */
  /* ---------- o nome deixou de ser obrigatório na porta (11/09/2026) ----------
     O hero da /landing-page parou de perguntar o nome: ele não é
     matéria-prima da prévia (o @ ou o site já dizem qual é o negócio) e
     era um campo a mais entre o anúncio e o envio. Sem nome, o lead
     precisa vir com o canal, senão não há o que montar nem como chamar a
     pessoa; o nome de gente chega na primeira resposta do WhatsApp. O
     fallback para o card e o e-mail é o próprio canal, mais abaixo. */
  let nome = texto(b.nome);
  const whatsapp = texto(b.whatsapp, 40);
  const pagina = texto(b.pagina) || "e-commerce";
  /* ---------- as páginas em inglês (11/09/2026) ----------
     O `pagina` com sufixo "-en" é o que diz que o lead veio da versão em
     inglês, e com ele muda o contato obrigatório: e-mail em vez de
     WhatsApp (não há WhatsApp na versão gringa desta primeira fase), e
     o telefone, se vier, é internacional e passa por outra régua
     (components/telefone-intl.ts). O pt não muda nada: a régua brasileira
     continua exatamente como era. */
  const emIngles = pagina.endsWith("-en");
  const email = emIngles ? (texto(b.email, 120) || "").toLowerCase() : "";
  if (emIngles) {
    if (!email) return erro(res, 400, "email é obrigatório");
    if (!emailValido(email)) return erro(res, 400, "email inválido");
    if (whatsapp && !telefoneInternacionalValido(whatsapp)) return erro(res, 400, "telefone inválido");
  } else {
    if (!whatsapp) return erro(res, 400, "whatsapp é obrigatório");
  }
  if (!nome && !texto(b.canal)) return erro(res, 400, "nome ou site/instagram é obrigatório");
  /* a MESMA régua do formulário (components/telefone.ts): DDD válido, 10-11
     dígitos, celular começando com 9, sem repetição nem escada. Validar só no
     cliente seria decorativo, esta rota é pública e qualquer POST chega aqui.
     Quem manda número lixo recebe 400 e o site cai no fallback do WhatsApp,
     onde a pessoa se verifica sozinha ao mandar a mensagem. */
  if (!emIngles && !whatsappValido(whatsapp)) return erro(res, 400, "whatsapp inválido");

  /* ---------- o envio que a guarda anti-bot acusou (01/09/2026) ----------
     A /vitrine-digital parou de descartar o envio suspeito e passou a
     mandá-lo para cá marcado, porque descartar custava o cliente inteiro em
     silêncio quando a guarda errava. Chega como "isca" ou "relogio", e a
     lista fechada existe para o campo não virar texto livre vindo de fora.

     O motivo entra no próprio `status` em vez de ganhar coluna: pouparia
     uma migração manual hoje e continua filtrável com `status like
     'suspeito%'`. Se um dia isso virar análise de verdade, aí sim vira
     coluna. */
  let suspeito = b.suspeito === "isca" || b.suspeito === "relogio" ? b.suspeito : null;

  let canal = texto(b.canal);

  /* ---------- o @ é conferido na porta (10/09/2026) ----------
     Só na vitrine, porque só ela promete montar a loja a partir do @. A
     conferência é a mesma chamada que a oficina faz para colher as fotos:
     se ela falha aqui, falharia lá, e o lead não teria como ser atendido.
     Ver o porquê inteiro em lib/arroba.ts.

     "invalido" vira `suspeito:arroba`: a linha é gravada (se for gente,
     está no banco), mas não vira card, e-mail nem push, e a resposta avisa
     o navegador, que devolve o campo à pessoa para corrigir em vez de
     mostrar "recebi seus dados". O envio corrigido chega como outra
     requisição e passa por aqui de novo.

     "desconhecido" segue como ok: token vencido ou Meta fora do ar é
     problema nosso, e ninguém perde a prévia por isso. */
  let arroba = "nao_conferido";
  if (pagina.startsWith("vitrine-digital") && !suspeito) {
    const c = await conferirArroba(canal || "");
    arroba = c.estado;
    if (c.estado === "invalido") suspeito = "arroba";
    /* o @ entra limpo no banco: "@Loja" e "instagram.com/loja/" viram "loja",
       que é como a oficina e o CRM o procuram depois */
    if (c.estado === "ok") canal = c.arroba;
  }
  /* sem nome, o canal vira o nome de exibição: "@loja" no card, no push e
     no assunto do e-mail já diz de quem é a prévia */
  if (!nome) nome = /^https?:\/\/|\./.test(canal) ? canal : `@${canal.replace(/^@/, "")}`;

  const utm = b.utm || {};
  const linha = {
    pagina,
    nome,
    whatsapp,
    /* só as páginas em inglês mandam; exige a migração de 11/09 no fim de
       supabase/leads.sql */
    email: email || undefined,
    canal,
    empresa: texto(b.empresa),
    vende: texto(b.vende),
    produtos: texto(b.produtos),
    site: texto(b.site),
    necessidade: texto(b.necessidade, LIMITE),
    investimento: texto(b.investimento),
    /* só a /vitrine-digital manda: "Entrada de R$199 + R$800 em até 4x"
       ou "À vista no Pix R$899".
       Exige a migração de 06/08 no fim de supabase/leads.sql. */
    plano: texto(b.plano),
    utm_source: texto(utm.utm_source),
    utm_medium: texto(utm.utm_medium),
    utm_campaign: texto(utm.utm_campaign),
    utm_content: texto(utm.utm_content),
    utm_term: texto(utm.utm_term),
    url: texto(b.url, 1000),
    referrer: texto(b.referrer, 1000),
    ref: texto(b.ref, 64),
    distinct_id: texto(b.distinct_id, 64),
    /* `undefined` some no JSON.stringify, então o lead normal continua
       caindo no default 'novo' da tabela sem esta rota saber que ele existe. */
    status: suspeito ? `suspeito:${suspeito}` : undefined,
  };

  const cabecalhos = {
    "Content-Type": "application/json",
    apikey: chave,
    Authorization: `Bearer ${chave}`,
    Prefer: "return=representation",
  };
  const base = `${url.replace(/\/$/, "")}/rest/v1/leads`;

  /* ---------- o mesmo envio, de novo ----------
     Procura a linha desta pessoa nesta página dentro da janela. O suspeito
     não entra na busca nem na atualização: uma linha marcada como robô não
     pode ser "corrigida" por um envio seguinte, e um envio seguinte de robô
     não pode encostar numa linha boa. Falha na busca é tratada como "não
     achei": no pior caso nasce a linha dupla de antes, nunca um lead
     perdido. */
  let repetido = null;
  if (!suspeito) {
    try {
      const desde = new Date(Date.now() - JANELA_REPETIDO_MS).toISOString();
      const iguais = [];
      if (linha.distinct_id) iguais.push(`distinct_id.eq.${linha.distinct_id}`);
      /* aspas porque o número vai mascarado, com parênteses e espaço, e o
         PostgREST lê parêntese solto como sintaxe do próprio `or` */
      if (whatsapp) iguais.push(`whatsapp.eq."${whatsapp.replace(/"/g, "")}"`);
      if (email) iguais.push(`email.eq."${email.replace(/"/g, "")}"`);
      if (!iguais.length) throw new Error("sem chave para procurar");
      const filtro = [
        `select=id,plano,canal`,
        `pagina=eq.${encodeURIComponent(linha.pagina)}`,
        `created_at=gte.${encodeURIComponent(desde)}`,
        `status=not.like.suspeito*`,
        `or=(${encodeURIComponent(iguais.join(","))})`,
        `order=created_at.desc`,
        `limit=1`,
      ].join("&");
      const r = await comTimeout(`${base}?${filtro}`, { headers: cabecalhos });
      const corpo = r.ok ? await r.json().catch(() => []) : [];
      if (Array.isArray(corpo) && corpo[0]) repetido = corpo[0];
    } catch (e) {
      console.warn("[lead] não deu para procurar envio repetido:", e?.message || e);
    }
  }

  let salvo;
  try {
    let r;
    if (repetido) {
      /* Só o que veio preenchido sobrescreve: o envio do hero sem plano não
         apaga o plano escolhido no formulário da oferta um minuto antes. */
      const novidade = {};
      for (const k of ["plano", "canal", "url", "utm_content", "utm_term", "referrer"]) {
        if (linha[k]) novidade[k] = linha[k];
      }
      r = await comTimeout(`${base}?id=eq.${repetido.id}`, {
        method: "PATCH",
        headers: cabecalhos,
        body: JSON.stringify(novidade),
      });
    } else {
      r = await comTimeout(base, { method: "POST", headers: cabecalhos, body: JSON.stringify(linha) });
    }
    const corpo = await r.json().catch(() => null);
    if (!r.ok) {
      /* o motivo mais provável de cair aqui é a migração não ter sido rodada:
         coluna inexistente devolve 400 com a mensagem do Postgres */
      console.error("[lead] Supabase recusou:", r.status, JSON.stringify(corpo).slice(0, 400));
      return erro(res, 502, "não foi possível gravar o lead");
    }
    salvo = Array.isArray(corpo) ? corpo[0] : corpo;
  } catch (e) {
    console.error("[lead] falha ao gravar:", e?.message || e);
    return erro(res, 502, "não foi possível gravar o lead");
  }

  /* Os dois são aguardados, e não soltos: numa função serverless o processo
     pode ser congelado assim que a resposta sai, e uma promessa pendente
     morre com ele. Como o lead JÁ está salvo, o resultado dos dois não muda
     a resposta; eles viajam junto só para dar para conferir no teste.

     Em paralelo porque são independentes: o aviso por e-mail, o push e a
     entrada no pipeline não sabem um do outro, e em série a rota pagaria a
     soma dos três tempos de rede na cara da pessoa que está esperando a tela.

     O push entra aqui e não dentro de `avisar` porque é outro trabalho: o
     e-mail é o registro com o formulário inteiro, o push é o toque que faz
     você pegar o telefone. Um pode existir sem o outro. */
  /* O suspeito para aqui. Ele já está gravado, que é o ponto inteiro da
     mudança de 01/09, e nada além disso acontece: card no CRM envenenaria a
     fila do dia, que é feita para ser trabalhada uma por uma, e aviso faria
     o telefone vibrar por robô. Se ele for gente, o lead está no banco
     esperando, e é isso que antes não acontecia. */
  /* O repetido também para aqui, por outro motivo: a pessoa já tem card, já
     vibrou o telefone, já contou na Meta. O que mudou está na linha. */
  const [aviso, crm, push] = suspeito || repetido
    ? [{ enviado: false, motivo: suspeito ? "suspeito" : "repetido" }, { ok: false, motivo: suspeito ? "suspeito" : "repetido" }, { enviado: false, motivo: suspeito ? "suspeito" : "repetido" }]
    : await Promise.all([
      avisar(linha),
      sincronizarCRM(linha, utm, { emIngles, faixa: texto(b.investimento_faixa, 32) }),
      avisarNoCelular(linha),
    ]);

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(
    JSON.stringify({
      ok: true,
      id: salvo?.id || null,
      /* "ok" | "invalido" | "desconhecido" | "nao_conferido". O navegador só
         age sobre "invalido": devolve o campo do @ para a pessoa e não
         dispara Lead nem Contact, que é o ponto inteiro da conferência. */
      arroba,
      /* true quando a linha existente foi atualizada em vez de nascer outra:
         o navegador não conta o Contact de novo */
      repetido: !!repetido,
      avisado: aviso.enviado,
      /* Separado do `avisado` de propósito: dá para ver no teste que o e-mail
         saiu e o push não, que é justamente o caso de variável faltando. */
      push: push.enviado,
      /* `novo: false` quer dizer que o contato já estava no pipeline e o
         envio virou uma interação de entrada, que é o caminho certo da
         regra 7 e não uma falha. */
      crm: crm.ok ? { id: crm.id, novo: crm.novo } : null,
    }),
  );
}
