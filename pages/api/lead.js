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

   RODE ANTES: supabase/leads.sql, senão todo envio cai no fallback.
   ============================================================ */

import { whatsappValido } from "../../components/telefone";

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
      ${zap ? `<p style="margin:18px 0 0"><a href="https://wa.me/${zap.length > 11 ? zap : `55${zap}`}" style="background:#10b981;color:#052e21;padding:12px 18px;text-decoration:none;font-weight:700">Chamar no WhatsApp</a></p>` : ""}
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

async function sincronizarCRM(linha, utm) {
  const url = process.env.SUPABASE_URL;
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
      notas: [linha.vende, linha.produtos, linha.site, linha.necessidade]
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
  const nome = texto(b.nome);
  const whatsapp = texto(b.whatsapp, 40);
  if (!nome || !whatsapp) return erro(res, 400, "nome e whatsapp são obrigatórios");
  /* a MESMA régua do formulário (components/telefone.ts): DDD válido, 10-11
     dígitos, celular começando com 9, sem repetição nem escada. Validar só no
     cliente seria decorativo, esta rota é pública e qualquer POST chega aqui.
     Quem manda número lixo recebe 400 e o site cai no fallback do WhatsApp,
     onde a pessoa se verifica sozinha ao mandar a mensagem. */
  if (!whatsappValido(whatsapp)) return erro(res, 400, "whatsapp inválido");

  const utm = b.utm || {};
  const linha = {
    pagina: texto(b.pagina) || "e-commerce",
    nome,
    whatsapp,
    canal: texto(b.canal),
    empresa: texto(b.empresa),
    vende: texto(b.vende),
    produtos: texto(b.produtos),
    site: texto(b.site),
    necessidade: texto(b.necessidade, LIMITE),
    investimento: texto(b.investimento),
    /* só a /vitrine-digital manda: "Entrada de R$500" ou "À vista R$999".
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
  };

  let salvo;
  try {
    const r = await comTimeout(`${url.replace(/\/$/, "")}/rest/v1/leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: chave,
        Authorization: `Bearer ${chave}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify(linha),
    });
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

     Em paralelo porque são independentes: o aviso por e-mail e a entrada no
     pipeline não sabem um do outro, e em série a rota pagaria a soma dos
     dois tempos de rede na cara da pessoa que está esperando a tela. */
  const [aviso, crm] = await Promise.all([avisar(linha), sincronizarCRM(linha, utm)]);

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(
    JSON.stringify({
      ok: true,
      id: salvo?.id || null,
      avisado: aviso.enviado,
      /* `novo: false` quer dizer que o contato já estava no pipeline e o
         envio virou uma interação de entrada, que é o caminho certo da
         regra 7 e não uma falha. */
      crm: crm.ok ? { id: crm.id, novo: crm.novo } : null,
    }),
  );
}
