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
  /* telefone plausível: 10 dígitos é o piso do Brasil (DDD + 8). Não é
     validação bonita, é filtro de lixo. */
  if (whatsapp.replace(/\D/g, "").length < 10) return erro(res, 400, "whatsapp inválido");

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

  /* O aviso é aguardado, e não solto: numa função serverless o processo pode
     ser congelado assim que a resposta sai, e uma promessa pendente morre com
     ele. Como o lead JÁ está salvo, o resultado do aviso não muda a resposta;
     ele viaja junto só para dar para conferir no teste. */
  const aviso = await avisar(linha);

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ ok: true, id: salvo?.id || null, avisado: aviso.enviado }));
}
