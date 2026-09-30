/* ============================================================
   O MATERIAL QUE O CLIENTE MANDA PELO CHECKLIST (30/09/2026)

   POR QUE EXISTE: na entrega, o lojista precisa mandar preço, tamanho, cor,
   marcas e fotos das peças. Pelo WhatsApp a foto chega comprimida e o texto
   chega solto, misturado com a conversa. O Rafael pediu que o cliente "jogue
   pra mim e aí eu faço": o cliente preenche peça por peça no checklist
   (/entrega/<loja>-checklist.html) e o Rafael baixa tudo organizado com
   `node scripts/material-cliente.mjs <loja>`.

   ONDE FICA: no bucket PRIVADO `material` do Supabase do estúdio.
     <loja>/respostas.json      tudo o que foi preenchido (um arquivo só)
     <loja>/fotos/<peca>/...    as fotos, na resolução em que chegaram

   AS FOTOS NÃO PASSAM POR AQUI. A Vercel recusa corpo acima de 4,5 MB, e
   foto de celular passa disso. Esta rota só ASSINA um endereço de envio, e o
   navegador manda a foto direto para o Storage.

   QUEM PODE: não tem login. Quem tem o link do checklist manda, igual às
   páginas de proposta e entrega. Por isso a loja precisa EXISTIR: ou está
   em LOJAS (os checklists feitos à mão, antes do gerador), ou tem um
   <loja>/config.json no bucket, que só o CRM escreve (aba Projetos, desde
   30/09). O caminho é montado aqui (nunca vem pronto do navegador) e o
   bucket só aceita imagem de até 25 MB.
   ============================================================ */
import crypto from "crypto";

const BUCKET = "material";
/* os checklists feitos à mão, que não têm config.json */
const LOJAS = new Set(["fulltime"]);
const EXTENSOES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif", "image/avif": "avif" };
const LIMITE_RESPOSTAS = 400 * 1024;

const responder = (res, status, corpo) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(corpo));
};
const erro = (res, status, mensagem) => responder(res, status, { ok: false, erro: mensagem });

function storage(caminho, opcoes = {}) {
  const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) throw new Error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente");
  return fetch(`${url}/storage/v1/${caminho}`, {
    ...opcoes,
    headers: { apikey: chave, Authorization: `Bearer ${chave}`, ...(opcoes.headers || {}) },
  });
}

/* só letra, número e hífen: o id da peça vira pasta */
const limpo = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60);

async function lerConfig(loja) {
  const r = await storage(`object/${BUCKET}/${loja}/config.json`);
  if (!r.ok) return null;
  return r.json().catch(() => null);
}

/* a loja vale se é das antigas ou se o CRM já criou o checklist dela */
async function lojaValida(loja) {
  if (!loja) return { ok: false, config: null };
  if (LOJAS.has(loja)) return { ok: true, config: null };
  const config = await lerConfig(loja);
  return { ok: !!config, config };
}

async function lerRespostas(loja) {
  const r = await storage(`object/${BUCKET}/${loja}/respostas.json`);
  if (!r.ok) return {};
  return r.json().catch(() => ({}));
}

/* endereços de ver, que valem 1 hora, para as miniaturas das fotos já enviadas */
async function assinarLeitura(caminhos) {
  if (!caminhos.length) return {};
  const r = await storage(`object/sign/${BUCKET}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 3600, paths: caminhos }),
  });
  if (!r.ok) return {};
  const lista = await r.json().catch(() => []);
  const base = (process.env.SUPABASE_URL || "").replace(/\/$/, "") + "/storage/v1";
  const mapa = {};
  for (const item of lista) if (item.signedURL) mapa[item.path] = base + item.signedURL;
  return mapa;
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const loja = limpo(req.query.loja);
      const v = await lojaValida(loja);
      if (!v.ok) return erro(res, 404, "loja desconhecida");
      const respostas = await lerRespostas(loja);
      const caminhos = Object.values(respostas.fotos || {}).flat();
      return responder(res, 200, { ok: true, config: v.config, respostas, miniaturas: await assinarLeitura(caminhos) });
    }

    if (req.method !== "POST") return erro(res, 405, "use GET ou POST");
    const b = req.body || {};
    const loja = limpo(b.loja);
    if (!(await lojaValida(loja)).ok) return erro(res, 404, "loja desconhecida");

    if (b.acao === "assinar") {
      const ext = EXTENSOES[b.tipo];
      if (!ext) return erro(res, 400, "Esse arquivo não é foto. Mande JPG, PNG, WebP ou HEIC.");
      const peca = limpo(b.peca) || "geral";
      const caminho = `${loja}/fotos/${peca}/${Date.now()}-${crypto.randomBytes(3).toString("hex")}.${ext}`;
      const r = await storage(`object/upload/sign/${BUCKET}/${caminho}`, { method: "POST" });
      if (!r.ok) return erro(res, 502, "não consegui preparar o envio");
      const { url } = await r.json();
      const base = (process.env.SUPABASE_URL || "").replace(/\/$/, "") + "/storage/v1";
      return responder(res, 200, { ok: true, caminho, envio: base + url });
    }

    if (b.acao === "salvar") {
      const texto = JSON.stringify({ ...(b.dados || {}), atualizado: new Date().toISOString() });
      if (texto.length > LIMITE_RESPOSTAS) return erro(res, 413, "respostas grandes demais");
      const r = await storage(`object/${BUCKET}/${loja}/respostas.json`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-upsert": "true" },
        body: texto,
      });
      if (!r.ok) return erro(res, 502, "não consegui salvar");
      return responder(res, 200, { ok: true });
    }

    if (b.acao === "apagar") {
      const caminho = String(b.caminho || "");
      if (!caminho.startsWith(`${loja}/fotos/`) || caminho.includes("..")) return erro(res, 400, "caminho inválido");
      const r = await storage(`object/${BUCKET}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: [caminho] }),
      });
      if (!r.ok) return erro(res, 502, "não consegui apagar");
      return responder(res, 200, { ok: true });
    }

    return erro(res, 400, "ação desconhecida");
  } catch (e) {
    console.error("[material]", e?.message || e);
    return erro(res, 500, "erro no servidor");
  }
}
