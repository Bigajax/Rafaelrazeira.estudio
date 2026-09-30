"use server";

/* ============================================================
   AS AÇÕES DO MARKETING

   Tudo que a aba escreve passa por aqui, com o mesmo contrato das ações do
   CRM: { ok: true } ou { ok: false, erro } com a frase para a tela.

   Nenhuma ação aqui roda agente. "Pedir ao Caetano" só grava a linha em
   `mkt_pedidos`; quem roda é o worker no PC (scripts/marketing-agentes.ts).
   ============================================================ */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clienteServidor, usuarioAtual } from "@/lib/crm/supabase";
import {
  CODIGOS,
  DIRECOES,
  PILARES,
  TIPOS,
  TIPOS_SLIDE,
  LAYOUTS,
  LEITURAS,
  PAPEIS,
  RESPIROS,
  type Codigo,
  type Estilo,
  type Pilar,
  type Peca,
  type Slide,
  type StatusPeca,
  type TipoPeca,
  type TipoPedido,
} from "@/lib/marketing/tipos";

export type Feito =
  | { ok: true; versao?: string; defasada?: boolean }
  | { ok: false; erro: string; conflito?: boolean };

/* ============================================================
   A VERSÃO DA PEÇA (30/09)

   O editor salva a lista INTEIRA de slides e o estilo inteiro. Em 30/09 uma
   tela aberta com a versão antiga gravou por cima dos vínculos de imagem
   que a Dora tinha acabado de escrever, 35 segundos depois dela. Agora quem
   salva diz qual versão estava editando (o `atualizado_em` que leu); se o
   time mexeu na peça no meio, o banco não acha a linha, nada é gravado, e a
   tela recarrega a versão nova em vez de apagar o trabalho do outro lado.
   ============================================================ */
async function gravarComVersao(
  supabase: Awaited<ReturnType<typeof clienteServidor>>,
  id: string,
  campos: Record<string, unknown>,
  versao?: string,
): Promise<Feito> {
  const nova = new Date().toISOString();
  let q = supabase.from("mkt_pecas").update({ ...campos, atualizado_em: nova }).eq("id", id);
  if (versao) q = q.eq("atualizado_em", versao);
  const { data, error } = await q.select("id");
  if (error) return { ok: false, erro: "Não salvei. Tente de novo." };
  if (!data?.length) {
    return {
      ok: false,
      conflito: true,
      erro: "O time mexeu nesta peça enquanto você editava. Carreguei a versão nova; refaça a última mudança.",
    };
  }
  return { ok: true, versao: nova };
}

async function sessao() {
  const usuario = await usuarioAtual();
  if (!usuario) return null;
  return { usuario, supabase: await clienteServidor() };
}

function atualizar(id?: string) {
  revalidatePath("/crm/marketing");
  if (id) revalidatePath(`/crm/marketing/${id}`);
}

const DATA = /^\d{4}-\d{2}-\d{2}$/;

export async function criarPeca(form: FormData): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  const tipo = String(form.get("tipo") || "carrossel") as TipoPeca;
  if (!(tipo in TIPOS)) return { ok: false, erro: "Formato desconhecido." };
  const codigoBruto = String(form.get("codigo") || "");
  const codigo = codigoBruto in CODIGOS ? (codigoBruto as Codigo) : null;
  const briefing = String(form.get("briefing") || "").trim();
  const data = String(form.get("posta_em") || "");
  const pilarBruto = String(form.get("pilar") || "");
  const pilar = pilarBruto in PILARES ? (pilarBruto as Pilar) : null;
  /* A peça nasce com o esqueleto do pilar: a sequência de slides vazios que
     aquele tipo de conteúdo pede. Post único e anúncio ficam só com a capa. */
  /* A peça nasce com o roteiro do pilar: o tipo de cada slide E o papel da
     imagem nele. Post único e anúncio ficam só com a abertura. */
  const roteiro = pilar
    ? tipo === "carrossel" || tipo === "story"
      ? PILARES[pilar].roteiro
      : [["capa", "abertura"] as const]
    : [];
  const slides = roteiro.map(([t, papel]) => ({ tipo: t, papel, manchete: "" }));

  const linha: Record<string, unknown> = {
    owner_id: s.usuario.id,
    tipo,
    codigo,
    briefing,
    slides,
    posta_em: DATA.test(data) ? data : null,
  };
  if (pilar) linha.pilar = pilar;
  /* O feed alterna as duas direções: a peça nova nasce na oposta à da
     última criada. Trocar no editor continua a um clique. */
  const { data: ultima } = await s.supabase
    .from("mkt_pecas")
    .select("estilo")
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle<{ estilo: { direcao?: string } | null }>();
  linha.estilo = { direcao: ultima?.estilo?.direcao === "acido" ? "colagem" : "acido", foto: "cor" };

  const { data: nova, error } = await s.supabase
    .from("mkt_pecas")
    .insert(linha)
    .select("id")
    .single<{ id: string }>();
  if (error || !nova) {
    /* 42703 = coluna que não existe: a migração do pilar (30/09) não rodou. */
    if (error?.code === "42703" || error?.code === "PGRST204") {
      return { ok: false, erro: "Falta rodar de novo o supabase/marketing.sql no SQL Editor (as colunas pilar e estilo)." };
    }
    return { ok: false, erro: "Não criei a peça. Tente de novo." };
  }

  /* "O time escreve a primeira versão": a linha inteira já vai para a fila. */
  if (form.get("time") === "1") {
    await s.supabase.from("mkt_pedidos").insert({ owner_id: s.usuario.id, peca_id: nova.id, agente: "tudo" });
  }

  atualizar();
  redirect(`/crm/marketing/${nova.id}`);
}

/* Os campos de texto que a tela edita à mão. Lista fechada: nada que vem do
   navegador escreve em `notas`, `veredito` ou `owner_id`. */
const EDITAVEIS = ["briefing", "gancho", "cta", "hashtags", "legenda", "prompt_capa"] as const;
type Editavel = (typeof EDITAVEIS)[number];

export async function salvarCampo(id: string, campo: Editavel, valor: string, versao?: string): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  if (!EDITAVEIS.includes(campo)) return { ok: false, erro: "Campo que não se edita." };
  /* Um campo de texto só escreve a coluna dele, então grava mesmo com a tela
     atrasada. Mas a tela só adota a versão nova se estava em dia: em 30/09 a
     tela adotava sempre, e o salvamento seguinte de slides passava pela trava
     com a lista velha. Atrasada, ela recebe `defasada` e recarrega. */
  if (versao) {
    const r = await gravarComVersao(s.supabase, id, { [campo]: valor }, versao);
    if (r.ok || !r.conflito) {
      if (r.ok) atualizar(id);
      return r;
    }
  }
  const r = await gravarComVersao(s.supabase, id, { [campo]: valor });
  if (!r.ok) return r;
  atualizar(id);
  return versao ? { ok: true, defasada: true } : r;
}

export async function salvarFormato(id: string, tipo: TipoPeca, codigo: Codigo | null): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  if (!(tipo in TIPOS)) return { ok: false, erro: "Formato desconhecido." };
  if (codigo && !(codigo in CODIGOS)) return { ok: false, erro: "Código desconhecido." };
  const { error } = await s.supabase
    .from("mkt_pecas")
    .update({ tipo, codigo, atualizado_em: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, erro: "Não salvei o formato." };
  atualizar(id);
  return { ok: true };
}

export async function salvarSlides(id: string, slides: Slide[], versao?: string): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const txt = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : undefined);
  const limpos = slides.slice(0, 12).map((x) => ({
    tipo: x.tipo && x.tipo in TIPOS_SLIDE ? x.tipo : undefined,
    cor: typeof x.cor === "number" ? Math.max(0, Math.min(9, Math.round(x.cor))) : undefined,
    corTexto: typeof x.corTexto === "string" && /^#[0-9A-F]{6}$/i.test(x.corTexto) ? x.corTexto : undefined,
    corAcento: typeof x.corAcento === "string" && /^#[0-9A-F]{6}$/i.test(x.corAcento) ? x.corAcento : undefined,
    manchete: String(x.manchete ?? "").slice(0, 200),
    batida: txt(x.batida, 120),
    apoio: txt(x.apoio, 400),
    numero: txt(x.numero, 24),
    rotulo: txt(x.rotulo, 60),
    destaque: txt(x.destaque, 60),
    itens: Array.isArray(x.itens) ? x.itens.slice(0, 6).map((i) => String(i).slice(0, 160)) : undefined,
    ruim: txt(x.ruim, 240),
    bom: txt(x.bom, 240),
    /* imagem só da pasta desta peça no bucket */
    img: typeof x.img === "string" && x.img.startsWith(`${id}/`) ? x.img : undefined,
    img2: typeof x.img2 === "string" && x.img2.startsWith(`${id}/`) ? x.img2 : undefined,
    escala: typeof x.escala === "number" ? Math.min(1.6, Math.max(0.5, x.escala)) : undefined,
    posicao: x.posicao === "topo" || x.posicao === "centro" || x.posicao === "base" ? x.posicao : undefined,
    alinhar: x.alinhar === "esquerda" || x.alinhar === "centro" ? x.alinhar : undefined,
    papel: x.papel && x.papel in PAPEIS ? x.papel : undefined,
    leitura: x.leitura && x.leitura in LEITURAS ? x.leitura : undefined,
    layout: x.layout && x.layout in LAYOUTS ? x.layout : undefined,
    texto:
      x.texto && typeof x.texto.x === "number" && typeof x.texto.y === "number" && typeof x.texto.w === "number"
        ? {
            x: Math.max(-10, Math.min(95, x.texto.x)),
            y: Math.max(-10, Math.min(95, x.texto.y)),
            w: Math.max(15, Math.min(100, x.texto.w)),
            alinhar: x.texto.alinhar === "centro" || x.texto.alinhar === "direita" ? x.texto.alinhar : "esquerda",
          }
        : undefined,
    imagem: typeof x.imagem === "number" ? Math.max(0, Math.min(5, Math.round(x.imagem))) : undefined,
    foco:
      x.foco && typeof x.foco.x === "number" && typeof x.foco.y === "number" && typeof x.foco.z === "number"
        ? {
            x: Math.max(0, Math.min(100, x.foco.x)),
            y: Math.max(0, Math.min(100, x.foco.y)),
            z: Math.max(1, Math.min(4, x.foco.z)),
          }
        : undefined,
  }));
  const r = await gravarComVersao(s.supabase, id, { slides: limpos }, versao);
  if (r.ok) atualizar(id);
  return r;
}

/* A direção visual da peça inteira: Pôster ácido ou Colagem editorial, e a
   foto em cor original ou em duotone. */
export async function salvarEstilo(id: string, estilo: Estilo, versao?: string): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const limpo: Estilo = {
    direcao: estilo.direcao && estilo.direcao in DIRECOES ? estilo.direcao : undefined,
    foto: estilo.foto === "cor" || estilo.foto === "duotone" ? estilo.foto : undefined,
    respiro: estilo.respiro && estilo.respiro in RESPIROS ? estilo.respiro : undefined,
    /* as imagens da série: prompt, e o arquivo só da pasta desta peça */
    extras: Array.isArray(estilo.extras)
      ? estilo.extras.slice(0, 8).map((x) => ({
          prompt: String(x?.prompt ?? "").slice(0, 3000),
          papel: typeof x?.papel === "string" ? x.papel.slice(0, 20) : undefined,
          slide: typeof x?.slide === "number" ? Math.max(1, Math.min(12, Math.round(x.slide))) : undefined,
          caminho: typeof x?.caminho === "string" && x.caminho.startsWith(`${id}/`) ? x.caminho : undefined,
        }))
      : undefined,
    paleta: Array.isArray(estilo.paleta) ? estilo.paleta.filter((h) => /^#[0-9A-F]{6}$/i.test(h)).slice(0, 6) : undefined,
    usarPaleta: typeof estilo.usarPaleta === "boolean" ? estilo.usarPaleta : undefined,
    biblia: typeof estilo.biblia === "string" ? estilo.biblia.slice(0, 4000) : undefined,
  };
  const r = await gravarComVersao(s.supabase, id, { estilo: limpo }, versao);
  if (r.ok) atualizar(id);
  return r;
}

export async function salvarPilar(id: string, pilar: Pilar | null): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  if (pilar && !(pilar in PILARES)) return { ok: false, erro: "Pilar desconhecido." };
  const { error } = await s.supabase.from("mkt_pecas").update({ pilar }).eq("id", id);
  if (error) return { ok: false, erro: "Não salvei o pilar. Rode de novo o supabase/marketing.sql no SQL Editor." };
  atualizar(id);
  return { ok: true };
}

export async function agendar(id: string, data: string | null): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  if (data !== null && !DATA.test(data)) return { ok: false, erro: "Data inválida." };
  const { error } = await s.supabase.from("mkt_pecas").update({ posta_em: data }).eq("id", id);
  if (error) return { ok: false, erro: "Não agendei. Tente de novo." };
  atualizar(id);
  return { ok: true };
}

export async function marcarStatus(id: string, status: StatusPeca): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  if (!["rascunho", "pronta", "postada"].includes(status)) return { ok: false, erro: "Estado desconhecido." };
  const { error } = await s.supabase.from("mkt_pecas").update({ status }).eq("id", id);
  if (error) return { ok: false, erro: "Não mudei o estado." };
  atualizar(id);
  return { ok: true };
}

export async function registrarFundo(id: string, caminho: string | null): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  if (caminho && !caminho.startsWith(`${id}/`)) return { ok: false, erro: "Caminho de fundo inválido." };
  const { data: antes } = await s.supabase.from("mkt_pecas").select("fundo").eq("id", id).single<Pick<Peca, "fundo">>();
  const { error } = await s.supabase.from("mkt_pecas").update({ fundo: caminho }).eq("id", id);
  if (error) return { ok: false, erro: "Não gravei o fundo." };
  /* O fundo trocado sai do bucket: cada tentativa no ChatGPT é uma imagem de
     1 a 3 MB, e a pasta da peça não precisa guardar as rejeitadas. */
  if (antes?.fundo && antes.fundo !== caminho) {
    await s.supabase.storage.from("marketing").remove([antes.fundo]);
  }
  atualizar(id);
  return { ok: true };
}

export async function pedir(pecaId: string | null, agente: TipoPedido, entrada: Record<string, unknown> = {}): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  if (agente !== "pautas" && !pecaId) return { ok: false, erro: "Pedido sem peça." };

  /* Um pedido aberto por peça. Apertar "Caetano" duas vezes não pode gerar
     duas copies brigando pela mesma peça. */
  if (pecaId) {
    const { count } = await s.supabase
      .from("mkt_pedidos")
      .select("id", { count: "exact", head: true })
      .eq("peca_id", pecaId)
      .in("status", ["na_fila", "rodando"]);
    if (count) return { ok: false, erro: "Esta peça já tem um pedido rodando. Espere ele terminar." };
  }

  const { error } = await s.supabase
    .from("mkt_pedidos")
    .insert({ owner_id: s.usuario.id, peca_id: pecaId, agente, entrada });
  if (error) return { ok: false, erro: "Não consegui fazer o pedido." };
  atualizar(pecaId ?? undefined);
  return { ok: true };
}

/* ============================================================
   A VITRINE DA OFICINA VIRA PAUTA F2 ("Entrega com número")

   O insumo mais forte do Instagram do estúdio já está no banco: a loja
   colhida, o catálogo lido e a peça em destaque. Este botão monta a pauta
   com isso, e a foto da peça em destaque vira o fundo da capa.

   O briefing lista os ÚNICOS números que a peça pode usar, e diz com
   todas as letras que resultado de venda não foi medido. É a regra da
   casa (nunca inventar número) escrita onde a Paula e o Caetano leem.
   ============================================================ */
export async function postDaLoja(lojaId: string): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  const { data: loja } = await s.supabase
    .from("prod_lojas")
    .select("id, arroba, nome, bio, previa_url")
    .eq("id", lojaId)
    .single<{ id: string; arroba: string; nome: string | null; bio: string | null; previa_url: string | null }>();
  if (!loja) return { ok: false, erro: "Loja não encontrada." };

  const [{ count: pecas }, { data: destaques }, { data: fotos }] = await Promise.all([
    s.supabase.from("prod_produtos").select("id", { count: "exact", head: true }).eq("loja_id", lojaId),
    s.supabase
      .from("prod_produtos")
      .select("nome, ativo_id, prod_ativos(caminho)")
      .eq("loja_id", lojaId)
      .eq("destaque", true)
      .order("ordem_destaque", { ascending: true })
      .limit(3)
      .returns<{ nome: string; ativo_id: string | null; prod_ativos: { caminho: string } | null }[]>(),
    s.supabase
      .from("prod_ativos")
      .select("caminho")
      .eq("loja_id", lojaId)
      .neq("tipo", "MATERIAL")
      .order("ordem", { ascending: true })
      .limit(1)
      .returns<{ caminho: string }[]>(),
  ]);

  const nome = loja.nome || `@${loja.arroba}`;
  const numeros = [pecas ? `${pecas} peças no catálogo da vitrine` : null].filter(Boolean);
  const briefing = [
    `A vitrine digital da ${nome} (@${loja.arroba}), feita pelo estúdio.`,
    loja.bio ? `O que a loja diz de si: ${loja.bio.replace(/\s+/g, " ").slice(0, 200)}` : null,
    destaques?.length ? `Peças em destaque na vitrine: ${destaques.map((d) => d.nome).join(", ")}.` : null,
    loja.previa_url ? `A vitrine no ar: ${loja.previa_url}` : null,
    numeros.length
      ? `Números reais que a peça PODE usar: ${numeros.join("; ")}.`
      : "Não há número medido desta loja.",
    "Resultado de venda ainda não foi medido: não afirmar aumento de venda, conversão nem faturamento. Se o post pedir um número de resultado, deixe o slide sem número.",
  ]
    .filter(Boolean)
    .join(" ");

  const { data: nova, error } = await s.supabase
    .from("mkt_pecas")
    .insert({
      owner_id: s.usuario.id,
      tipo: "carrossel",
      codigo: "F2",
      briefing,
      slides: PILARES.case.roteiro.map(([t, papel], i) => ({ tipo: t, papel, manchete: i === 0 ? nome : "" })),
    })
    .select("id")
    .single<{ id: string }>();
  if (error || !nova) return { ok: false, erro: "Não criei a pauta. Tente de novo." };
  /* O pilar é "Case". Sem a migração de 30/09 a coluna não existe, e a
     pauta segue sem ele em vez de falhar. */
  await s.supabase.from("mkt_pecas").update({ pilar: "case" }).eq("id", nova.id);

  /* A foto: a da primeira peça em destaque, ou a primeira colhida. Ela é
     COPIADA para o bucket do marketing, e não apontada: apagar a loja na
     oficina não pode apagar o fundo de um post que já está no feed. */
  const origem = destaques?.find((d) => d.prod_ativos?.caminho)?.prod_ativos?.caminho ?? fotos?.[0]?.caminho;
  if (origem) {
    const { data: arquivo } = await s.supabase.storage.from("producao").download(origem);
    if (arquivo) {
      const ext = origem.split(".").pop() || "jpg";
      const caminho = `${nova.id}/fundo-loja.${ext}`;
      const { error: erroUp } = await s.supabase.storage
        .from("marketing")
        .upload(caminho, arquivo, { contentType: arquivo.type || "image/jpeg" });
      if (!erroUp) await s.supabase.from("mkt_pecas").update({ fundo: caminho }).eq("id", nova.id);
    }
  }

  revalidatePath("/crm/marketing");
  redirect(`/crm/marketing/${nova.id}`);
}

export async function apagarPeca(id: string): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const { data: p } = await s.supabase.from("mkt_pecas").select("fundo").eq("id", id).single<Pick<Peca, "fundo">>();
  const { error } = await s.supabase.from("mkt_pecas").delete().eq("id", id);
  if (error) return { ok: false, erro: "Não apaguei a peça." };
  if (p?.fundo) await s.supabase.storage.from("marketing").remove([p.fundo]);
  revalidatePath("/crm/marketing");
  redirect("/crm/marketing");
}
