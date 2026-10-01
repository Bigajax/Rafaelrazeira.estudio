"use client";

/* ============================================================
   A PÁGINA DE CRIAÇÃO (v2, 30/09/2026)

   A v1 deixava o design com os agentes e o Rafael só aprovava. Ele pediu
   o contrário: tomar conta da produção, com o design na mão dele. Por isso
   esta tela é um editor, organizado como uma mesa de diagramação:

     à esquerda  a tira dos slides, na ordem do carrossel
     no centro   o slide escolhido, grande, exatamente como vai sair
     à direita   os controles, em três abas:
                   Slide         o tipo, a superfície, o texto, os ajustes
                   Estilo        o fundo do ChatGPT, a família de cor,
                                 o véu e o grão, e o pilar da peça
                   Texto e time  briefing, os agentes, a legenda

   Os agentes continuam aqui, mas como ajuda: eles preenchem, você decide.
   Tudo salva sozinho meio segundo depois da última mudança.
   ============================================================ */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toPng } from "html-to-image";
import {
  type Feito,
  agendar,
  apagarPeca,
  marcarStatus,
  pedir,
  registrarFundo,
  salvarCampo,
  salvarEstilo,
  salvarFormato,
  salvarCategoria,
  salvarPilar,
  salvarSlides,
} from "@/app/(pt)/crm/acoes-marketing";
import { clienteNavegador } from "@/lib/marketing/navegador";
import { coresDaImagem } from "@/lib/marketing/paleta";
import {
  AGENTES,
  BUCKET,
  CATEGORIAS,
  CODIGOS,
  ESTILO_PADRAO,
  DIRECOES,
  ORDEM_AGENTES,
  PILARES,
  TIPOS,
  TIPOS_SLIDE,
  TIPOGRAFIAS,
  LAYOUTS,
  composicaoDe,
  promptComMolde,
  type Composicao,
  LEITURAS,
  LEITURAS_GERAIS,
  PAPEIS,
  RESPIROS,
  WORKER_VIVO_MS,
  papelDe,
  paletaDe,
  legendaFinal,
  corDe,
  urlFundo,
  type Agente,
  type Categoria,
  type Codigo,
  type Estilo,
  type Direcao,
  type ImagemSerie,
  type LayoutId,
  type Leitura,
  type PapelImagem,
  type Respiro,
  type Peca,
  type Pedido,
  type Pilar,
  type Slide,
  type StatusPeca,
  type TipoPeca,
  type TipoSlide,
  type Tipografia,
} from "@/lib/marketing/tipos";
import { SlidePost, tipoDoSlide } from "./SlidePost";
import { LigarTime, nomePedido } from "./SinalTime";
import { NumerosDoPost } from "./NumerosDoPost";
import s from "@/app/(pt)/crm/crm.module.css";
import m from "@/app/(pt)/crm/marketing.module.css";

type Campo = "briefing" | "gancho" | "cta" | "hashtags" | "legenda" | "prompt_capa";
type Aba = "slide" | "estilo" | "texto";

const ESTADOS: { v: StatusPeca; rot: string }[] = [
  { v: "rascunho", rot: "Rascunho" },
  { v: "pronta", rot: "Pronta" },
  { v: "postada", rot: "Postada" },
];

function quando(isoStr: string | null) {
  if (!isoStr) return "";
  return new Date(isoStr).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/* Toda imagem vira WebP de no máximo 1600px no lado maior antes de subir:
   o que sai do ChatGPT tem 2 a 3 MB, e um print de página inteira mais. */
async function paraWebp(arquivo: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(arquivo);
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((ok, falha) => c.toBlob((b) => (b ? ok(b) : falha(new Error("webp"))), "image/webp", 0.9));
}

/* Salvar meio segundo depois da última mudança: digitar no título não pode
   disparar uma gravação por letra, e fechar a aba logo depois não pode
   perder o texto. */
function useAdiado<T>(fn: (v: T) => void, ms = 600) {
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ultimo = useRef<T | null>(null);
  const agora = useCallback(() => {
    if (t.current && ultimo.current !== null) {
      clearTimeout(t.current);
      t.current = null;
      fn(ultimo.current);
    }
  }, [fn]);
  useEffect(() => () => agora(), [agora]);
  return useCallback(
    (v: T) => {
      ultimo.current = v;
      if (t.current) clearTimeout(t.current);
      t.current = setTimeout(() => {
        t.current = null;
        fn(v);
      }, ms);
    },
    [fn, ms],
  );
}

/* A largura do palco segue a coluna do meio E a altura da janela: o slide
   inteiro tem que caber na tela sem rolar, senão o que se diagrama é meio
   post. `proporcao` é largura/altura da prancha. */
function useLargura(max: number, proporcao: number) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(max);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const medir = () => {
      const porAltura = (window.innerHeight - 250) * proporcao;
      setW(Math.max(240, Math.floor(Math.min(max, el.clientWidth, porAltura))));
    };
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    window.addEventListener("resize", medir);
    medir();
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", medir);
    };
  }, [max, proporcao]);
  return [ref, w] as const;
}

export function EditorPeca({ peca, pedidos, vistoEm, hoje }: { peca: Peca; pedidos: Pedido[]; vistoEm: string | null; hoje: string }) {
  const router = useRouter();
  const [pendente, comecar] = useTransition();
  const [aviso, setAviso] = useState<{ ok: boolean; txt: string } | null>(null);
  const [aba, setAba] = useState<Aba>("slide");
  const [atual, setAtual] = useState(0);
  const [campos, setCampos] = useState<Record<Campo, string>>({
    briefing: peca.briefing,
    gancho: peca.gancho,
    cta: peca.cta,
    hashtags: peca.hashtags,
    legenda: peca.legenda,
    prompt_capa: peca.prompt_capa,
  });
  const [slides, setSlides] = useState<Slide[]>(peca.slides);
  const [estilo, setEstilo] = useState<Estilo>({ ...ESTILO_PADRAO, ...(peca.estilo ?? {}) });
  const [subindo, setSubindo] = useState(false);
  /* Na aba Estilo, onde o Ctrl+V cola: 0 = imagem 1, k = a extra k. */
  const [alvoColar, setAlvoColar] = useState(0);
  const [baixando, setBaixando] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const [palcoRef, largPalco] = useLargura(620, TIPOS[peca.tipo].w / TIPOS[peca.tipo].h);

  /* A versão que esta tela está editando. Cada salvamento manda ela e
     recebe a nova; se o time mexeu no meio, o banco recusa e a tela
     recarrega (ver gravarComVersao nas ações). */
  const versao = useRef(peca.atualizado_em);
  /* depois de um conflito, a tela puxa a peça do servidor mesmo com o cursor
     num campo do slide: senão a versão nunca avançava e todo salvamento
     seguinte dava conflito */
  const forcar = useRef(false);
  const [recarga, setRecarga] = useState(0);

  /* Quando o worker devolve, o servidor manda a peça nova. Os campos seguem o
     servidor, menos o que está com o cursor dentro.

     A versão SÓ avança quando os slides do servidor entram na tela. Em 30/09
     ela avançava sempre, e os slides ficavam para trás quando o foco estava
     em qualquer lugar da aba Slide (um botão, uma cor, a caixa da imagem): o
     salvamento seguinte gravava a lista velha com a versão nova, e a trava
     deixava passar. Desfez correções três vezes no mesmo dia. Agora só um
     campo de texto em uso segura os slides, e aí a versão fica velha: o
     próximo salvamento dá conflito e a tela recarrega à força. */
  useEffect(() => {
    setCampos((c) => {
      const ativo = document.activeElement?.getAttribute("name");
      const novo = { ...c };
      (Object.keys(c) as Campo[]).forEach((k) => {
        if (k !== ativo) novo[k] = peca[k];
      });
      return novo;
    });
    const foco = document.activeElement;
    const digitando =
      !forcar.current && !!foco?.closest("[data-slide-campos]") && !!foco?.matches("input, textarea, select");
    forcar.current = false;
    setEstilo({ ...ESTILO_PADRAO, ...(peca.estilo ?? {}) });
    if (digitando) return;
    setSlides(peca.slides);
    versao.current = peca.atualizado_em;
  }, [peca.atualizado_em, recarga]); // eslint-disable-line react-hooks/exhaustive-deps

  const aberto = pedidos.find((p) => p.status === "na_fila" || p.status === "rodando");
  const ultimo = pedidos[0];
  const vivo = vistoEm ? agora - new Date(vistoEm).getTime() < WORKER_VIVO_MS : false;

  useEffect(() => {
    const t = setInterval(() => {
      setAgora(Date.now());
      if (aberto) router.refresh();
    }, 4000);
    return () => clearInterval(t);
  }, [aberto, router]);

  function avisar(r: { ok: boolean; erro?: string }, txtOk: string) {
    setAviso(r.ok ? { ok: true, txt: txtOk } : { ok: false, txt: r.erro ?? "Não deu certo." });
  }

  /* ---------- gravar ---------- */
  const depois = useCallback(
    (r: Feito, txtOk: string) => {
      if (r.ok && r.versao) versao.current = r.versao;
      if ((!r.ok && r.conflito) || (r.ok && r.defasada)) {
        forcar.current = true;
        setRecarga((n) => n + 1);
        router.refresh();
      }
      avisar(r, txtOk);
    },
    [router],
  );
  /* Os salvamentos desta tela andam em fila: cada um só lê a versão depois
     que o anterior respondeu. Sem isso, salvar os slides e o estilo em
     seguida mandava a mesma versão duas vezes, e o segundo virava um falso
     "o time mexeu". */
  const fila = useRef<Promise<void>>(Promise.resolve());
  const emFila = useCallback(
    (salvar: (v: string) => Promise<Feito>, txtOk: string) => {
      fila.current = fila.current.then(async () => depois(await salvar(versao.current), txtOk)).catch(() => {});
      comecar(() => fila.current);
    },
    [depois],
  );
  const gravarSlides = useCallback(
    (novos: Slide[]) => emFila((v) => salvarSlides(peca.id, novos, v), "Salvo"),
    [peca.id, emFila],
  );
  const slidesAdiado = useAdiado(gravarSlides);
  const gravarEstilo = useCallback(
    (e: Estilo) => emFila((v) => salvarEstilo(peca.id, e, v), "Estilo salvo"),
    [peca.id, emFila],
  );
  const estiloAdiado = useAdiado(gravarEstilo, 400);

  function mudarSlides(novos: Slide[], ja = false) {
    setSlides(novos);
    if (ja) gravarSlides(novos);
    else slidesAdiado(novos);
  }
  function mexer(parte: Partial<Slide>) {
    mudarSlides(slides.map((x, j) => (j === atual ? { ...x, ...parte } : x)));
  }
  function mudarEstilo(parte: Partial<Estilo>) {
    const novo = { ...estilo, ...parte };
    setEstilo(novo);
    estiloAdiado(novo);
  }
  function salvar(campo: Campo) {
    if (campos[campo] === peca[campo]) return;
    const valor = campos[campo];
    emFila((v) => salvarCampo(peca.id, campo, valor, v), "Salvo");
  }

  /* A Dora VÊ a capa que você gerou e reescreve os prompts seguintes para
     continuar a mesma história, com os mesmos personagens. */
  /* "Outra versão deste slide": o que você quer mudar vai para a Dora, que
     refaz só o prompt do slide aberto. */
  const [mudanca, setMudanca] = useState("");
  function outraVersao() {
    const instrucao = mudanca.trim();
    comecar(async () => {
      avisar(
        await pedir(peca.id, "diretor-arte", { modo: "slide", slide: atual + 1, instrucao }),
        `A Dora vai refazer o prompt do slide ${atual + 1}`,
      );
      setMudanca("");
      router.refresh();
    });
  }

  function continuarSerie() {
    comecar(async () => {
      avisar(await pedir(peca.id, "diretor-arte", { modo: "continuar" }), "A Dora vai continuar a série a partir da capa");
      router.refresh();
    });
  }

  function chamar(agente: Agente | "tudo") {
    comecar(async () => {
      avisar(await pedir(peca.id, agente), "Pedido feito");
      router.refresh();
    });
  }

  /* ---------- imagens ---------- */
  async function subirArquivo(arquivo: Blob, nome: string) {
    const webp = await paraWebp(arquivo);
    const caminho = `${peca.id}/${nome}-${Date.now()}.webp`;
    const { error } = await clienteNavegador().storage.from(BUCKET).upload(caminho, webp, { contentType: "image/webp" });
    if (error) throw new Error(error.message);
    return caminho;
  }

  async function subirFundo(arquivo: Blob) {
    setSubindo(true);
    try {
      const caminho = await subirArquivo(arquivo, "fundo");
      avisar(await registrarFundo(peca.id, caminho), "Imagem 1 aplicada");
      /* as cores do carrossel saem da imagem 1 */
      const url = urlFundo(caminho);
      if (url) {
        try {
          const paleta = await coresDaImagem(url);
          const novo = { ...estilo, paleta, usarPaleta: estilo.usarPaleta ?? true };
          setEstilo(novo);
          gravarEstilo(novo);
        } catch {
          /* sem cores, vale a paleta da direção */
        }
      }
      router.refresh();
    } catch (e) {
      setAviso({ ok: false, txt: `Não subi o fundo: ${e instanceof Error ? e.message : "erro"}` });
    } finally {
      setSubindo(false);
    }
  }

  /* As imagens da série além da primeira. */
  function mudarExtra(k: number, parte: Partial<ImagemSerie>) {
    const extras = [...(estilo.extras ?? [])];
    extras[k] = { ...extras[k], ...parte, prompt: parte.prompt ?? extras[k]?.prompt ?? "" };
    mudarEstilo({ extras });
  }
  async function subirExtra(arquivo: Blob, k: number) {
    setSubindo(true);
    try {
      const caminho = await subirArquivo(arquivo, `serie-${k + 2}`);
      const extras = [...(estilo.extras ?? [])];
      extras[k] = { ...extras[k], prompt: extras[k]?.prompt ?? "", caminho };
      const novo = { ...estilo, extras };
      setEstilo(novo);
      gravarEstilo(novo);
    } catch (e) {
      setAviso({ ok: false, txt: `Não subi a imagem: ${e instanceof Error ? e.message : "erro"}` });
    } finally {
      setSubindo(false);
    }
  }

  /* Colou num slide que ainda não tem imagem: a imagem nasce PARA ESTE
     slide (uma extra presa a ele), e o slide passa a apontar para ela. */
  async function subirNovaDoSlide(arquivo: Blob) {
    setSubindo(true);
    try {
      const k = estilo.extras?.length ?? 0;
      const caminho = await subirArquivo(arquivo, `serie-${k + 2}`);
      const extras = [...(estilo.extras ?? []), { prompt: "", slide: atual + 1, caminho }];
      const novo = { ...estilo, extras };
      setEstilo(novo);
      gravarEstilo(novo);
      /* o respiro de cor não desenha imagem: com imagem, o slide vira "imagem própria" */
      mudarSlides(
        slides.map((x, j) =>
          j === atual ? { ...x, imagem: extras.length, papel: papelAtual === "respiro" ? "resposta" : x.papel } : x,
        ),
        true,
      );
    } catch (e) {
      setAviso({ ok: false, txt: `Não subi a imagem: ${e instanceof Error ? e.message : "erro"}` });
    } finally {
      setSubindo(false);
    }
  }

  async function subirDoSlide(arquivo: Blob, campo: "img" | "img2") {
    setSubindo(true);
    try {
      const caminho = await subirArquivo(arquivo, "img");
      mudarSlides(slides.map((x, j) => (j === atual ? { ...x, [campo]: caminho } : x)), true);
    } catch (e) {
      setAviso({ ok: false, txt: `Não subi a imagem: ${e instanceof Error ? e.message : "erro"}` });
    } finally {
      setSubindo(false);
    }
  }

  const slideAtual = slides[atual];
  const props = (i: number) => ({
    slide: slides[i],
    i,
    total: slides.length,
    tipo: peca.tipo,
    fundo: urlFundo(peca.fundo),
    extras: (estilo.extras ?? []).map((x) => urlFundo(x.caminho ?? null)),
    cta: campos.cta,
    estilo,
  });
  const tipoAtual: TipoSlide | null = slideAtual ? tipoDoSlide(props(atual)) : null;
  const papelAtual: PapelImagem | null = slideAtual && tipoAtual ? papelDe(slideAtual, tipoAtual) : null;
  const serieUrls = [urlFundo(peca.fundo), ...(estilo.extras ?? []).map((x) => urlFundo(x.caminho ?? null))];
  /* cada slide tem a sua imagem; só o slide 1 e a "volta à abertura" usam
     a imagem 1 sem ninguém apontar (ver SlidePost) */
  const indicePadrao = atual === 0 || papelAtual === "fecho" ? 0 : -1;
  /* Com um molde da galeria, o SlidePost desenha a imagem da SÉRIE, nunca o
     print do slide. Em 30/09 o slide 4 da "minha história" tinha papel prova
     e molde "imagem em cima": a imagem colada ia para o print, subia, e o
     molde mostrava o espaço vazio; e o prompt do slide nem aparecia. */
  const comMolde = Boolean(slideAtual?.layout && slideAtual.layout in LAYOUTS);
  /* as cores que o título e o destaque podem ter: as da paleta em uso (fundo e
     acento de cada uma), mais branco e preto */
  const coresDoTexto = [...new Set([...paletaDe(estilo).flatMap((x) => [x.bg, x.acento]), "#FFFFFF", "#111111"].map((h) => h.toUpperCase()))];
  const focoAtual = slideAtual?.foco ?? { x: 50, y: 35, z: papelAtual === "zoom" ? 2 : 1 };

  /* Ctrl+V cola imagem onde faz sentido: no print do slide "tela", nos lados
     vazios do "ruim × bom", e no fundo em todo o resto. Com o cursor num
     campo de texto, é texto que se está colando, e a página não se mete. */
  useEffect(() => {
    function colar(e: ClipboardEvent) {
      const alvo = e.target as HTMLElement | null;
      if (alvo?.closest?.("input, textarea, select")) return;
      const item = [...(e.clipboardData?.items ?? [])].find((it) => it.type.startsWith("image/"));
      const arquivo = item?.getAsFile();
      if (!arquivo) return;
      e.preventDefault();
      if (aba === "slide" && tipoAtual === "tela" && !comMolde) void subirDoSlide(arquivo, "img");
      else if (aba === "slide" && tipoAtual === "comparacao") void subirDoSlide(arquivo, slideAtual?.img ? "img2" : "img");
      else if (aba === "slide" && atual === 0) void subirFundo(arquivo);
      else if (aba === "slide" && papelAtual === "prova" && !comMolde) void subirDoSlide(arquivo, "img");
      else if (aba === "slide" && slideAtual && (slideAtual.imagem ?? 0) > 0 && papelAtual !== "respiro")
        void subirExtra(arquivo, (slideAtual.imagem ?? 1) - 1);
      /* todo slide aceita imagem (30/09), inclusive o respiro de cor */
      else if (aba === "slide" && slideAtual) void subirNovaDoSlide(arquivo);
      else if (aba === "estilo" && alvoColar > 0) void subirExtra(arquivo, alvoColar - 1);
      else void subirFundo(arquivo);
    }
    window.addEventListener("paste", colar);
    return () => window.removeEventListener("paste", colar);
  });

  /* ---------- PNG ---------- */
  async function baixar(indices: number[]) {
    setBaixando(true);
    try {
      await document.fonts.ready;
      const { w, h } = TIPOS[peca.tipo];
      const nome = (campos.gancho || "post")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^\w]+/g, "-")
        .slice(0, 40);
      for (const i of indices) {
        const no = refs.current[i];
        if (!no) continue;
        const url = await toPng(no, { width: w, height: h, pixelRatio: 1, cacheBust: true });
        const a = document.createElement("a");
        a.href = url;
        a.download = `${peca.posta_em ?? "sem-data"}-${nome}-${String(i + 1).padStart(2, "0")}.png`;
        a.click();
        await new Promise((r) => setTimeout(r, 350));
      }
    } catch (e) {
      setAviso({ ok: false, txt: `Não gerei o PNG: ${e instanceof Error ? e.message : "erro"}` });
    } finally {
      setBaixando(false);
    }
  }

  async function copiar(txt: string, rot: string) {
    try {
      await navigator.clipboard.writeText(txt);
      setAviso({ ok: true, txt: `${rot} copiado` });
    } catch {
      setAviso({ ok: false, txt: "O navegador não deixou copiar. Selecione o texto à mão." });
    }
  }

  /* ---------- slides: incluir, mover, tirar ---------- */
  function novoSlide(tipo: TipoSlide) {
    const novos = [...slides.slice(0, atual + 1), { tipo, manchete: "" }, ...slides.slice(atual + 1)];
    mudarSlides(novos, true);
    setAtual(Math.min(atual + 1, novos.length - 1));
    setAba("slide");
  }
  function mover(d: -1 | 1) {
    const j = atual + d;
    if (j < 0 || j >= slides.length) return;
    const n = [...slides];
    [n[atual], n[j]] = [n[j], n[atual]];
    mudarSlides(n, true);
    setAtual(j);
  }
  function duplicar() {
    const n = [...slides.slice(0, atual + 1), { ...slides[atual] }, ...slides.slice(atual + 1)];
    mudarSlides(n, true);
    setAtual(atual + 1);
  }
  function tirar() {
    const n = slides.filter((_, j) => j !== atual);
    mudarSlides(n, true);
    setAtual(Math.max(0, Math.min(atual, n.length - 1)));
  }

  const fundo = urlFundo(peca.fundo);
  const { w, h } = TIPOS[peca.tipo];
  const legenda = legendaFinal({ ...peca, ...campos });
  const story = peca.tipo === "story";
  /* o prompt copiado é a cena da Dora + a composição do molde do slide:
     trocou o molde, o prompt muda na hora (30/09) */
  const composicaoCapa = slides[0] ? composicaoDe(slides[0], papelDe(slides[0], tipoDoSlide(props(0))), estilo) : null;
  const promptChat = promptComMolde(campos.prompt_capa, composicaoCapa, story);
  const composicaoAtual = slideAtual && papelAtual ? composicaoDe(slideAtual, papelAtual, estilo) : null;
  const linhaComposicao = (cmp: Composicao | null, molde?: LayoutId) =>
    cmp ? (
      <p className={m.composicao}>
        <b>Entra no fim do prompt, pelo molde ({molde ? LAYOUTS[molde].nome : "padrão do papel"}):</b> {cmp.texto}{" "}
        <i>({cmp.formato})</i>
      </p>
    ) : null;
  function pedirPrompt(instrucao: string, aviso: string) {
    comecar(async () => {
      avisar(await pedir(peca.id, "diretor-arte", { modo: "slide", slide: atual + 1, instrucao }), aviso);
      router.refresh();
    });
  }
  function pedirFaltantes() {
    comecar(async () => {
      avisar(await pedir(peca.id, "diretor-arte", { modo: "faltantes" }), "A Dora vai escrever os prompts dos slides que ainda não têm");
      router.refresh();
    });
  }
  const k = largPalco / w;

  return (
    <div className={`${m.tela} ${m.criar}`}>
      <header className={m.criarCab}>
        <Link href={peca.posta_em ? `/crm/marketing?mes=${peca.posta_em.slice(0, 7)}` : "/crm/marketing"} className={m.voltar}>
          Calendário
        </Link>
        <h1>
          {(campos.gancho || "Peça nova").replace(/[.\s]+$/, "")}
          {/[?!]$/.test(campos.gancho.trim()) ? null : <i className={s.ponto}>.</i>}
        </h1>
        <div className={m.pecaMeta}>
          {peca.categoria ? <span className={m.pilarSelo}>{CATEGORIAS[peca.categoria].nome}</span> : null}
          {peca.pilar ? <span className={m.pilarSelo}>{PILARES[peca.pilar].nome}</span> : null}
          <label className={m.metaItem}>
            <span>Posta em</span>
            <input
              type="date"
              defaultValue={peca.posta_em ?? ""}
              onChange={(e) => {
                const v = e.target.value || null;
                comecar(async () => avisar(await agendar(peca.id, v), v ? "Agendada" : "Sem data"));
              }}
            />
          </label>
          <div className={m.estados} role="radiogroup" aria-label="Estado da peça">
            {ESTADOS.map(({ v, rot }) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={peca.status === v}
                className={`${m.estado} ${peca.status === v ? m.estadoAtivo : ""}`}
                onClick={() => comecar(async () => avisar(await marcarStatus(peca.id, v), rot))}
              >
                {rot}
              </button>
            ))}
          </div>
          <span className={aviso?.ok === false ? s.erro : s.salvo} aria-live="polite">
            {pendente ? "Salvando" : aviso?.txt}
          </span>
        </div>
      </header>

      {/* 01/10: "os prompts algumas vezes não estão sendo gerados". O worker
          estava desligado desde a véspera, com três pedidos parados, e o aviso
          só aparecia na aba Texto. Agora ele fica acima da mesa, em toda aba. */}
      {aberto && !vivo ? (
        <p className={m.faixaTime} role="alert">
          <b>O time está desligado, e o pedido não vai andar.</b> {nomePedido(aberto)}: na fila desde {quando(aberto.criado_em)}. <LigarTime />
        </p>
      ) : !aberto && ultimo?.status === "erro" ? (
        <p className={m.faixaTime} role="alert">
          <b>O último pedido falhou</b> ({quando(ultimo.terminado_em)}): {ultimo.erro}
        </p>
      ) : null}

      {/* 01/10: postado, o post pede os números dele (ver NumerosDoPost) */}
      {peca.status === "postada" ? <NumerosDoPost peca={peca} hoje={hoje} /> : null}

      <div className={m.mesaCriar}>
        {/* ============ a tira dos slides ============ */}
        <nav className={m.tira} aria-label="Slides da peça">
          <ol>
            {slides.map((_, i) => (
              <li key={i}>
                <button
                  type="button"
                  className={`${m.tiraItem} ${i === atual ? m.tiraAtivo : ""}`}
                  onClick={() => {
                    setAtual(i);
                    setAba("slide");
                  }}
                  aria-current={i === atual}
                  aria-label={`Slide ${i + 1}, ${TIPOS_SLIDE[tipoDoSlide(props(i))].nome}`}
                >
                  <span className={m.tiraNum}>{String(i + 1).padStart(2, "0")}</span>
                  <span className={m.tiraArte} style={{ width: 112, height: Math.round((h * 112) / w) }}>
                    <span style={{ transform: `scale(${112 / w})`, transformOrigin: "0 0", width: w, height: h, display: "block" }}>
                      <SlidePost {...props(i)} />
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <label className={m.tiraNovo}>
            <span>Novo slide</span>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) novoSlide(e.target.value as TipoSlide);
              }}
            >
              <option value="">+ tipo</option>
              {(Object.keys(TIPOS_SLIDE) as TipoSlide[]).map((t) => (
                <option key={t} value={t}>
                  {TIPOS_SLIDE[t].nome}
                </option>
              ))}
            </select>
          </label>
        </nav>

        {/* ============ o palco ============ */}
        <section className={m.palco} ref={palcoRef} aria-label="O slide em tamanho de leitura">
          {slideAtual ? (
            <>
              <div className={m.palcoArte} style={{ width: largPalco, height: Math.round(h * k) }}>
                <div style={{ transform: `scale(${k})`, transformOrigin: "0 0", width: w, height: h }}>
                  <SlidePost {...props(atual)} />
                </div>
                {slideAtual?.texto ? (
                  <AlcaTexto
                    texto={slideAtual.texto}
                    largura={largPalco}
                    altura={Math.round(h * k)}
                    aoMudar={(texto) => mexer({ texto })}
                  />
                ) : null}
              </div>
              <div className={m.palcoPe}>
                <span className={m.medida}>
                  {atual + 1} de {slides.length}, {w}x{h}
                </span>
                <button type="button" className={s.btnMini} disabled={baixando} onClick={() => baixar([atual])}>
                  Baixar este
                </button>
                <button type="button" className={s.btnAcao} disabled={baixando} onClick={() => baixar(slides.map((_, i) => i))}>
                  {baixando ? "Gerando" : slides.length > 1 ? "Baixar todos" : "Baixar PNG"}
                </button>
              </div>
            </>
          ) : (
            <div className={m.mesaVazia}>
              <b>Sem slides ainda.</b>
              <p>Escolha o tipo do primeiro slide na coluna da esquerda, ou peça a copy ao Caetano na aba Texto e time.</p>
              <div className={m.fundoAcoes}>
                <button type="button" className={s.btn} onClick={() => novoSlide("capa")}>
                  Começar pela capa
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ============ os controles ============ */}
        <aside className={m.painel} aria-label="Controles">
          <div className={m.abas} role="tablist">
            {(
              [
                ["slide", "Slide"],
                ["estilo", "Estilo"],
                ["texto", "Texto e time"],
              ] as [Aba, string][]
            ).map(([v, rot]) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={aba === v}
                className={`${m.aba} ${aba === v ? m.abaAtiva : ""}`}
                onClick={() => setAba(v)}
              >
                {rot}
                {v === "texto" && aberto ? <i className={m.abaVivo} aria-label="agente trabalhando" /> : null}
              </button>
            ))}
          </div>

          {/* ---------- ABA SLIDE ---------- */}
          {aba === "slide" && slideAtual && tipoAtual ? (
            <div className={m.painelCorpo} data-slide-campos>
              {/* ---------- os moldes: onde a imagem e o texto moram neste slide ---------- */}
              <div className={m.moldesBloco}>
                <span className={s.campoRot}>Molde</span>
                <div className={m.moldesGrade} role="radiogroup" aria-label="Molde do slide">
                  {([undefined, ...(Object.keys(LAYOUTS) as LayoutId[])] as (LayoutId | undefined)[]).map((id) => {
                    const ativo = (slideAtual.layout ?? undefined) === id;
                    const kMini = 96 / w;
                    return (
                      <button
                        key={id ?? "padrao"}
                        type="button"
                        role="radio"
                        aria-checked={ativo}
                        className={`${m.moldeItem} ${ativo ? m.moldeAtivo : ""}`}
                        onClick={() => mexer({ layout: id, texto: undefined })}
                        title={id ? LAYOUTS[id].nome : "O molde que o papel da imagem escolhe"}
                      >
                        <span className={m.moldeMini} style={{ width: 96, height: Math.round(h * kMini) }}>
                          <span style={{ display: "block", transform: `scale(${kMini})`, transformOrigin: "0 0", width: w, height: h }}>
                            <SlidePost {...props(atual)} slide={{ ...slideAtual, layout: id, texto: undefined }} />
                          </span>
                        </span>
                        <span className={m.moldeNome}>{id ? LAYOUTS[id].nome : "Padrão do papel"}</span>
                      </button>
                    );
                  })}
                </div>
                {/* trocou o molde: a composição do prompt já mudou; a cena, a Dora refaz */}
                {composicaoAtual ? (
                  <button
                    type="button"
                    className={s.btnMini}
                    disabled={Boolean(aberto)}
                    onClick={() =>
                      pedirPrompt(
                        `O Rafael escolheu o molde "${slideAtual.layout ? LAYOUTS[slideAtual.layout].nome : "padrão do papel"}" para este slide. Reescreva a cena para funcionar nele: o assunto onde a imagem aparece, e o espaço do texto livre.`,
                        `A Dora vai reescrever a cena do slide ${atual + 1} para este molde`,
                      )
                    }
                  >
                    Pedir à Dora a cena para este molde
                  </button>
                ) : null}
              </div>

              <div className={s.dupla}>
                <label className={s.campo}>
                  <span className={s.campoRot}>Tipo</span>
                  <select value={tipoAtual} onChange={(e) => mexer({ tipo: e.target.value as TipoSlide })}>
                    {(Object.keys(TIPOS_SLIDE) as TipoSlide[]).map((t) => (
                      <option key={t} value={t}>
                        {TIPOS_SLIDE[t].nome}
                      </option>
                    ))}
                  </select>
                </label>
                <div className={s.campo}>
                  <span className={s.campoRot}>Cor do slide</span>
                  <div className={m.cores} role="radiogroup" aria-label="Cor do slide">
                    {/* as amostras são as cores que o slide USA de verdade: as da
                        imagem, quando a peça tira cor da imagem; senão, as da
                        direção (antes mostravam sempre as da direção e o clique
                        caía numa cor diferente da amostra) */}
                    {paletaDe(estilo).map((c, k) => {
                      const ativa = corDe(estilo.direcao ?? "acido", slideAtual, atual, estilo).bg === c.bg;
                      return (
                        <button
                          key={c.nome}
                          type="button"
                          role="radio"
                          aria-checked={ativa}
                          aria-label={c.nome}
                          title={c.nome}
                          className={`${m.corAmostra} ${ativa ? m.corAtiva : ""}`}
                          style={{ background: c.bg }}
                          onClick={() => mexer({ cor: k })}
                        >
                          <i style={{ background: c.acento }} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ---------- a cor do título e a do destaque ---------- */}
              {(
                [
                  ["corTexto", "Cor do título"],
                  ["corAcento", "Cor do destaque (voz 1 e palavra em destaque)"],
                ] as const
              ).map(([campo, rot]) => (
                <div key={campo} className={s.campo}>
                  <span className={s.campoRot}>{rot}</span>
                  <div className={m.cores} role="radiogroup" aria-label={rot}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={!slideAtual[campo]}
                      className={`${m.corAuto} ${!slideAtual[campo] ? m.corAtiva : ""}`}
                      onClick={() => mexer({ [campo]: undefined })}
                      title="Automática: sai da cor do slide"
                    >
                      auto
                    </button>
                    {coresDoTexto.map((h) => (
                      <button
                        key={h}
                        type="button"
                        role="radio"
                        aria-checked={slideAtual[campo] === h}
                        aria-label={h}
                        title={h}
                        className={`${m.corAmostra} ${slideAtual[campo] === h ? m.corAtiva : ""}`}
                        style={{ background: h }}
                        onClick={() => mexer({ [campo]: h })}
                      />
                    ))}
                  </div>
                </div>
              ))}
              {/* ---------- o texto: no molde ou solto, e como ele lê ---------- */}
              <div className={m.textoBloco}>
                <div className={m.rotComAcao}>
                  <span className={s.campoRot}>Texto</span>
                  {slideAtual.texto ? (
                    <button type="button" className={s.btnMini} onClick={() => mexer({ texto: undefined })}>
                      Devolver ao molde
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={s.btnMini}
                      onClick={() => mexer({ texto: { x: 7, y: 14, w: 86, alinhar: "esquerda" } })}
                    >
                      Soltar o texto (mover à mão)
                    </button>
                  )}
                </div>
                {slideAtual.texto ? (
                  <>
                    <p className={m.ajuda}>Arraste o texto no slide. Puxe a borda direita para mudar a largura.</p>
                    <div className={m.segmento} role="radiogroup" aria-label="Alinhamento do texto">
                      {(["esquerda", "centro", "direita"] as const).map((a) => (
                        <button
                          key={a}
                          type="button"
                          role="radio"
                          aria-checked={slideAtual.texto?.alinhar === a}
                          className={slideAtual.texto?.alinhar === a ? m.segAtivo : ""}
                          onClick={() => mexer({ texto: { ...slideAtual.texto!, alinhar: a } })}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}
                {slideAtual.texto && papelAtual !== "abertura" ? (
                  <div className={s.campo} style={{ marginTop: 10 }}>
                    <span className={s.campoRot}>Proteção de leitura</span>
                    <div className={m.segmento} role="radiogroup" aria-label="Proteção de leitura">
                      {LEITURAS_GERAIS.map((l) => {
                        const atualL = slideAtual.leitura && LEITURAS_GERAIS.includes(slideAtual.leitura) ? slideAtual.leitura : "livre";
                        return (
                          <button
                            key={l}
                            type="button"
                            role="radio"
                            aria-checked={atualL === l}
                            className={atualL === l ? m.segAtivo : ""}
                            onClick={() => mexer({ leitura: l })}
                            title={LEITURAS[l].faz}
                          >
                            {LEITURAS[l].nome}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              <p className={m.ajuda}>{TIPOS_SLIDE[tipoAtual].ajuda}.</p>

              {/* ---------- o papel da imagem neste slide ---------- */}
              <div className={m.papelBloco}>
                <label className={s.campo}>
                  <span className={s.campoRot}>Papel da imagem</span>
                  <select value={papelAtual ?? "respiro"} onChange={(e) => mexer({ papel: e.target.value as PapelImagem })}>
                    {(Object.keys(PAPEIS) as PapelImagem[]).map((p) => (
                      <option key={p} value={p}>
                        {PAPEIS[p].nome}
                      </option>
                    ))}
                  </select>
                </label>
                {papelAtual ? <p className={m.ajuda}>{PAPEIS[papelAtual].faz}.</p> : null}
                {papelAtual === "abertura" ? (
                  <div className={s.campo}>
                    <span className={s.campoRot}>Como o título lê sobre a imagem</span>
                    <div className={m.segmento} role="radiogroup" aria-label="Leitura do título">
                      {(Object.keys(LEITURAS) as Leitura[]).map((l) => (
                        <button
                          key={l}
                          type="button"
                          role="radio"
                          aria-checked={(slideAtual.leitura ?? "veu") === l}
                          className={(slideAtual.leitura ?? "veu") === l ? m.segAtivo : ""}
                          onClick={() => mexer({ leitura: l })}
                          title={LEITURAS[l].faz}
                        >
                          {LEITURAS[l].nome}
                        </button>
                      ))}
                    </div>
                    <p className={m.ajuda}>{LEITURAS[slideAtual.leitura ?? "veu"].faz}.</p>
                  </div>
                ) : null}
                {papelAtual && papelAtual !== "respiro" ? (
                  <div className={s.campo}>
                    <span className={s.campoRot}>Qual imagem da série</span>
                    <div className={m.segmento}>
                      {serieUrls.map((u, k) => (
                        <button
                          key={k}
                          type="button"
                          className={(slideAtual.imagem ?? indicePadrao) === k ? m.segAtivo : ""}
                          onClick={() => mexer({ imagem: k })}
                          title={u ? "Imagem colada" : "Ainda sem imagem"}
                        >
                          {k + 1}
                          {u ? "" : " (vazia)"}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {/* ---------- a imagem DESTE slide ----------
                    Desde 30/09 cada slide pode ter a sua geração: é o que
                    impede o carrossel de repetir a mesma imagem. */}
                {slideAtual && papelAtual ? (
                  (() => {
                    /* a prova mostra um print dentro da janela do navegador */
                    if (papelAtual === "prova" && !comMolde)
                      return tipoAtual === "tela" ? null : (
                        <div className={m.imagemSlide}>
                          <span className={s.campoRot}>O print deste slide (dentro da janela)</span>
                          <SoltaImagem
                            caminho={slideAtual.img}
                            subindo={subindo}
                            aoSubir={(f) => subirDoSlide(f, "img")}
                            aoTirar={() => mexer({ img: undefined })}
                            texto="Ctrl+V cola aqui, ou arraste, ou clique"
                            largo
                            ativo
                          />
                        </div>
                      );
                    const idx = papelAtual === "respiro" ? -1 : slideAtual.imagem ?? indicePadrao;
                    if (idx === 0 && atual === 0) {
                      return (
                        <div className={m.imagemSlide}>
                          <span className={s.campoRot}>A imagem deste slide (a abertura)</span>
                          <textarea
                            name="prompt_capa"
                            rows={4}
                            value={campos.prompt_capa}
                            placeholder="O prompt da imagem da capa. Peça à Dora ou escreva o seu."
                            onChange={(e) => setCampos({ ...campos, prompt_capa: e.target.value })}
                            onBlur={() => salvar("prompt_capa")}
                          />
                          {linhaComposicao(composicaoCapa, slides[0]?.layout)}
                          <div className={m.fundoAcoes}>
                            <a
                              className={`${s.btn} ${promptChat ? "" : m.desligado}`}
                              href={promptChat ? `https://chatgpt.com/?q=${encodeURIComponent(promptChat)}` : undefined}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Abrir no ChatGPT
                            </a>
                            <button type="button" className={s.btnMini} disabled={!promptChat} onClick={() => copiar(promptChat, "Prompt")}>
                              Copiar prompt
                            </button>
                          </div>
                          <SoltaImagem
                            url={fundo}
                            subindo={subindo}
                            aoSubir={subirFundo}
                            aoTirar={() => comecar(async () => avisar(await registrarFundo(peca.id, null), "Imagem removida"))}
                            texto="Ctrl+V cola aqui, ou arraste, ou clique"
                            largo
                            ativo
                          />
                        </div>
                      );
                    }
                    const extra = idx > 0 ? estilo.extras?.[idx - 1] : undefined;
                    const promptSlide = promptComMolde(extra?.prompt ?? "", composicaoAtual, story);
                    const gerarPropria = () => {
                      const extras = [...(estilo.extras ?? []), { prompt: "", slide: atual + 1 }];
                      mudarEstilo({ extras });
                      mexer({
                        imagem: extras.length,
                        papel: papelAtual === "respiro" ? "resposta" : papelAtual,
                      });
                    };
                    if (idx > 0 && extra) {
                      return (
                        <div className={m.imagemSlide}>
                          <span className={s.campoRot}>A imagem deste slide (próximo plano da série)</span>
                          <p className={m.ajuda}>
                            Gere na MESMA conversa do ChatGPT em que você gerou a imagem anterior, com ela anexada: é o que
                            mantém os mesmos personagens. Por isso aqui é copiar e colar lá, e não abrir uma conversa nova.
                          </p>
                          <textarea
                            rows={4}
                            value={extra.prompt}
                            placeholder="O prompt desta imagem. Peça à Dora ou escreva o seu."
                            onChange={(e) => mudarExtra(idx - 1, { prompt: e.target.value })}
                          />
                          {linhaComposicao(composicaoAtual, slideAtual.layout)}
                          {!extra.prompt?.trim() ? (
                            <div className={m.fundoAcoes}>
                              <button
                                type="button"
                                className={s.btnMini}
                                disabled={Boolean(aberto)}
                                onClick={() =>
                                  pedirPrompt("Escreva o prompt deste slide a partir do texto dele e do molde.", `A Dora vai escrever o prompt do slide ${atual + 1}`)
                                }
                              >
                                Pedir este prompt à Dora
                              </button>
                              <button type="button" className={s.btnMini} disabled={Boolean(aberto)} onClick={pedirFaltantes}>
                                Pedir todos os que faltam
                              </button>
                            </div>
                          ) : null}
                          <div className={m.fundoAcoes}>
                            <button type="button" className={s.btn} disabled={!promptSlide} onClick={() => copiar(promptSlide, "Prompt")}>
                              Copiar prompt
                            </button>
                            {peca.fundo ? (
                              <button type="button" className={s.btnMini} disabled={Boolean(aberto)} onClick={continuarSerie}>
                                Continuar a série a partir da capa
                              </button>
                            ) : null}
                          </div>
                          <SoltaImagem
                            url={urlFundo(extra.caminho ?? null)}
                            subindo={subindo}
                            aoSubir={(arq) => subirExtra(arq, idx - 1)}
                            aoTirar={() => mudarExtra(idx - 1, { caminho: undefined })}
                            texto="Ctrl+V cola aqui, ou arraste, ou clique"
                            largo
                            ativo
                          />
                        </div>
                      );
                    }
                    /* todo slide aceita a sua imagem (30/09): o respiro e a capa
                       voltando também, sem esconder a caixa atrás de um botão */
                    return (
                      <div className={m.imagemSlide}>
                        <span className={s.campoRot}>A imagem deste slide</span>
                        <p className={m.ajuda}>
                          {idx === 0
                            ? "Hoje este slide repete a imagem do slide 1. Cole outra aqui e ele passa a ter a dele."
                            : papelAtual === "respiro"
                              ? "Hoje este slide é só cor. Cole uma imagem aqui e ele passa a ter a dele."
                              : "Este slide ainda não tem a imagem dele. Cole aqui, ou peça o prompt."}
                        </p>
                        <SoltaImagem
                          url={null}
                          subindo={subindo}
                          aoSubir={subirNovaDoSlide}
                          aoTirar={() => undefined}
                          texto="Ctrl+V cola aqui, ou arraste, ou clique"
                          largo
                          ativo
                        />
                        <div className={m.fundoAcoes}>
                          <button
                            type="button"
                            className={s.btn}
                            disabled={Boolean(aberto)}
                            onClick={() =>
                              pedirPrompt("Escreva o prompt deste slide a partir do texto dele e do molde.", `A Dora vai escrever o prompt do slide ${atual + 1}`)
                            }
                          >
                            Pedir este prompt à Dora
                          </button>
                          <button type="button" className={s.btnMini} disabled={Boolean(aberto)} onClick={pedirFaltantes}>
                            Pedir todos os que faltam
                          </button>
                          <button type="button" className={s.btnMini} onClick={gerarPropria}>
                            Escrever eu mesmo
                          </button>
                        </div>
                      </div>
                    );
                  })()
                ) : null}
                {papelAtual && papelAtual !== "respiro" && papelAtual !== "prova" && papelAtual !== "fecho" ? (
                  <div className={m.outraVersao}>
                    <span className={s.campoRot}>Outra versão da imagem deste slide</span>
                    <textarea
                      rows={2}
                      value={mudanca}
                      placeholder="O que mudar. Ex.: mais de perto, o boneco cansado, madrugada, a luminária apagando."
                      onChange={(e) => setMudanca(e.target.value)}
                    />
                    <button type="button" className={s.btnMini} disabled={Boolean(aberto)} onClick={outraVersao}>
                      Pedir outra versão à Dora
                    </button>
                  </div>
                ) : null}
                {papelAtual && ["abertura", "zoom", "contraste", "resposta", "fecho", "voce"].includes(papelAtual) ? (
                  <fieldset className={m.ajustes}>
                    <legend className={s.campoRot}>Foco da imagem</legend>
                    {(
                      [
                        ["x", "Horizontal", 0, 100, 1],
                        ["y", "Vertical", 0, 100, 1],
                        ["z", "Aproximar", 1, 4, 0.1],
                      ] as const
                    ).map(([eixo, rot, min, max, passo]) => (
                      <label key={eixo} className={m.ajusteLinha}>
                        <span>{rot}</span>
                        <input
                          type="range"
                          min={min}
                          max={max}
                          step={passo}
                          value={focoAtual[eixo]}
                          onChange={(e) => mexer({ foco: { ...focoAtual, [eixo]: Number(e.target.value) } })}
                        />
                        <b>{eixo === "z" ? `${focoAtual.z.toFixed(1)}x` : `${Math.round(focoAtual[eixo])}%`}</b>
                      </label>
                    ))}
                  </fieldset>
                ) : null}
              </div>

              {tipoAtual === "numero" ? (
                <label className={s.campo}>
                  <span className={s.campoRot}>Número (só real)</span>
                  <input type="text" value={slideAtual.numero ?? ""} onChange={(e) => mexer({ numero: e.target.value })} />
                </label>
              ) : null}

              <label className={s.campo}>
                <span className={s.campoRot}>{tipoAtual === "conceito" ? "O termo (etiqueta)" : "Etiqueta"}</span>
                <input
                  type="text"
                  value={slideAtual.rotulo ?? ""}
                  placeholder={tipoAtual === "conceito" ? "Hierarquia visual" : "Opcional: passo 2, a regra, a fonte"}
                  onChange={(e) => mexer({ rotulo: e.target.value })}
                />
              </label>
              <label className={s.campo}>
                <span className={s.campoRot}>Título, voz 1 (serifa leve)</span>
                <input type="text" value={slideAtual.manchete} placeholder="Páginas que" onChange={(e) => mexer({ manchete: e.target.value })} />
              </label>
              <label className={s.campo}>
                <span className={s.campoRot}>Título, voz 2 (condensada, caixa alta)</span>
                <input type="text" value={slideAtual.batida ?? ""} placeholder="parecem caras" onChange={(e) => mexer({ batida: e.target.value })} />
              </label>
              <label className={s.campo}>
                <span className={s.campoRot}>Palavra em destaque</span>
                <input type="text" value={slideAtual.destaque ?? ""} placeholder="Uma palavra do título" onChange={(e) => mexer({ destaque: e.target.value })} />
              </label>

              {tipoAtual === "lista" ? (
                <label className={s.campo}>
                  <span className={s.campoRot}>Itens, um por linha (até 6)</span>
                  <textarea
                    rows={6}
                    value={(slideAtual.itens ?? []).join("\n")}
                    onChange={(e) => mexer({ itens: e.target.value.split("\n") })}
                  />
                </label>
              ) : null}

              {tipoAtual === "comparacao" ? (
                <div className={m.lados}>
                  {(
                    [
                      ["ruim", "img", "Assim não"],
                      ["bom", "img2", "Assim sim"],
                    ] as const
                  ).map(([campo, imgCampo, rot]) => (
                    <div key={campo} className={m.ladoCampo}>
                      <span className={s.campoRot}>{rot}</span>
                      <textarea
                        rows={3}
                        value={slideAtual[campo] ?? ""}
                        placeholder="O texto deste lado, ou só a imagem"
                        onChange={(e) => mexer({ [campo]: e.target.value })}
                      />
                      <SoltaImagem
                        caminho={slideAtual[imgCampo]}
                        subindo={subindo}
                        aoSubir={(f) => subirDoSlide(f, imgCampo)}
                        aoTirar={() => mexer({ [imgCampo]: undefined })}
                      />
                    </div>
                  ))}
                </div>
              ) : null}

              {tipoAtual === "tela" ? (
                <div className={s.campo}>
                  <span className={s.campoRot}>O print da página</span>
                  <SoltaImagem
                    caminho={slideAtual.img}
                    subindo={subindo}
                    aoSubir={(f) => subirDoSlide(f, "img")}
                    aoTirar={() => mexer({ img: undefined })}
                    largo
                  />
                </div>
              ) : null}

              {tipoAtual !== "lista" && tipoAtual !== "comparacao" ? (
                <label className={s.campo}>
                  <span className={s.campoRot}>{tipoAtual === "capa" ? "Linha de apoio (com a seta)" : tipoAtual === "citacao" ? "Quem disse, ou a fonte" : "Apoio"}</span>
                  <textarea rows={3} value={slideAtual.apoio ?? ""} onChange={(e) => mexer({ apoio: e.target.value })} />
                </label>
              ) : null}

              <fieldset className={m.ajustes}>
                <legend className={s.campoRot}>Ajustes</legend>
                <label className={m.ajusteLinha}>
                  <span>Tamanho do título</span>
                  <input
                    type="range"
                    min={50}
                    max={160}
                    step={5}
                    value={Math.round((slideAtual.escala ?? 1) * 100)}
                    onChange={(e) => mexer({ escala: Number(e.target.value) / 100 })}
                  />
                  <b>{Math.round((slideAtual.escala ?? 1) * 100)}%</b>
                </label>
                <button type="button" className={s.btnMini} onClick={() => mexer({ escala: undefined, cor: undefined })}>
                  Voltar ao padrão
                </button>
              </fieldset>

              <div className={m.slideAcoes}>
                <button type="button" className={s.btnMini} disabled={atual === 0} onClick={() => mover(-1)}>
                  Subir
                </button>
                <button type="button" className={s.btnMini} disabled={atual === slides.length - 1} onClick={() => mover(1)}>
                  Descer
                </button>
                <button type="button" className={s.btnMini} onClick={duplicar}>
                  Duplicar
                </button>
                <button type="button" className={s.btnMini} onClick={tirar}>
                  Tirar slide
                </button>
              </div>
            </div>
          ) : null}
          {aba === "slide" && !slideAtual ? (
            <div className={m.painelCorpo}>
              <p className={m.ajuda}>Crie o primeiro slide para editar aqui.</p>
            </div>
          ) : null}

          {/* ---------- ABA ESTILO ---------- */}
          {aba === "estilo" ? (
            <div className={m.painelCorpo}>
              <div className={s.campo}>
                <div className={m.rotComAcao}>
                  <span className={s.campoRot}>Imagem 1, a abertura (ChatGPT)</span>
                  <button type="button" className={s.btnMini} disabled={Boolean(aberto)} onClick={() => chamar("diretor-arte")}>
                    {campos.prompt_capa ? "Novo prompt da Dora" : "Pedir à Dora"}
                  </button>
                </div>
                <textarea
                  name="prompt_capa"
                  rows={5}
                  value={campos.prompt_capa}
                  placeholder="O prompt da imagem: a Dora escreve em inglês, com muita cor e personalidade. Você pode escrever o seu."
                  onChange={(e) => setCampos({ ...campos, prompt_capa: e.target.value })}
                  onBlur={() => salvar("prompt_capa")}
                />
                <div className={m.fundoAcoes}>
                  <a
                    className={`${s.btn} ${promptChat ? "" : m.desligado}`}
                    href={promptChat ? `https://chatgpt.com/?q=${encodeURIComponent(promptChat)}` : undefined}
                    target="_blank"
                    rel="noreferrer"
                    aria-disabled={!promptChat}
                  >
                    Abrir no ChatGPT
                  </a>
                  <button type="button" className={s.btnMini} disabled={!promptChat} onClick={() => copiar(promptChat, "Prompt")}>
                    Copiar prompt
                  </button>
                </div>
              </div>

              <SoltaImagem
                url={fundo}
                subindo={subindo}
                aoSubir={subirFundo}
                aoTirar={() => comecar(async () => avisar(await registrarFundo(peca.id, null), "Imagem 1 removida"))}
                texto={alvoColar === 0 ? "Ctrl+V cola aqui, ou arraste, ou clique" : "Arraste ou clique"}
                largo
                ativo={alvoColar === 0}
                aoEscolher={() => setAlvoColar(0)}
              />

              {peca.fundo ? (
                <button type="button" className={s.btn} disabled={Boolean(aberto)} onClick={continuarSerie}>
                  Continuar a série a partir da capa
                </button>
              ) : null}

              {estilo.biblia ? (
                <details className={m.agenteNota} open>
                  <summary>A bíblia da série (igual em todo prompt)</summary>
                  <p>{estilo.biblia}</p>
                </details>
              ) : null}

              <label className={s.campo}>
                <span className={s.campoRot}>Onde a imagem 1 deixa espaço para o título</span>
                <select value={estilo.respiro ?? "base"} onChange={(e) => mudarEstilo({ respiro: e.target.value as Respiro })}>
                  {(Object.keys(RESPIROS) as Respiro[]).map((r) => (
                    <option key={r} value={r}>
                      {RESPIROS[r]}
                    </option>
                  ))}
                </select>
              </label>

              {estilo.paleta?.length ? (
                <div className={s.campo}>
                  <div className={m.rotComAcao}>
                    <span className={s.campoRot}>Cores tiradas da imagem</span>
                    <label className={m.check}>
                      <input
                        type="checkbox"
                        checked={estilo.usarPaleta !== false}
                        onChange={(e) => mudarEstilo({ usarPaleta: e.target.checked })}
                      />
                      <span>usar no carrossel</span>
                    </label>
                  </div>
                  <div className={m.cores}>
                    {estilo.paleta.map((h) => (
                      <i key={h} className={m.corAmostra} style={{ background: h }} title={h} />
                    ))}
                  </div>
                </div>
              ) : null}

              {/* ---------- as outras imagens da série ---------- */}
              {(estilo.extras ?? []).map((x, k) => {
                const dono = x.slide ? slides[x.slide - 1] : undefined;
                const prompt = promptComMolde(
                  x.prompt ?? "",
                  dono ? composicaoDe(dono, papelDe(dono, tipoDoSlide(props(x.slide! - 1))), estilo) : null,
                  story,
                );
                return (
                  <div key={k} className={m.extra}>
                    <div className={m.rotComAcao}>
                      <span className={s.campoRot}>
                        Imagem {k + 2}
                        {x.slide ? `, slide ${x.slide}` : ""}
                        {x.papel && x.papel in PAPEIS ? `, ${PAPEIS[x.papel as PapelImagem].nome.toLowerCase()}` : ""}
                      </span>
                      <button
                        type="button"
                        className={s.btnMini}
                        onClick={() => mudarEstilo({ extras: (estilo.extras ?? []).filter((_, j) => j !== k) })}
                      >
                        Tirar
                      </button>
                    </div>
                    <textarea
                      rows={4}
                      value={x.prompt}
                      placeholder="O prompt desta imagem. A Dora escreve quando a história pede mais de uma."
                      onChange={(e) => mudarExtra(k, { prompt: e.target.value })}
                    />
                    <div className={m.fundoAcoes}>
                      <a
                        className={`${s.btn} ${prompt ? "" : m.desligado}`}
                        href={prompt ? `https://chatgpt.com/?q=${encodeURIComponent(prompt)}` : undefined}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Abrir no ChatGPT
                      </a>
                      <button type="button" className={s.btnMini} disabled={!prompt} onClick={() => copiar(prompt, "Prompt")}>
                        Copiar prompt
                      </button>
                    </div>
                    <SoltaImagem
                      url={urlFundo(x.caminho ?? null)}
                      subindo={subindo}
                      aoSubir={(f) => subirExtra(f, k)}
                      aoTirar={() => mudarExtra(k, { caminho: undefined })}
                      texto={alvoColar === k + 1 ? "Ctrl+V cola aqui, ou arraste, ou clique" : "Clique aqui para colar nesta, ou arraste"}
                      largo
                      ativo={alvoColar === k + 1}
                      aoEscolher={() => setAlvoColar(k + 1)}
                    />
                  </div>
                );
              })}
              <button
                type="button"
                className={s.btnMini}
                onClick={() => {
                  mudarEstilo({ extras: [...(estilo.extras ?? []), { prompt: "" }] });
                  setAlvoColar((estilo.extras?.length ?? 0) + 1);
                }}
              >
                Mais uma imagem na série
              </button>

              <div className={s.campo}>
                <span className={s.campoRot}>Direção</span>
                <div className={m.direcoes} role="radiogroup" aria-label="Direção visual">
                  {(Object.keys(DIRECOES) as Direcao[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      role="radio"
                      aria-checked={estilo.direcao === d}
                      className={`${m.direcaoCartao} ${estilo.direcao === d ? m.direcaoAtiva : ""}`}
                      onClick={() => mudarEstilo({ direcao: d })}
                    >
                      <span className={m.direcaoCores} aria-hidden>
                        {DIRECOES[d].paleta.slice(0, 5).map((c) => (
                          <i key={c.nome} style={{ background: c.bg }} />
                        ))}
                      </span>
                      <b>{DIRECOES[d].nome}</b>
                      <span>{DIRECOES[d].faz}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={s.campo}>
                <span className={s.campoRot}>Tipografia do título</span>
                <div className={m.letras} role="radiogroup" aria-label="Tipografia do título">
                  {(Object.keys(TIPOGRAFIAS) as Tipografia[]).map((k) => {
                    const tg = TIPOGRAFIAS[k];
                    const ativa = (estilo.tipografia ?? "casa") === k;
                    return (
                      <button
                        key={k}
                        type="button"
                        role="radio"
                        aria-checked={ativa}
                        className={`${m.letraCartao} ${ativa ? m.direcaoAtiva : ""}`}
                        onClick={() => mudarEstilo({ tipografia: k === "casa" ? undefined : k })}
                      >
                        <span className={m.letraAmostra} aria-hidden>
                          <i style={{ fontFamily: `var(${tg.serif})` }}>Páginas</i>
                          <b style={{ fontFamily: `var(${tg.display})` }}>QUE VENDEM</b>
                        </span>
                        <b>{tg.nome}</b>
                        <span>{tg.faz}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={s.campo}>
                <span className={s.campoRot}>A foto</span>
                <div className={m.segmento} role="radiogroup" aria-label="Tratamento da foto">
                  {(
                    [
                      ["cor", "Cor original"],
                      ["duotone", "Duotone"],
                    ] as const
                  ).map(([v, rot]) => (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={estilo.foto === v}
                      className={estilo.foto === v ? m.segAtivo : ""}
                      onClick={() => mudarEstilo({ foto: v })}
                    >
                      {rot}
                    </button>
                  ))}
                </div>
              </div>

              <label className={s.campo}>
                <span className={s.campoRot}>Categoria</span>
                <select
                  value={peca.categoria ?? ""}
                  onChange={(e) =>
                    comecar(async () => avisar(await salvarCategoria(peca.id, (e.target.value || null) as Categoria | null), "Categoria salva"))
                  }
                >
                  <option value="">Sem categoria</option>
                  {(Object.keys(CATEGORIAS) as Categoria[]).map((c) => (
                    <option key={c} value={c}>
                      {CATEGORIAS[c].nome}: {CATEGORIAS[c].faz}
                    </option>
                  ))}
                </select>
              </label>

              <div className={s.dupla}>
                <label className={s.campo}>
                  <span className={s.campoRot}>Pilar</span>
                  <select
                    value={peca.pilar ?? ""}
                    onChange={(e) => comecar(async () => avisar(await salvarPilar(peca.id, (e.target.value || null) as Pilar | null), "Pilar salvo"))}
                  >
                    <option value="">Sem pilar</option>
                    {(Object.keys(PILARES) as Pilar[]).map((p) => (
                      <option key={p} value={p}>
                        {PILARES[p].nome}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={s.campo}>
                  <span className={s.campoRot}>Formato</span>
                  <select
                    value={peca.tipo}
                    onChange={(e) => comecar(async () => avisar(await salvarFormato(peca.id, e.target.value as TipoPeca, peca.codigo), "Salvo"))}
                  >
                    {(Object.keys(TIPOS) as TipoPeca[]).map((t) => (
                      <option key={t} value={t}>
                        {TIPOS[t].nome}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className={s.campo}>
                <span className={s.campoRot}>Tipo de post (tabela mestra, opcional)</span>
                <select
                  value={peca.codigo ?? ""}
                  onChange={(e) =>
                    comecar(async () => avisar(await salvarFormato(peca.id, peca.tipo, (e.target.value || null) as Codigo | null), "Salvo"))
                  }
                >
                  <option value="">Nenhum</option>
                  {(Object.keys(CODIGOS) as Codigo[]).map((c) => (
                    <option key={c} value={c}>
                      {c} {CODIGOS[c].nome}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          {/* ---------- ABA TEXTO E TIME ---------- */}
          {aba === "texto" ? (
            <div className={m.painelCorpo}>
              <label className={s.campo}>
                <span className={s.campoRot}>Briefing</span>
                <textarea
                  name="briefing"
                  rows={4}
                  value={campos.briefing}
                  placeholder="O tema, o ângulo e o que a pessoa leva deste post. Uma frase já serve."
                  onChange={(e) => setCampos({ ...campos, briefing: e.target.value })}
                  onBlur={() => salvar("briefing")}
                />
              </label>

              <div className={m.time}>
                <div className={m.timeCab}>
                  <h2>O time</h2>
                  <button type="button" className={s.btn} disabled={Boolean(aberto)} onClick={() => chamar("tudo")}>
                    Produzir tudo
                  </button>
                </div>
                {!vivo ? (
                  <p className={m.timeDorme}>
                    O time está desligado. Os pedidos esperam até ele ligar. <LigarTime />
                  </p>
                ) : null}
                {aberto ? (
                  <p className={m.timeRodando}>
                    {nomePedido(aberto)}
                    {aberto.status === "na_fila" ? ", na fila" : ""}
                  </p>
                ) : null}
                {!aberto && ultimo?.status === "erro" ? (
                  <p className={m.timeErro}>
                    O último pedido falhou ({quando(ultimo.terminado_em)}): {ultimo.erro}
                  </p>
                ) : null}
                <p className={m.timeNota}>Os agentes escrevem em cima do que já está na peça. O design continua seu.</p>
                <ol className={m.agentes}>
                  {ORDEM_AGENTES.map((a) => {
                    const rodando = aberto && (aberto.agente === a || (aberto.agente === "tudo" && aberto.etapa === a));
                    return (
                      <li key={a} className={rodando ? m.agenteRodando : ""}>
                        <div className={m.agenteLinha}>
                          <b>{AGENTES[a].nome}</b>
                          <span>{AGENTES[a].faz}</span>
                          <button type="button" className={s.btnMini} disabled={Boolean(aberto)} onClick={() => chamar(a)}>
                            {peca.notas[a] ? "Refazer" : "Pedir"}
                          </button>
                        </div>
                        {peca.notas[a] ? (
                          <details className={m.agenteNota}>
                            <summary>
                              O que {a === "copywriter" ? "o" : "a"} {AGENTES[a].nome} disse
                            </summary>
                            <p>{peca.notas[a]}</p>
                          </details>
                        ) : null}
                        {a === "estrategista" && peca.opcoes_gancho.length ? (
                          <div className={m.ganchos} role="radiogroup" aria-label="Opções de gancho">
                            {peca.opcoes_gancho.map((g) => (
                              <button
                                key={g}
                                type="button"
                                role="radio"
                                aria-checked={campos.gancho === g}
                                className={`${m.gancho} ${campos.gancho === g ? m.ganchoAtivo : ""}`}
                                onClick={() => {
                                  setCampos({ ...campos, gancho: g });
                                  comecar(async () => avisar(await salvarCampo(peca.id, "gancho", g), "Gancho escolhido"));
                                }}
                              >
                                {g}
                              </button>
                            ))}
                          </div>
                        ) : null}
                        {a === "revisor" && peca.veredito ? (
                          <div className={`${m.veredito} ${m[`ver${peca.veredito.status}`] ?? ""}`}>
                            <b>
                              {peca.veredito.status === "APPROVE"
                                ? "Aprovada"
                                : peca.veredito.status === "CONDITIONAL"
                                  ? "Aprovada com ressalva"
                                  : "Reprovada"}
                              {typeof peca.veredito.media_ponderada === "number" ? `, nota ${peca.veredito.media_ponderada.toFixed(1)}` : ""}
                            </b>
                            {[...(peca.veredito.bloqueadores ?? []), ...(peca.veredito.correcoes_prioritarias ?? [])].length ? (
                              <ul>
                                {[...(peca.veredito.bloqueadores ?? []), ...(peca.veredito.correcoes_prioritarias ?? [])].map((x) => (
                                  <li key={x}>{x}</li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
              </div>

              <label className={s.campo}>
                <span className={s.campoRot}>Gancho</span>
                <input
                  type="text"
                  name="gancho"
                  value={campos.gancho}
                  onChange={(e) => setCampos({ ...campos, gancho: e.target.value })}
                  onBlur={() => salvar("gancho")}
                />
              </label>
              <label className={s.campo}>
                <span className={s.campoRot}>CTA do fecho</span>
                <input
                  type="text"
                  name="cta"
                  value={campos.cta}
                  placeholder="Em post de valor: salve para consultar depois"
                  onChange={(e) => setCampos({ ...campos, cta: e.target.value })}
                  onBlur={() => salvar("cta")}
                />
              </label>
              <div className={s.campo}>
                <div className={m.rotComAcao}>
                  <span className={s.campoRot}>Legenda</span>
                  <button type="button" className={s.btnMini} onClick={() => copiar(legenda, "Legenda")} disabled={!legenda}>
                    Copiar legenda
                  </button>
                </div>
                <textarea
                  name="legenda"
                  rows={9}
                  value={campos.legenda}
                  placeholder="O Caetano escreve. Vazia, a legenda copiada é o gancho, o CTA e as hashtags."
                  onChange={(e) => setCampos({ ...campos, legenda: e.target.value })}
                  onBlur={() => salvar("legenda")}
                />
              </div>
              {peca.tipo === "carrossel" || peca.tipo === "post_feed" ? (
                <label className={s.campo}>
                  <span className={s.campoRot}>Hashtags</span>
                  <input
                    type="text"
                    name="hashtags"
                    value={campos.hashtags}
                    onChange={(e) => setCampos({ ...campos, hashtags: e.target.value })}
                    onBlur={() => salvar("hashtags")}
                  />
                </label>
              ) : null}
              <form
                className={m.apagar}
                action={() => {
                  if (window.confirm("Apagar esta peça? O fundo e as imagens saem junto.")) comecar(async () => void (await apagarPeca(peca.id)));
                }}
              >
                <button type="submit" className={s.btnMini}>
                  Apagar peça
                </button>
              </form>
            </div>
          ) : null}
        </aside>
      </div>

      {/* As pranchas em tamanho real, fora da tela: é daqui que o PNG sai. */}
      <div className={m.foraDaTela} aria-hidden>
        {slides.map((_, i) => (
          <SlidePost
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            {...props(i)}
          />
        ))}
      </div>
    </div>
  );
}

/* Um lugar para soltar uma imagem: clicar, arrastar ou (na página) colar. */
function SoltaImagem({
  caminho,
  url,
  subindo,
  aoSubir,
  aoTirar,
  texto = "Cole com Ctrl+V, arraste ou clique",
  largo = false,
  ativo = false,
  aoEscolher,
}: {
  caminho?: string;
  url?: string | null;
  subindo: boolean;
  aoSubir: (f: File) => void;
  aoTirar: () => void;
  texto?: string;
  largo?: boolean;
  ativo?: boolean;
  aoEscolher?: () => void;
}) {
  const src = url ?? urlFundo(caminho ?? null);
  return (
    <div className={m.soltaBloco}>
      <label
        className={`${m.soltar} ${largo ? m.soltarLargo : ""} ${src ? m.soltarCheio : ""} ${subindo ? m.ocupado : ""} ${ativo ? m.soltarAtivo : ""}`}
        onMouseDown={aoEscolher}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f) aoSubir(f);
        }}
        style={src ? { backgroundImage: `url(${src})` } : undefined}
      >
        <input
          type="file"
          accept="image/*"
          className={m.escondido}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) aoSubir(f);
            e.target.value = "";
          }}
        />
        <span>{subindo ? "Subindo" : src ? "Trocar imagem" : texto}</span>
      </label>
      {src ? (
        <button type="button" className={s.btnMini} onClick={aoTirar}>
          Tirar imagem
        </button>
      ) : null}
    </div>
  );
}

/* ============================================================
   A ALÇA DO TEXTO LIVRE, NO PALCO
   Um contorno tracejado por cima do texto solto: arrastar move, a borda
   direita muda a largura. Posição e largura em % da prancha, para valer
   igual no PNG de 1080 e no palco reduzido.
   ============================================================ */
export function AlcaTexto({
  texto,
  largura,
  altura,
  aoMudar,
}: {
  texto: NonNullable<Slide["texto"]>;
  largura: number;
  altura: number;
  aoMudar: (t: NonNullable<Slide["texto"]>) => void;
}) {
  const arrastar = (modo: "mover" | "largura") => (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const alvo = e.currentTarget;
    alvo.setPointerCapture(e.pointerId);
    const inicio = { x: e.clientX, y: e.clientY, texto };
    const mover = (ev: PointerEvent) => {
      const dx = ((ev.clientX - inicio.x) / largura) * 100;
      const dy = ((ev.clientY - inicio.y) / altura) * 100;
      if (modo === "mover") {
        aoMudar({
          ...inicio.texto,
          /* o bloco não sai pela lateral: sem isso a alça de largura ficava
             fora do slide e não dava mais para puxar */
          x: Math.round(Math.max(0, Math.min(100 - inicio.texto.w, inicio.texto.x + dx)) * 10) / 10,
          y: Math.round(Math.max(-10, Math.min(95, inicio.texto.y + dy)) * 10) / 10,
        });
      } else {
        aoMudar({ ...inicio.texto, w: Math.round(Math.max(15, Math.min(100 - inicio.texto.x, inicio.texto.w + dx)) * 10) / 10 });
      }
    };
    const soltar = () => {
      alvo.removeEventListener("pointermove", mover);
      alvo.removeEventListener("pointerup", soltar);
      alvo.removeEventListener("pointercancel", soltar);
    };
    alvo.addEventListener("pointermove", mover);
    alvo.addEventListener("pointerup", soltar);
    alvo.addEventListener("pointercancel", soltar);
  };
  return (
    <div
      className={m.alca}
      style={{ left: `${texto.x}%`, top: `${texto.y}%`, width: `${Math.min(texto.w, 100 - texto.x)}%` }}
      onPointerDown={arrastar("mover")}
      title="Arraste para mover o texto"
    >
      <span className={m.alcaRot}>arraste o texto</span>
      <div className={m.alcaBorda} onPointerDown={arrastar("largura")} title="Puxe para mudar a largura" />
    </div>
  );
}
