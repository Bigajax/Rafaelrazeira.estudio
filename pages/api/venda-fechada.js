/* ============================================================
   VENDA FECHADA → evento Purchase na Conversions API da Meta.

   POR QUE EXISTE: o funil do site termina em "abriu o WhatsApp". Quem de fato
   pagou, a Meta nunca fica sabendo, então ela otimiza para achar quem clica
   em vez de quem compra. Esta rota é o caminho de volta: a cada venda
   fechada você avisa a Meta, e ela passa a procurar gente parecida com quem
   pagou de verdade.

   NÃO é chamada pelo site. É manual, e por isso exige um segredo: sem ele
   qualquer pessoa poderia injetar faturamento falso no dataset e estragar a
   otimização da campanha, que é justamente o que esta rota existe para
   proteger.

   VARIÁVEIS DE AMBIENTE (Vercel → Settings → Environment Variables):
   • VENDA_TOKEN             (obrigatória) o segredo desta rota. Invente uma
     string longa e aleatória; não reaproveite senha de outra coisa.
   • META_CAPI_ACCESS_TOKEN  (obrigatória) o mesmo usado por meta-capi.js.
   • META_TEST_EVENT_CODE    (opcional) manda tudo para o Test Events em vez
     de valer. Para um teste avulso, prefira mandar "test_event_code" no
     corpo da chamada: não exige mexer na Vercel nem redeploy, e não corre o
     risco de ficar esquecido ligado depois.

   COMO USAR (exemplo):
     curl -X POST https://rafaelrazeira-estudio.vercel.app/api/venda-fechada \
       -H "Content-Type: application/json" \
       -H "x-venda-token: SEU_SEGREDO" \
       -d '{"telefone":"44 99999-7219","valor":999,"nome":"Ana","ref":"A3F9C2"}'

   PRAZO: a Meta só usa o evento para otimizar se ele chegar em até 7 dias
   depois de a venda acontecer. Registrar de mês em mês serve para relatório
   e não ensina nada ao algoritmo. Por isso a rota recusa data mais velha.
   ============================================================ */
import crypto from "crypto";
import { sha256, normEmail, normPhone, normNome, hashArray } from "@/lib/meta-hash";

const PIXEL_ID = "2445872572575348";
const GRAPH_URL = `https://graph.facebook.com/v21.0/${PIXEL_ID}/events`;
const DIAS_LIMITE = 7;

/* comparação em tempo constante: com == dá para descobrir o segredo
   medindo quanto tempo a resposta demora, caractere por caractere */
function segredoConfere(recebido, esperado) {
  const a = Buffer.from(String(recebido || ""));
  const b = Buffer.from(String(esperado || ""));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

const erro = (res, status, mensagem, extra = {}) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ ok: false, erro: mensagem, ...extra }));
};

export default async function handler(req, res) {
  if (req.method !== "POST") return erro(res, 405, "use POST");

  const segredo = process.env.VENDA_TOKEN;
  if (!segredo) return erro(res, 500, "VENDA_TOKEN não configurado no servidor");
  if (!segredoConfere(req.headers["x-venda-token"], segredo)) return erro(res, 401, "segredo inválido");

  /* A validação vem ANTES da checagem do token da Meta de propósito: assim dá
     para conferir telefone, valor e data em localhost sem precisar do token de
     produção. O token só é exigido na hora de realmente enviar. */
  const b = req.body || {};

  /* telefone: é a chave que amarra a venda na pessoa. Sem ele a Meta não tem
     como saber de quem foi a compra, e o evento vira ruído. */
  const ph = normPhone(b.telefone);
  if (ph.length < 12 || ph.length > 13) {
    return erro(res, 400, "telefone inválido", { normalizado: ph, esperado: "55 + DDD + número, ex: 5544999997219" });
  }

  const valor = Number(b.valor);
  if (!Number.isFinite(valor) || valor <= 0) return erro(res, 400, "valor precisa ser um número maior que zero");

  /* data da venda: hoje por padrão. Aceita ISO ("2026-08-01") ou timestamp. */
  const quando = b.data ? new Date(b.data) : new Date();
  if (Number.isNaN(quando.getTime())) return erro(res, 400, "data inválida (use AAAA-MM-DD)");
  const idadeDias = (Date.now() - quando.getTime()) / 86400000;
  if (idadeDias > DIAS_LIMITE) {
    return erro(res, 400, `venda de ${Math.floor(idadeDias)} dias atrás: a Meta só otimiza com evento de até ${DIAS_LIMITE} dias`);
  }
  if (idadeDias < -1) return erro(res, 400, "data no futuro");

  /* event_id determinístico: reenviar a mesma venda no mesmo dia não conta
     duas vezes, porque a Meta deduplica por event_id + event_name. Protege
     do erro mais provável de um processo manual, que é mandar repetido. */
  const diaISO = quando.toISOString().slice(0, 10);
  const eventId = sha256(`venda|${ph}|${valor}|${diaISO}`).slice(0, 32);

  const user_data = { ph: [sha256(ph)] };
  const em = normEmail(b.email);
  if (em) user_data.em = [sha256(em)];
  const fn = normNome(b.nome);
  if (fn) user_data.fn = hashArray(fn);
  /* ref = o external_id da visita original (o mesmo mp_distinct_id que o
     Lead mandou). Quando existe, a Meta amarra a venda à sessão exata, e aí
     você descobre qual criativo traz comprador, não qual traz clique. */
  if (b.ref) user_data.external_id = [sha256(String(b.ref).trim())];

  const payload = {
    data: [{
      event_name: "Purchase",
      event_time: Math.floor(quando.getTime() / 1000),
      event_id: eventId,
      /* a venda fecha conversando no WhatsApp, não no site: dizer "website"
         aqui seria mentira e atrapalha a atribuição */
      action_source: "chat",
      user_data,
      custom_data: {
        value: valor,
        currency: String(b.moeda || "BRL"),
        content_name: String(b.produto || "vitrine-digital"),
      },
    }],
  };
  /* Código de teste: aceito no corpo da chamada, não só por variável de
     ambiente. Sem isso, testar em produção obrigaria a criar uma variável na
     Vercel e redeployar, e o caminho mais fácil viraria "manda valendo e
     torce", que é exatamente como se suja um dataset.
     Com o código, o evento cai na aba Testar eventos e NÃO conta como
     conversão. */
  const codigoTeste = b.test_event_code || process.env.META_TEST_EVENT_CODE;
  if (codigoTeste) payload.test_event_code = String(codigoTeste);

  /* daqui para baixo é o envio de verdade: só agora o token faz falta */
  const token = process.env.META_CAPI_ACCESS_TOKEN;
  if (!token) {
    return erro(res, 500, "META_CAPI_ACCESS_TOKEN ausente", {
      validacao: "passou",
      teria_enviado: { telefone: `••••${ph.slice(-4)}`, valor, data: diaISO, event_id: eventId },
    });
  }

  try {
    const r = await fetch(`${GRAPH_URL}?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const corpo = await r.json().catch(() => ({}));
    res.statusCode = r.ok ? 200 : 502;
    res.setHeader("Content-Type", "application/json");
    /* resposta falante de propósito: diferente do tracking do site, aqui tem
       gente olhando, e precisa dar para saber se entrou. O telefone volta
       mascarado: já foi hasheado, não faz sentido ecoar em texto puro. */
    res.end(JSON.stringify(r.ok
      ? {
          ok: true,
          registrado: { telefone: `••••${ph.slice(-4)}`, valor, moeda: payload.data[0].custom_data.currency, data: diaISO },
          amarrado_a_visita: Boolean(b.ref),
          /* deixa explícito se valeu ou se foi teste: num processo manual, a
             pergunta "isso contou?" precisa ter resposta na própria resposta */
          teste: Boolean(codigoTeste),
          event_id: eventId,
          meta: corpo,
        }
      : { ok: false, erro: "a Meta recusou o evento", meta: corpo }));
  } catch {
    return erro(res, 502, "falha ao contatar a Graph API");
  }
}
