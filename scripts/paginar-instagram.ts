/* ============================================================
   PAGINAR INSTAGRAM: todas as publicações de um perfil, não só as 80
   que o colher-loja traz. Só LÊ: não grava nada no banco.

   Nasceu na Japa Modas (25/09/2026), para achar fotos antigas do dono
   para os banners; a Fardo Esportes (24/09) já tinha precisado do mesmo
   para achar as camisas, e aquele script não ficou salvo.

   Gasta UMA consulta da Business Discovery (200 por hora) a cada 50
   publicações. Salva em <saida>/: lista.json (id, data, tipo, legenda,
   curtidas, link) e uma miniatura de cada mídia (a capa, nos vídeos),
   para olhar em folha de contato.

   USO:
     npx tsx scripts/paginar-instagram.ts <arroba> <pasta-de-saida> [maximo]
   ============================================================ */
import fs from "node:fs";
import path from "node:path";

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

type Filho = { id: string; media_url?: string; media_type: string };
type Post = {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp: string;
  like_count?: number;
  children?: { data: Filho[] };
};

const [arroba, saida, maximoTxt] = process.argv.slice(2);
if (!arroba || !saida) {
  console.error("Uso: npx tsx scripts/paginar-instagram.ts <arroba> <pasta-de-saida> [maximo]");
  process.exit(1);
}
const MAXIMO = Number(maximoTxt ?? 1000);
const VERSAO = "v23.0";

async function principal() {
  const token = process.env.IG_GRAPH_TOKEN;
  const id = process.env.IG_GRAPH_ID;
  if (!token || !id) throw new Error("Faltam IG_GRAPH_TOKEN e IG_GRAPH_ID no .env.local.");
  fs.mkdirSync(path.join(saida, "mini"), { recursive: true });

  const posts: Post[] = [];
  let cursor: string | null = null;
  let consultas = 0;
  do {
    const media = `media.limit(50)${cursor ? `.after(${cursor})` : ""}{id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,children{id,media_url,media_type}}`;
    const campos = encodeURIComponent(`business_discovery.username(${arroba}){media_count,${media}}`);
    const r = await fetch(`https://graph.facebook.com/${VERSAO}/${id}?fields=${campos}&access_token=${token}`, { signal: AbortSignal.timeout(40000) });
    const j = await r.json();
    consultas++;
    if (j.error) throw new Error(`A Meta recusou: ${j.error.message}`);
    const m = j.business_discovery?.media;
    posts.push(...(m?.data ?? []));
    /* a Business Discovery devolve o cursor, mas nem sempre o link "next":
       segue enquanto a página vier cheia */
    cursor = m?.paging?.cursors?.after && (m?.data?.length ?? 0) >= 50 ? m.paging.cursors.after : null;
    console.log(`  consulta ${consultas}: ${posts.length} de ${j.business_discovery?.media_count} publicações`);
  } while (cursor && posts.length < MAXIMO);

  fs.writeFileSync(
    path.join(saida, "lista.json"),
    JSON.stringify(posts.map((p) => ({ id: p.id, data: p.timestamp, tipo: p.media_type, curtidas: p.like_count ?? null, link: p.permalink, legenda: (p.caption ?? "").slice(0, 300) })), null, 2),
  );

  /* uma miniatura por publicação (a capa no vídeo, a primeira foto no carrossel) */
  let n = 0;
  for (const [i, p] of posts.entries()) {
    const url = p.media_type === "VIDEO" ? p.thumbnail_url : p.media_type === "CAROUSEL_ALBUM" ? p.children?.data?.find((c) => c.media_type === "IMAGE")?.media_url ?? p.children?.data?.[0]?.media_url : p.media_url;
    if (!url) continue;
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!r.ok) continue;
      fs.writeFileSync(path.join(saida, "mini", `${String(i).padStart(3, "0")}-${p.timestamp.slice(0, 10)}.jpg`), Buffer.from(await r.arrayBuffer()));
      n++;
    } catch {
      /* uma mídia que não vem não para as outras */
    }
  }
  console.log(`Pronto: ${posts.length} publicações, ${n} miniaturas, ${consultas} consultas.`);
}

principal().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
