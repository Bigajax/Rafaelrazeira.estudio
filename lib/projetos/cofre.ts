/* ============================================================
   O COFRE DO MATERIAL, VISTO DO CRM

   O bucket privado `material` do Supabase do estúdio guarda, por loja:
     <chave>/config.json      o checklist que o cliente vai ver (as peças,
                              as grades, o que perguntar), escrito pelo CRM
     <chave>/respostas.json   o que o cliente preencheu (pages/api/material.js)
     <chave>/fotos/...        as fotos que ele mandou

   O bucket é privado e o CRM entra com a sessão do usuário, que o Storage
   não conhece: por isso aqui é a service role, a mesma de pages/api. Este
   arquivo só é chamado de server action, depois de `usuarioAtual()` dizer
   que tem alguém logado; nunca de componente de cliente.
   ============================================================ */

import type { CatalogoLido, Grade } from "./catalogo";

const BUCKET = "material";

export type Perguntas = {
  preco: boolean;
  tamanhos: boolean;
  cores: boolean;
  fotos: boolean;
  novas: boolean;
  marcas: boolean;
  banners: boolean;
  dominio: boolean;
  contato: boolean;
};

export const PERGUNTAS_PADRAO: Perguntas = {
  preco: true, tamanhos: true, cores: true, fotos: true, novas: true,
  marcas: true, banners: true, dominio: true, contato: true,
};

export type ConfigChecklist = {
  versao: 1;
  chave: string;
  lead_id: string;
  nome: string;
  site: string;
  criado_em: string;
  perguntas: Perguntas;
  categorias: { slug: string; nome: string; grades: Grade[] }[];
  pecas: CatalogoLido["pecas"];
};

function storage(caminho: string, opcoes: RequestInit = {}) {
  const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) throw new Error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente");
  return fetch(`${url}/storage/v1/${caminho}`, {
    ...opcoes,
    cache: "no-store",
    headers: { apikey: chave, Authorization: `Bearer ${chave}`, ...((opcoes.headers as Record<string, string>) || {}) },
  });
}

export async function lerConfig(chave: string): Promise<ConfigChecklist | null> {
  const r = await storage(`object/${BUCKET}/${chave}/config.json`);
  if (!r.ok) return null;
  return r.json().catch(() => null);
}

export async function gravarConfig(config: ConfigChecklist): Promise<boolean> {
  const r = await storage(`object/${BUCKET}/${config.chave}/config.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true" },
    body: JSON.stringify(config),
  });
  return r.ok;
}

/* "Japa Modas" → "japa-modas". A chave vira pasta no bucket e pedaço do
   link que o cliente recebe, então é curta e sem acento. */
export function chaveDe(nome: string): string {
  return (
    nome
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/^@/, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "loja"
  );
}
