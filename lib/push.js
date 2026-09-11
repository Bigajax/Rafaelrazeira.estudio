/* ============================================================
   AVISO NO CELULAR — o lead cai, o telefone vibra.

   POR QUE EXISTE: o aviso por e-mail (Resend, em pages/api/lead.js) serve para
   o registro, não para a pressa. E aqui a pressa É o produto: o anúncio promete
   "manda o @ que eu desenho a sua loja", então o tempo entre o formulário e a
   primeira resposta é a promessa sendo cumprida ou quebrada. Responder em 5
   minutos qualifica ordens de grandeza melhor do que responder em 30, e quase
   ninguém no mercado responde nessa janela: é vantagem de graça para quem é uma
   pessoa só e pode simplesmente atender.

   E-mail não vibra. Push vibra. Por isso este arquivo existe separado.

   DOIS CANAIS, OS DOIS OPCIONAIS. Se nenhum estiver configurado, a função não
   faz nada e devolve o motivo. Nunca lança: o lead JÁ está salvo quando isto
   roda, e nada aqui pode derrubar a resposta da rota.

   • TELEGRAM (recomendado): grátis, privado, entrega em segundos.
     TELEGRAM_BOT_TOKEN  fale com @BotFather no Telegram, /newbot, copie o token
     TELEGRAM_CHAT_ID    mande qualquer mensagem para o seu bot e abra
                         https://api.telegram.org/bot<TOKEN>/getUpdates
                         o número em result[0].message.chat.id é o seu chat id

   • NTFY (alternativa sem cadastro): app ntfy no celular, assine um tópico.
     NTFY_TOPIC          o nome do tópico. ATENÇÃO: em ntfy.sh público, quem
                         souber o nome lê tudo. Use um nome longo e aleatório,
                         nunca "leads-rafael".
     NTFY_URL            (opcional) servidor próprio, padrão https://ntfy.sh
     NTFY_TOKEN          (opcional) Bearer, se o servidor exigir

   Configure na Vercel em Settings -> Environment Variables, igual às outras.
   ============================================================ */

/* Curto de propósito. O aviso viaja em paralelo com o e-mail e com a entrada no
   CRM, mas ainda assim a pessoa está olhando uma tela esperando: se o push
   demorar, é melhor perder o push do que segurar a resposta. */
const TIMEOUT_MS = 4000;

async function comTimeout(url, opcoes) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...opcoes, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/* Mesma normalização do e-mail: o formulário aceita com e sem DDI, e o wa.me
   só abre com o número completo. Abaixo de 12 dígitos falta o 55. */
function linkWhatsapp(whatsapp, comDDI = false) {
  const zap = String(whatsapp || "").replace(/\D/g, "");
  if (!zap) return null;
  /* o lead das páginas em inglês já vem com o DDI (11/09): nunca prefixar */
  return `https://wa.me/${zap.length > 11 || comDDI ? zap : `55${zap}`}`;
}

const escapar = (v) => String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* O conteúdo é escolhido para caber na notificação fechada, sem abrir o app: o
   nome (para saber com quem se fala), o @ (que é o que a oferta pede e o que
   você precisa para começar a prévia) e o utm_content (QUAL anúncio trouxe,
   que é a leitura do lote). O resto está no e-mail e no CRM. */
function montarTexto(lead) {
  const partes = [];
  if (lead.canal) partes.push(`@ ${lead.canal}`);
  if (lead.email) partes.push(lead.email);
  if (lead.empresa) partes.push(lead.empresa);
  if (lead.utm_content) partes.push(`via ${lead.utm_content}`);
  else if (lead.utm_campaign) partes.push(`via ${lead.utm_campaign}`);
  return partes.join(" · ");
}

async function viaTelegram(lead, titulo, corpo, wa) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return null;

  /* HTML e não Markdown: nome e @ vêm de campo aberto, e um "_" ou "*" solto
     quebraria a formatação inteira do Markdown do Telegram. */
  const linhas = [`<b>${escapar(titulo)}</b>`];
  if (corpo) linhas.push(escapar(corpo));
  if (lead.whatsapp) linhas.push(escapar(lead.whatsapp));
  if (wa) linhas.push(`<a href="${wa}">Abrir no WhatsApp</a>`);

  try {
    const r = await comTimeout(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chat,
        text: linhas.join("\n"),
        parse_mode: "HTML",
        /* Sem preview: o cartão do wa.me rouba a tela da notificação. */
        disable_web_page_preview: true,
      }),
    });
    if (!r.ok) {
      const detalhe = await r.text().catch(() => "");
      console.error("[push] telegram recusou:", r.status, detalhe.slice(0, 300));
      return { canal: "telegram", enviado: false, motivo: `telegram ${r.status}` };
    }
    return { canal: "telegram", enviado: true };
  } catch (e) {
    console.error("[push] telegram falhou:", e?.message || e);
    return { canal: "telegram", enviado: false, motivo: "exceção" };
  }
}

async function viaNtfy(lead, titulo, corpo, wa) {
  const topico = process.env.NTFY_TOPIC;
  if (!topico) return null;

  const base = (process.env.NTFY_URL || "https://ntfy.sh").replace(/\/+$/, "");
  const cabecalhos = {
    "Content-Type": "text/plain; charset=utf-8",
    /* O ntfy lê os cabeçalhos como latin-1: acento no título vira lixo. O
       título fica sem acento de propósito, e o texto acentuado vai no corpo,
       que é UTF-8. */
    Title: "Lead novo",
    Priority: "high",
    Tags: "bell",
  };
  if (wa) cabecalhos.Click = wa;
  if (process.env.NTFY_TOKEN) cabecalhos.Authorization = `Bearer ${process.env.NTFY_TOKEN}`;

  const texto = [titulo, corpo, lead.whatsapp].filter(Boolean).join("\n");

  try {
    const r = await comTimeout(`${base}/${encodeURIComponent(topico)}`, {
      method: "POST",
      headers: cabecalhos,
      body: texto,
    });
    if (!r.ok) {
      const detalhe = await r.text().catch(() => "");
      console.error("[push] ntfy recusou:", r.status, detalhe.slice(0, 300));
      return { canal: "ntfy", enviado: false, motivo: `ntfy ${r.status}` };
    }
    return { canal: "ntfy", enviado: true };
  } catch (e) {
    console.error("[push] ntfy falhou:", e?.message || e);
    return { canal: "ntfy", enviado: false, motivo: "exceção" };
  }
}

/* Os canais configurados vão em paralelo: quem usa os dois não paga a soma. */
export async function avisarNoCelular(lead) {
  const emIngles = String(lead.pagina || "").endsWith("-en");
  const wa = linkWhatsapp(lead.whatsapp, emIngles);
  const titulo = `Lead ${lead.pagina || ""}: ${lead.nome || "sem nome"}${emIngles ? " (EN, por e-mail)" : ""}`.trim();
  const corpo = montarTexto(lead);

  const resultados = (
    await Promise.all([viaTelegram(lead, titulo, corpo, wa), viaNtfy(lead, titulo, corpo, wa)])
  ).filter(Boolean);

  if (!resultados.length) {
    return { enviado: false, motivo: "TELEGRAM_BOT_TOKEN/CHAT_ID e NTFY_TOPIC ausentes", canais: [] };
  }
  return { enviado: resultados.some((r) => r.enviado), canais: resultados };
}
