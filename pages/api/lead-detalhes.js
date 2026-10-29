/* ============================================================
   AS RESPOSTAS DA PÁGINA DE OBRIGADO (28/10/2026, pedido do Rafael)

   Depois do formulário da /vitrine-digital, a janela da confirmação faz
   quatro perguntas opcionais para a prévia sair mais certeira: o que a loja
   mais vende, quantas peças tem, se já tem site e o melhor horário para a
   conversa. Esta rota grava as respostas no MESMO lead que /api/lead acabou
   de criar:
   • na linha de `leads`, nas colunas que já existiam (`vende`, `produtos`,
     `site`): nenhuma migração;
   • no card do CRM (`crm_leads`), como uma linha a mais nas `notas`, que é
     onde a decisão de produzir a prévia é tomada.

   ---------- quem pode escrever ----------
   A rota é pública, então ela só aceita quando o id da linha E o WhatsApp
   batem com o que foi gravado, e a linha tem menos de 24h. Sem os dois, não
   dá para editar o lead de outra pessoa adivinhando ids. As respostas são
   listas fechadas (nada de texto livre além do link do site, cortado e
   limpo), então o que chega no card é sempre uma destas opções.

   Quem fecha a janela no meio manda o que já respondeu por sendBeacon
   (corpo application/json, o mesmo parser): resposta parcial é normal aqui.

   Não dispara nada na Meta nem na Mixpanel: a conversão é o formulário, e
   ela já contou em /api/lead. Isto é só o complemento.
   ============================================================ */

const JANELA_MS = 24 * 60 * 60 * 1000;
const VENDE = { tenis: "Tênis", roupas: "Roupas", acessorios: "Acessórios", praia: "Moda praia", outro: "Outro" };
const PECAS = { ate30: "Até 30 peças", de30a100: "De 30 a 100 peças", mais100: "Mais de 100 peças" };
const HORARIO = { manha: "manhã", tarde: "tarde", noite: "noite" };

const soDigitos = (v) => String(v || "").replace(/\D/g, "");

function json(res, status, corpo) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(corpo));
}

async function rest(caminho, opcoes = {}) {
  const url = process.env.SUPABASE_URL.replace(/\/$/, "");
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    return await fetch(`${url}/rest/v1/${caminho}`, {
      ...opcoes,
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", apikey: chave, Authorization: `Bearer ${chave}`, ...(opcoes.headers || {}) },
    });
  } finally {
    clearTimeout(t);
  }
}

/* o link do site: só http(s), sem espaço, até 200 caracteres */
function limparSite(v) {
  let s = String(v || "").trim().slice(0, 200);
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    return /^https?:$/.test(u.protocol) && u.hostname.includes(".") ? u.toString() : "";
  } catch {
    return "";
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "use POST" });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return json(res, 503, { error: "indisponível" });

  const b = req.body || {};
  const id = String(b.id || "");
  const whatsapp = soDigitos(b.whatsapp);
  if (!/^[\w-]{1,64}$/.test(id) || whatsapp.length < 10) return json(res, 400, { error: "lead inválido" });

  const r = b.respostas || {};
  const vende = (Array.isArray(r.vende) ? r.vende : []).filter((k) => VENDE[k]).slice(0, 5);
  const pecas = PECAS[r.pecas] ? r.pecas : "";
  const temSite = r.temSite === "sim" ? "sim" : r.temSite === "nao" ? "nao" : "";
  const site = temSite === "sim" ? limparSite(r.site) : "";
  const horario = HORARIO[r.horario] ? r.horario : "";
  /* o "Outro" abre um campo curto (28/10): texto livre, então só letras,
     números e pontuação comum, cortado em 60 */
  const outro = vende.includes("outro") ? String(r.vendeOutro || "").replace(/[^\p{L}\p{N} ,.;/&+-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 60) : "";
  if (!vende.length && !pecas && !temSite && !horario) return json(res, 400, { error: "nada para gravar" });

  /* a linha existe, é recente e é desta pessoa */
  const busca = await rest(`leads?id=eq.${encodeURIComponent(id)}&select=id,whatsapp,created_at,pagina`).catch(() => null);
  const linha = busca && busca.ok ? (await busca.json().catch(() => []))[0] : null;
  if (!linha || soDigitos(linha.whatsapp) !== whatsapp) return json(res, 404, { error: "lead não encontrado" });
  if (!String(linha.pagina || "").startsWith("vitrine-digital")) return json(res, 404, { error: "lead não encontrado" });
  if (Date.now() - new Date(linha.created_at).getTime() > JANELA_MS) return json(res, 410, { error: "fora do prazo" });

  const textoVende = vende.map((k) => (k === "outro" && outro ? `Outro (${outro})` : VENDE[k])).join(", ");
  const textoSite = temSite === "sim" ? site || "tem site (sem o link)" : temSite === "nao" ? "não tem site" : "";

  /* 1. a linha de `leads`: só o que veio preenchido */
  const novidade = {};
  if (textoVende) novidade.vende = textoVende;
  if (pecas) novidade.produtos = PECAS[pecas];
  if (textoSite) novidade.site = textoSite;
  if (Object.keys(novidade).length) {
    const p = await rest(`leads?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(novidade) }).catch(() => null);
    if (!p || !p.ok) {
      console.error("[lead-detalhes] leads recusou:", p && p.status);
      return json(res, 502, { error: "não foi possível gravar" });
    }
  }

  /* 2. o card do CRM: uma linha a mais nas notas. Falha aqui não derruba a
     resposta: o que importa já está na linha de `leads`. */
  let crm = false;
  const dono = process.env.CRM_OWNER_ID;
  if (dono) {
    try {
      const c = await rest(`crm_leads?owner_id=eq.${dono}&whatsapp=eq.${whatsapp}&select=id,notas&limit=1`);
      const card = c.ok ? (await c.json().catch(() => []))[0] : null;
      if (card) {
        const resumo = [
          textoVende ? `vende ${textoVende.toLowerCase()}` : "",
          pecas ? PECAS[pecas].toLowerCase() : "",
          textoSite ? `site: ${textoSite}` : "",
          horario ? `chamar de ${HORARIO[horario]}` : "",
        ].filter(Boolean).join("; ");
        const nota = `PÁGINA DE OBRIGADO: ${resumo}.`;
        const notas = [card.notas, nota].filter(Boolean).join("\n").slice(0, 2000);
        const p = await rest(`crm_leads?id=eq.${card.id}`, { method: "PATCH", body: JSON.stringify({ notas }) });
        crm = p.ok;
      }
    } catch (e) {
      console.warn("[lead-detalhes] CRM:", e && e.message);
    }
  }

  return json(res, 200, { ok: true, crm });
}
