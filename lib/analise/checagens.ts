/* ============================================================
   A ANÁLISE DAS VITRINES (14/10/2026): o que está na mão do estúdio.

   Três notas por loja, cada uma a pior cor dos achados dela:
   - SAÚDE: o site no ar, as páginas que respondem, as fotos que carregam,
     o painel abrindo, os arquivos que o painel pede;
   - MONTAGEM: o que ficou pela metade na entrega (pacote atrasado, código
     sem commit, contagem parada, domínio que não aponta, cadastro de
     contas aberto, texto de exemplo ou travessão no site);
   - CATÁLOGO: o que dá para sugerir à dona (peça sem preço, com uma foto
     só, toda esgotada, preço suspeito; a dona sem entrar no painel).
   E os NÚMEROS dos últimos 30 dias, que viram copy e anúncio.

   Roda no PC do Rafael (scripts/analisar-vitrines.ts): o git, o pacote e
   as chaves de cada loja moram nas pastas de ~/Desktop/vitrines. Nada é
   escrito nas lojas: só lê.
   ============================================================ */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import type { Vitrine } from "./vitrines";

export type Nivel = "verde" | "amarelo" | "vermelho";
export type Area = "saude" | "montagem" | "catalogo";
export type Achado = { area: Area; nivel: "amarelo" | "vermelho"; texto: string; acao: string };

export type Numeros = {
  dias: number;
  pessoas: number;
  visitas: number;
  pecasAbertas: number;
  chamaram: number;
  origem: Record<string, number>;
  topPecas: { peca: string; pessoas: number }[];
  procuraram: { termo: string; pessoas: number }[];
  desde: string | null;
};

export type ResultadoLoja = {
  nome: string;
  perf: string;
  url: string;
  notas: Record<Area, Nivel>;
  achados: Achado[];
  fatos: Record<string, string | number | boolean | null>;
  numeros: Numeros | null;
};

export const PASTA_VITRINES = path.join(process.env.USERPROFILE ?? process.env.HOME ?? "", "Desktop", "vitrines");
const DIA = 86_400_000;

/* ── utilidades ─────────────────────────────────────────────── */

function lerEnv(arquivo: string): Record<string, string> {
  if (!fs.existsSync(arquivo)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(arquivo, "utf8")
      .split(/\r?\n/)
      .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
      }),
  );
}

async function buscar(url: string, init: RequestInit = {}, prazo = 20_000): Promise<{ status: number; ms: number; texto: string; local: string | null }> {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { redirect: "manual", ...init, signal: AbortSignal.timeout(prazo) });
    const texto = (r.headers.get("content-type") ?? "").includes("text") ? await r.text() : "";
    return { status: r.status, ms: Date.now() - t0, texto, local: r.headers.get("location") };
  } catch {
    return { status: 0, ms: Date.now() - t0, texto: "", local: null };
  }
}

function textoVisivel(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
}

function git(pasta: string, ...args: string[]): string {
  try {
    return execFileSync("git", args, { cwd: pasta, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

const pior = (achados: Achado[], area: Area): Nivel =>
  achados.some((a) => a.area === area && a.nivel === "vermelho") ? "vermelho" : achados.some((a) => a.area === area && a.nivel === "amarelo") ? "amarelo" : "verde";

/* ── a versão mais nova do pacote (o _plataforma do PC) ───────── */
export function versaoAtualDoPacote(): string | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(PASTA_VITRINES, "_plataforma", "package.json"), "utf8")).version ?? null;
  } catch {
    return null;
  }
}

/* ── o central do Performance (o Supabase do estúdio) ─────────── */
export type Central = { url: string; chave: string };

type LojaPerf = { id: string; slug: string; liberado_ate: string | null; para_sempre: boolean; ativa: boolean };

async function lerTudo<T>(central: Central, consulta: string): Promise<T[]> {
  const todos: T[] = [];
  for (let de = 0; ; de += 1000) {
    const r = await fetch(`${central.url}/rest/v1/${consulta}`, {
      headers: { apikey: central.chave, Authorization: `Bearer ${central.chave}`, Range: `${de}-${de + 999}` },
    });
    if (!r.ok) break;
    const pagina = (await r.json()) as T[];
    todos.push(...pagina);
    if (pagina.length < 1000) break;
  }
  return todos;
}

async function lojaNoCentral(central: Central, slug: string): Promise<LojaPerf | null> {
  const r = await fetch(`${central.url}/rest/v1/perf_lojas?select=id,slug,liberado_ate,para_sempre,ativa&slug=eq.${slug}`, {
    headers: { apikey: central.chave, Authorization: `Bearer ${central.chave}` },
  });
  const j = r.ok ? ((await r.json()) as LojaPerf[]) : [];
  return j[0] ?? null;
}

type Evento = { criado_em: string; visitante: string; tipo: string; origem: string | null; peca: string | null; busca: string | null; resultados: number | null };

async function numerosDaLoja(central: Central, lojaId: string, dias: number): Promise<Numeros> {
  const desde = new Date(Date.now() - dias * DIA).toISOString();
  const ev = await lerTudo<Evento>(
    central,
    `perf_eventos?select=criado_em,visitante,tipo,origem,peca,busca,resultados&loja_id=eq.${lojaId}&criado_em=gte.${desde}&order=criado_em.asc`,
  );
  const pessoas = new Set(ev.map((e) => e.visitante));
  const chamaram = new Set(ev.filter((e) => e.tipo === "whatsapp").map((e) => e.visitante));
  const origem: Record<string, number> = {};
  const porVisita = new Map<string, string>();
  for (const e of ev) if (e.tipo === "visita" && !porVisita.has(e.visitante)) porVisita.set(e.visitante, e.origem ?? "direto");
  for (const o of porVisita.values()) origem[o] = (origem[o] ?? 0) + 1;
  const contar = (lista: [string, string][]) => {
    const m = new Map<string, Set<string>>();
    for (const [chave, quem] of lista) m.set(chave, (m.get(chave) ?? new Set()).add(quem));
    return [...m.entries()].map(([k, s]) => ({ k, n: s.size })).sort((a, b) => b.n - a.n).slice(0, 5);
  };
  return {
    dias,
    pessoas: pessoas.size,
    visitas: ev.filter((e) => e.tipo === "visita").length,
    pecasAbertas: ev.filter((e) => e.tipo === "peca").length,
    chamaram: chamaram.size,
    origem,
    topPecas: contar(ev.filter((e) => e.tipo === "peca" && e.peca).map((e) => [e.peca!, e.visitante])).map(({ k, n }) => ({ peca: k, pessoas: n })),
    procuraram: contar(ev.filter((e) => e.tipo === "busca" && e.busca && !e.resultados).map((e) => [e.busca!.toLowerCase().trim(), e.visitante])).map(({ k, n }) => ({ termo: k, pessoas: n })),
    desde: ev[0]?.criado_em ?? null,
  };
}

/* ── a análise de uma loja ──────────────────────────────────── */

export async function analisarVitrine(v: Vitrine, central: Central, versaoPacote: string | null): Promise<ResultadoLoja> {
  const achados: Achado[] = [];
  const fatos: ResultadoLoja["fatos"] = {};
  const achar = (area: Area, nivel: Achado["nivel"], texto: string, acao: string) => achados.push({ area, nivel, texto, acao });
  const pasta = path.join(PASTA_VITRINES, v.pasta);
  const env = lerEnv(path.join(pasta, ".env.local"));

  /* ═══ SAÚDE ═══ */
  const home = await buscar(v.url);
  fatos.home_status = home.status;
  fatos.home_ms = home.ms;
  if (home.status !== 200) achar("saude", "vermelho", `A página inicial respondeu ${home.status || "nada"}.`, "Abrir o site e o último deploy na Vercel.");
  else if (home.ms > 4000) achar("saude", "amarelo", `A página inicial demorou ${(home.ms / 1000).toFixed(1)} s para responder.`, "Conferir o cache das peças e o tamanho das fotos.");

  const catalogo = await buscar(`${v.url}/catalogo`);
  if (catalogo.status !== 200) achar("saude", "vermelho", `O catálogo respondeu ${catalogo.status || "nada"}.`, "Abrir /catalogo e o log da função na Vercel.");

  /* uma página de peça, tirada da própria home */
  const linkPeca = home.texto.match(/href="(\/(?:produto|peca|p)\/[^"#?]+)"/)?.[1] ?? null;
  if (linkPeca) {
    const peca = await buscar(v.url + linkPeca);
    fatos.peca_testada = linkPeca;
    if (peca.status !== 200) achar("saude", "vermelho", `A página de uma peça (${linkPeca}) respondeu ${peca.status || "nada"}.`, "Abrir a peça e o log da função na Vercel.");
  } else if (home.status === 200) {
    achar("saude", "amarelo", "A página inicial não tem nenhum link de peça.", "Conferir se as fileiras de peças estão vazias.");
  }

  /* as fotos da home */
  const fotos = [...new Set([...home.texto.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]).filter((s) => !s.startsWith("data:")))].slice(0, 25);
  const quebradas: string[] = [];
  for (const src of fotos) {
    const limpo = src.replace(/&amp;/g, "&");
    const alvo = limpo.startsWith("http") ? limpo : v.url + (limpo.startsWith("/") ? "" : "/") + limpo;
    /* uma segunda tentativa: o /_next/image às vezes demora na primeira chamada fria */
    let r = await buscar(alvo, { method: "HEAD", redirect: "follow" }, 15_000);
    if (r.status >= 400 || r.status === 0) r = await buscar(alvo, { method: "GET", redirect: "follow" }, 20_000);
    if (r.status >= 400 || r.status === 0) quebradas.push(decodeURIComponent(limpo.match(/url=([^&]+)/)?.[1] ?? limpo));
  }
  fatos.fotos_testadas = fotos.length;
  if (quebradas.length)
    achar("saude", "vermelho", `${quebradas.length} de ${fotos.length} fotos da página inicial não carregam (${quebradas.slice(0, 3).join(", ")}).`, "Conferir se o arquivo existe em public/ ou no Storage.");

  /* o painel e o que ele pede */
  const login = await buscar(`${v.url}/painel/login`);
  if (login.status !== 200) achar("saude", "vermelho", `A entrada do painel (/painel/login) respondeu ${login.status || "nada"}.`, "O dono não consegue entrar: conferir o deploy e o domínio.");
  if (v.pacote) {
    const rr = await buscar(`${v.url}/marca/rr.webp`, { method: "HEAD", redirect: "follow" });
    if (rr.status !== 200) achar("saude", "amarelo", "Falta a marca RR do estúdio (public/marca/rr.webp): o topo do painel mostra um quadrado quebrado.", "Copiar o arquivo do _molde e publicar.");
  }

  /* o cartão do WhatsApp (og:image) */
  const og = home.texto.match(/property="og:image"\s+content="([^"]+)"/)?.[1] ?? home.texto.match(/content="([^"]+)"\s+property="og:image"/)?.[1] ?? null;
  if (!og) achar("saude", "amarelo", "A página não tem imagem de compartilhamento (og:image): o link no WhatsApp sai sem foto.", "Gerar o og/site.jpg e pôr no metadata.");
  else {
    const r = await buscar(og.startsWith("http") ? og : v.url + og, { method: "HEAD", redirect: "follow" });
    if (r.status !== 200) achar("saude", "amarelo", `A imagem de compartilhamento não carrega (${r.status || "nada"}).`, "Conferir o og:image do layout.");
  }

  /* ═══ MONTAGEM ═══ */
  /* o domínio próprio aponta para a vitrine? */
  if (v.dominio) {
    const d = await buscar(`https://${v.dominio}/painel/login`);
    fatos.dominio_painel = d.status;
    if (d.status !== 200) {
      const servidor = await fetch(`https://${v.dominio}`, { method: "HEAD", signal: AbortSignal.timeout(15_000) }).then((r) => r.headers.get("server") ?? "").catch(() => "");
      const wix = /pepyaka/i.test(servidor);
      achar(
        "montagem",
        "vermelho",
        wix ? `O domínio ${v.dominio} ainda abre o site antigo no Wix, não a vitrine.` : `O domínio ${v.dominio} não abre a vitrine (o painel responde ${d.status || "nada"}).`,
        "Apontar o domínio para o projeto na Vercel (Domains) e trocar o DNS no registro do domínio.",
      );
    }
  } else {
    achar("montagem", "amarelo", "A loja só tem o endereço .vercel.app, sem domínio próprio.", "Oferecer o domínio (registro.br) e apontar para a Vercel.");
  }

  /* o pacote */
  if (v.pacote) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(pasta, "package.json"), "utf8"));
      const tag = String(pkg.dependencies?.["@vitrine/plataforma"] ?? "").match(/#v(.+)$/)?.[1] ?? null;
      fatos.pacote = tag;
      if (tag && versaoPacote && tag !== versaoPacote) achar("montagem", "amarelo", `O painel está na versão ${tag}; a mais nova é ${versaoPacote}.`, "Rodar a atualização do pacote nesta loja.");
    } catch {
      achar("montagem", "amarelo", "Não consegui ler o package.json da pasta da loja.", "Conferir a pasta em ~/Desktop/vitrines.");
    }
  }

  /* o git: código que não foi para o ar */
  if (fs.existsSync(path.join(pasta, ".git"))) {
    const sujos = git(pasta, "status", "--porcelain")
      .split("\n")
      .filter((l) => l.trim() && !/supabase\/\.temp|\.next|\.vercel|banners\//.test(l));
    fatos.arquivos_sem_commit = sujos.length;
    if (sujos.length) achar("montagem", "amarelo", `${sujos.length} ${sujos.length === 1 ? "arquivo mudado" : "arquivos mudados"} na pasta sem commit.`, "Ver o git status: ou é trabalho para publicar, ou é resto para apagar.");
    const ramo = git(pasta, "branch", "--show-current");
    const naFrente = Number(git(pasta, "rev-list", "--count", `origin/${ramo}..HEAD`) || 0);
    if (naFrente) achar("montagem", "amarelo", `${naFrente} ${naFrente === 1 ? "commit" : "commits"} na pasta que não foram para o GitHub.`, `Dar push na ${ramo}.`);
  }

  /* a contagem do Performance */
  const perf = await lojaNoCentral(central, v.perf);
  let numeros: Numeros | null = null;
  if (!perf) achar("montagem", "vermelho", "A loja não está no Performance do CRM: a aba Desempenho não conta.", "Criar a loja no Performance e pôr as PERF_* na Vercel.");
  else {
    const ultimo = await lerTudo<{ criado_em: string }>(central, `perf_eventos?select=criado_em&loja_id=eq.${perf.id}&order=criado_em.desc&limit=1`);
    const quando = ultimo[0]?.criado_em ?? null;
    fatos.ultimo_evento = quando;
    if (!quando) achar("montagem", "vermelho", "A contagem nunca chegou ao central.", "Conferir as PERF_* na Vercel e o Medidor no layout do site.");
    else if (Date.now() - Date.parse(quando) > 3 * DIA) achar("montagem", "vermelho", `A contagem parou: o último evento foi há ${Math.floor((Date.now() - Date.parse(quando)) / DIA)} dias.`, "Conferir a chave PERF_CHAVE na Vercel e o deploy.");
    if (perf.liberado_ate && !perf.para_sempre) {
      const restam = Math.ceil((Date.parse(perf.liberado_ate) - Date.now()) / DIA);
      fatos.performance_restam = restam;
      if (restam >= 0 && restam <= 3) achar("montagem", "amarelo", `O Performance liberado vence em ${restam} ${restam === 1 ? "dia" : "dias"}.`, "Hora de oferecer a mensalidade com os números da loja.");
    }
    numeros = await numerosDaLoja(central, perf.id, 30);
  }

  /* o Supabase da loja: o cadastro de contas e os donos */
  const sbUrl = (env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/(rest|auth)\/v1\/?$/, "").replace(/\/$/, "");
  const sbAnon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const sbServico = env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE ?? "";
  fatos.banco = sbUrl ? "supabase" : "arquivos";
  if (sbUrl && sbAnon) {
    const ajustes = await fetch(`${sbUrl}/auth/v1/settings`, { headers: { apikey: sbAnon } }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (ajustes && ajustes.disable_signup === false) achar("montagem", "vermelho", "O cadastro de contas está aberto no Supabase: qualquer pessoa cria conta.", "Supabase > Authentication > Sign In / Providers: desligar \"Allow new users to sign up\".");
  }
  if (sbUrl && sbServico) {
    const h = { apikey: sbServico, Authorization: `Bearer ${sbServico}` };
    const donos = await fetch(`${sbUrl}/rest/v1/donos?select=user_id`, { headers: h }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const contas = await fetch(`${sbUrl}/auth/v1/admin/users?per_page=100`, { headers: h }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (Array.isArray(donos)) {
      fatos.donos = donos.length;
      if (!donos.length) achar("montagem", "vermelho", "A tabela donos está vazia: ninguém consegue salvar no painel.", "Pôr a conta da dona em donos pelo SQL Editor.");
      const ids = new Set(donos.map((d: { user_id: string }) => d.user_id));
      const dela = (contas?.users ?? []).filter((u: { id: string; email?: string }) => ids.has(u.id) && !/rafaelrazeira/i.test(u.email ?? ""));
      const ultimoLogin = dela.map((u: { last_sign_in_at?: string }) => u.last_sign_in_at ?? "").sort().pop() || null;
      fatos.ultimo_login_dona = ultimoLogin;
      if (dela.length && !ultimoLogin) achar("catalogo", "amarelo", "A dona nunca entrou no painel.", "Mandar o passo a passo do primeiro acesso.");
      else if (ultimoLogin && Date.now() - Date.parse(ultimoLogin) > 14 * DIA)
        achar("catalogo", "amarelo", `A dona não entra no painel há ${Math.floor((Date.now() - Date.parse(ultimoLogin)) / DIA)} dias.`, "Puxar conversa com um número da Desempenho dela.");
    }
  }

  /* o texto do site: exemplo do molde, preço demonstrativo, travessão */
  if (home.status === 200) {
    const texto = textoVisivel(home.texto);
    /* "MARCA 1" é o exemplo do molde, em caixa alta: sem o /i, "Escolha pela marca 60 camisas" não confunde */
    const exemplo = texto.match(/MARCA \d\b/)?.[0] ?? texto.match(/Loja Modelo|Lorem ipsum|Preço demonstrativo|contato@exemplo|\(00\) 00000/i)?.[0];
    if (exemplo) achar("montagem", "vermelho", `Texto de exemplo no ar: "${exemplo}".`, "Trocar pelo texto da loja.");
    const travessoes = (texto.match(/ — /g) ?? []).length;
    fatos.travessoes_home = travessoes;
    if (travessoes) achar("montagem", "amarelo", `${travessoes} ${travessoes === 1 ? "travessão" : "travessões"} em texto visível da página inicial.`, "Reescrever com dois-pontos ou vírgula (regra da casa).");
  }

  /* ═══ CATÁLOGO ═══ */
  type Peca = { preco: number | null; preco_promocional: number | null; tamanhos: string[] | null; tamanhos_esgotados: string[] | null; ativo: boolean; fotos: number };
  let pecas: Peca[] | null = null;
  if (sbUrl && sbAnon) {
    const linhas = await fetch(`${sbUrl}/rest/v1/produtos?select=preco,preco_promocional,tamanhos,tamanhos_esgotados,ativo,produto_imagens(id)&ativo=eq.true`, {
      headers: { apikey: sbAnon, Range: "0-4999" },
    })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    if (Array.isArray(linhas)) pecas = linhas.map((p) => ({ ...p, fotos: (p.produto_imagens ?? []).length }));
  }
  if (!pecas) {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(pasta, "data", "catalogo.json"), "utf8"));
      pecas = (j.produtos ?? []).filter((p: { ativo?: boolean }) => p.ativo !== false).map((p: Peca & { imagens?: unknown[] }) => ({ ...p, fotos: (p.imagens ?? []).length }));
    } catch {
      pecas = null;
    }
  }
  if (!pecas) achar("catalogo", "amarelo", "Não consegui ler o catálogo da loja.", "Conferir o .env.local ou o data/catalogo.json da pasta.");
  else {
    const n = (v: unknown) => (v == null || v === "" ? null : Number(v));
    const total = pecas.length;
    const semPreco = pecas.filter((p) => !n(p.preco)).length;
    const umaFoto = pecas.filter((p) => p.fotos <= 1).length;
    const esgotadas = pecas.filter((p) => (p.tamanhos ?? []).length > 0 && (p.tamanhos ?? []).every((t) => (p.tamanhos_esgotados ?? []).includes(t))).length;
    const suspeitas = pecas.filter((p) => {
      const cheio = n(p.preco), promo = n(p.preco_promocional);
      return cheio && promo && (promo >= cheio || 1 - promo / cheio >= 0.7);
    }).length;
    Object.assign(fatos, { pecas_no_site: total, sem_preco: semPreco, uma_foto: umaFoto, todas_esgotadas: esgotadas, preco_suspeito: suspeitas });
    if (!total) achar("catalogo", "vermelho", "Nenhuma peça ativa no site.", "Conferir o catálogo com a dona.");
    if (suspeitas) achar("catalogo", "vermelho", `${suspeitas} ${suspeitas === 1 ? "peça com preço suspeito" : "peças com preço suspeito"} (desconto de 70% ou mais, ou promoção maior que o preço).`, "Conferir o preço no painel: provável engano de digitação.");
    if (esgotadas) achar("catalogo", "amarelo", `${esgotadas} ${esgotadas === 1 ? "peça toda esgotada segue" : "peças todas esgotadas seguem"} no site.`, "Sugerir à dona repor ou tirar do site.");
    if (semPreco === total && total)
      achar("catalogo", "amarelo", "Nenhuma peça mostra preço no site.", "Perguntar à dona se ela quer mostrar o preço: sem ele, toda venda começa com uma pergunta.");
    else if (semPreco) achar("catalogo", "amarelo", `${semPreco} de ${total} peças sem preço.`, "Sugerir à dona pôr o preço: sem ele, a pessoa precisa perguntar.");
    if (total && umaFoto / total > 0.3) achar("catalogo", "amarelo", `${umaFoto} de ${total} peças com uma foto só.`, "Sugerir à dona mais uma foto (verso, detalhe, em uso).");
  }

  return {
    nome: v.nome,
    perf: v.perf,
    url: v.url,
    notas: { saude: pior(achados, "saude"), montagem: pior(achados, "montagem"), catalogo: pior(achados, "catalogo") },
    achados: achados.sort((a, b) => (a.nivel === b.nivel ? 0 : a.nivel === "vermelho" ? -1 : 1)),
    fatos,
    numeros,
  };
}

/* ── os números do estúdio, somados, para anúncio ────────────── */
export function numerosDoEstudio(lojas: ResultadoLoja[]) {
  const comNumeros = lojas.filter((l) => l.numeros);
  const soma = (k: "pessoas" | "visitas" | "pecasAbertas" | "chamaram") => comNumeros.reduce((s, l) => s + (l.numeros?.[k] ?? 0), 0);
  const origem: Record<string, number> = {};
  for (const l of comNumeros) for (const [k, n] of Object.entries(l.numeros!.origem)) origem[k] = (origem[k] ?? 0) + n;
  return { lojas: comNumeros.length, pessoas: soma("pessoas"), visitas: soma("visitas"), pecasAbertas: soma("pecasAbertas"), chamaram: soma("chamaram"), origem };
}
