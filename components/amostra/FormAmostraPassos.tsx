"use client";

/* ============================================================
   A /amostra: o formulário em passos (09/11/2026, pedido do Rafael)

   A referência é o funil da Arcus (anúncio, "Saiba mais", uma pergunta
   por tela, o contato só no fim). O que ela ensina: quem já respondeu
   cinco perguntas não larga na última, e o lead chega qualificado. O que
   NÃO veio de lá: a reunião (aqui o fim é a amostra em 24h) e o e-mail
   (aqui o contato é o WhatsApp).

   ---------- o degrau (decisão de 09/11, delegada pelo Rafael) ----------
   LOJA ONLINE quando a loja vende R$ 10 mil ou mais por mês E já vende fora
   do balcão (Instagram, WhatsApp ou marketplace): nesse faturamento os
   R$ 249,90 por mês são no máximo 2,5% do que ela vende, e quem já vende
   online é quem usa o pagamento no site. VITRINE no resto: quem vende menos,
   quem ainda não vende e quem vende só na loja física. O degrau vai no
   `plano` e decide o tipo do card no CRM (pages/api/lead.js, tipoDoLead).
   A tela NÃO mostra preço: o preço chega com a amostra, na conversa.

   ---------- as respostas ----------
   Vão nas colunas que a rota já grava, sem migração: `vende` (o que vende),
   `site` (a situação), `investimento` (o faturamento) e `necessidade` (o
   resumo inteiro, que vira nota no card). O @ é conferido na Meta como na
   vitrine; se a Meta não acha, a pessoa volta ao passo do @.

   Cada passo vira "FormPasso" na Mixpanel, para ver onde o formulário perde
   gente. As respostas ficam no aparelho (localStorage, com try/catch: no
   navegador do Instagram ele pode falhar, e aí só não lembra).
   ============================================================ */

import { CSSProperties, FormEvent, useEffect, useRef, useState } from "react";
import f from "./amostra.module.css";
import { CampoIsca, useGuardaDeFormulario } from "@/components/form-guarda";
import { mascararWhatsapp, whatsappValido } from "@/components/telefone";
import { diagnosticoDoArroba, enviarLeadVitrine, registrarSuspeito } from "@/components/vitrine/lead-flow";
import type { LojaEncontrada } from "@/components/lead";
import { initTracking, mpTrack } from "@/components/vitrine/tracking";
import { linkWhatsApp } from "@/lib/contato";
import { OFERTA } from "@/lib/oferta";

const PAGINA = "amostra";
const CHAVE = "rr-amostra-v1";

type Opcao = [valor: string, texto: string];
type Passo =
  | { k: "situacao" | "vende" | "canais" | "faturamento" | "socios"; rotulo: string; q: string; ops: Opcao[] }
  | { k: "instagram"; rotulo: string; q: string; ajuda: string }
  | { k: "contato"; rotulo: string; q: string; ajuda: string };

const PASSOS: Passo[] = [
  { k: "situacao", rotulo: "Sua loja", q: "Como está a sua loja hoje?", ops: [
    ["sem-site", "Vendo pelo Instagram e ainda não tenho site"],
    ["com-site", "Já tenho site e quero trocar"],
    ["comecando", "Ainda vou começar a vender"],
  ] },
  { k: "instagram", rotulo: "Sua loja", q: "Qual é o @ da loja no Instagram?", ajuda: "É de lá que eu tiro as fotos para montar a sua amostra." },
  { k: "vende", rotulo: "Sua loja", q: "O que a sua loja vende?", ops: [
    ["roupa", "Roupa"],
    ["calcados", "Tênis e calçados"],
    ["eletronicos", "Celular e eletrônicos"],
    ["acessorios", "Acessórios e joias"],
    ["outro", "Outra coisa"],
  ] },
  { k: "canais", rotulo: "Onde você vende", q: "Onde a loja vende hoje?", ops: [
    ["fisica", "Só na loja física"],
    ["fisica-insta", "Na loja física e no Instagram"],
    ["insta", "Só no Instagram e no WhatsApp"],
    ["marketplace", "Em marketplace, como Shopee ou Mercado Livre"],
  ] },
  { k: "faturamento", rotulo: "Faturamento", q: "Quanto a loja vende por mês, em média?", ops: [
    ["0", "Ainda não vende"],
    ["ate5", "Até R$ 5 mil"],
    ["5a10", "De R$ 5 mil a R$ 10 mil"],
    ["10a25", "De R$ 10 mil a R$ 25 mil"],
    ["25a50", "De R$ 25 mil a R$ 50 mil"],
    ["50mais", "Acima de R$ 50 mil"],
  ] },
  { k: "socios", rotulo: "Quem decide", q: "Quem decide as coisas da loja?", ops: [
    ["dono", "Só eu, sou o dono"],
    ["socio", "Eu e meu sócio"],
    ["equipe", "Trabalho na loja, o dono decide"],
  ] },
  { k: "contato", rotulo: "Sua amostra", q: "Pronto. Para onde eu mando a sua amostra?", ajuda: "Em até 24h ela chega no seu WhatsApp, montada com as suas peças." },
];

type Respostas = Partial<Record<"situacao" | "instagram" | "vende" | "canais" | "faturamento" | "socios" | "nome" | "whatsapp", string>>;

const texto = (k: keyof Respostas, v?: string) => {
  const p = PASSOS.find(x => x.k === k);
  return p && "ops" in p ? p.ops.find(o => o[0] === v)?.[1] ?? "" : v ?? "";
};

/* o degrau, pela regra do topo do arquivo */
export function degrauDe(r: Respostas): "Loja online" | "Vitrine" {
  const faturaBem = r.faturamento === "10a25" || r.faturamento === "25a50" || r.faturamento === "50mais";
  const vendeOnline = !!r.canais && r.canais !== "fisica";
  return faturaBem && vendeOnline ? "Loja online" : "Vitrine";
}

function ler(): { passo: number; r: Respostas } {
  try { const j = JSON.parse(localStorage.getItem(CHAVE) || "null"); if (j && typeof j.passo === "number") return j; } catch {}
  return { passo: 0, r: {} };
}
function gravar(passo: number, r: Respostas) {
  try { localStorage.setItem(CHAVE, JSON.stringify({ passo, r })); } catch {}
}

const Seta = ({ esquerda = false }: { esquerda?: boolean }) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={esquerda ? "M19 12H5M11 6l-6 6 6 6" : "M5 12h14M13 6l6 6-6 6"} /></svg>;
const Check = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12.5 10 17.5 19 7" /></svg>;

export function FormAmostraPassos() {
  const [passo, setPasso] = useState(0);
  const [r, setR] = useState<Respostas>({});
  const [salva, setSalva] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [fim, setFim] = useState<{ loja: LojaEncontrada | null; linkWa: string; degrau: string } | null>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  const envioSuspeito = useGuardaDeFormulario();

  /* volta onde parou: a pessoa que fecha o navegador do Instagram e reabre o anúncio */
  useEffect(() => {
    initTracking({ page: PAGINA, valor: OFERTA.pt.vitrine.total, currency: "BRL", lang: "pt" });
    const s = ler();
    if (s.passo > 0 || Object.keys(s.r).length) { setPasso(Math.min(s.passo, PASSOS.length - 1)); setR(s.r); }
  }, []);

  /* cada passo mostrado vira um evento, e o foco vai para a pergunta (leitor de tela) */
  useEffect(() => {
    mpTrack("FormPasso", { passo: passo + 1, chave: PASSOS[passo].k });
    titulo.current?.focus({ preventScroll: true });
    scrollTo({ top: 0 });
  }, [passo]);

  const ir = (n: number, novas = r) => { setErro(""); setPasso(n); gravar(n, novas); };
  const responder = (k: keyof Respostas, v: string) => {
    const novas = { ...r, [k]: v };
    setR(novas); setSalva(true);
    /* avança sozinho, com um respiro para a escolha aparecer marcada */
    setTimeout(() => ir(passo + 1, novas), 220);
  };

  function seguirArroba(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = String(new FormData(e.currentTarget).get("instagram") || "").trim();
    const diag = diagnosticoDoArroba(v);
    if (!v.replace(/^@+/, "")) { setErro("Escreve o @ da loja para eu achar as fotos."); return; }
    if (diag === "telefone") { setErro("Isso é um telefone. Aqui eu preciso do @ da loja no Instagram, o nome logo abaixo da foto do perfil."); return; }
    if (diag === "email") { setErro("Isso é um e-mail. Aqui eu preciso do @ da loja no Instagram, o nome logo abaixo da foto do perfil."); return; }
    const novas = { ...r, instagram: v };
    setR(novas); setSalva(true); ir(passo + 1, novas);
  }

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (enviando) return;
    const fd = new FormData(e.currentTarget);
    const nome = String(fd.get("nome") || "").trim();
    const whatsapp = String(fd.get("whatsapp") || "");
    const instagram = r.instagram || "";
    const degrau = degrauDe(r);
    const resumo = [
      `Situação: ${texto("situacao", r.situacao)}`,
      `Vende: ${texto("vende", r.vende)}`,
      `Onde vende: ${texto("canais", r.canais)}`,
      `Faturamento: ${texto("faturamento", r.faturamento)}`,
      `Quem decide: ${texto("socios", r.socios)}`,
      `Degrau sugerido: ${degrau}`,
    ].join(". ");
    const suspeito = envioSuspeito(e.currentTarget);
    if (suspeito) {
      registrarSuspeito({ nome, whatsapp, instagram, motivo: suspeito, lang: "pt", pagina: PAGINA, plano: degrau });
      setFim({ loja: null, linkWa: "", degrau });
      return;
    }
    if (!whatsappValido(whatsapp)) { setErro("Confere o número: é por ele que eu te mando a amostra. Ex.: (44) 99999-0000."); return; }
    setEnviando(true);
    const res = await enviarLeadVitrine({
      nome, whatsapp, instagram, plano: degrau, ctaPosition: "hero_form", lang: "pt", pagina: PAGINA,
      abertura: `Oi Rafael! Respondi o formulário e quero ver a amostra da minha ${degrau === "Loja online" ? "loja online" : "vitrine"}.`,
      extra: { vende: texto("vende", r.vende), site: texto("situacao", r.situacao), investimento: texto("faturamento", r.faturamento), necessidade: resumo },
    });
    setEnviando(false);
    /* a Meta não achou o @: de volta ao passo dele, com o motivo */
    if (res.arrobaInvalido) {
      const i = PASSOS.findIndex(p => p.k === "instagram");
      ir(i);
      setErro(`Não achei ${instagram.startsWith("@") ? instagram : "@" + instagram} no Instagram. Confere o @: precisa ser a conta profissional da loja, é dela que eu tiro as fotos.`);
      return;
    }
    if (res.salvo) {
      try { localStorage.removeItem(CHAVE); } catch {}
      setFim({ loja: res.loja, linkWa: res.linkWa, degrau });
    }
  }

  const p = PASSOS[passo];
  const progresso = fim ? 1 : (passo + 1) / PASSOS.length;

  return <div className={f.palco}>
    <header className={f.topo}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/marca/rr-monograma.webp" width={55} height={30} alt="" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/marca/rr-nome.webp" width={150} height={25} alt="Rafael Razeira Estúdio" />
    </header>

    <div className={f.trilho} aria-hidden><span style={{ "--p": progresso } as CSSProperties} /></div>
    <p className={f.rotulo}>{fim ? "Pedido recebido" : `${p.rotulo} · ${passo + 1} de ${PASSOS.length}`}</p>

    <main className={f.cartao}>
      {fim ? <div role="status" className={f.ok}>
        <span className={f.okIcone}><Check /></span>
        <h1 className={f.pergunta}>Recebi. A sua amostra está a caminho.</h1>
        <p className={f.ajuda}>Em até 24h eu te mando no WhatsApp a amostra da sua {fim.degrau === "Loja online" ? "loja online" : "vitrine"}, montada com as suas peças.</p>
        {fim.loja && <p className={f.micro}>Encontrei <b>@{fim.loja.arroba}</b> no Instagram{fim.loja.seguidores ? `, com ${fim.loja.seguidores.toLocaleString("pt-BR")} seguidores` : ""}. Se não for a sua loja, me avisa.</p>}
        {fim.linkWa && <a className={f.botao} href={fim.linkWa} data-cta="reabrir_whats" data-cta-dest="whatsapp">Me chama no WhatsApp agora <Seta /></a>}
      </div>

      : "ops" in p ? <>
        <h1 ref={titulo} tabIndex={-1} className={f.pergunta}>{p.q}</h1>
        <div className={f.opcoes} role="radiogroup" aria-label={p.q}>
          {p.ops.map(([v, t]) => <button key={v} type="button" role="radio" aria-checked={r[p.k] === v}
            className={`${f.opcao} ${r[p.k] === v ? f.marcada : ""}`} onClick={() => responder(p.k, v)}>
            <span className={f.bolinha} aria-hidden />{t}
          </button>)}
        </div>
      </>

      : p.k === "instagram" ? <form onSubmit={seguirArroba} noValidate>
        <h1 ref={titulo} tabIndex={-1} className={f.pergunta}>{p.q}</h1>
        <p className={f.ajuda}>{p.ajuda}</p>
        <label className={f.campo}>
          <span className={f.soLeitor}>O @ da loja</span>
          <input name="instagram" type="text" defaultValue={r.instagram || ""} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="@sualoja" aria-invalid={!!erro || undefined} onInput={() => erro && setErro("")} />
        </label>
        {erro && <small className={f.erro} role="alert">{erro}</small>}
        <button type="submit" className={f.botao}>Continuar <Seta /></button>
      </form>

      : <form onSubmit={enviar} noValidate>
        <h1 ref={titulo} tabIndex={-1} className={f.pergunta}>{p.q}</h1>
        <p className={f.ajuda}>{p.ajuda}</p>
        <label className={f.campo}>
          <span>Seu nome</span>
          <input name="nome" type="text" autoComplete="given-name" defaultValue={r.nome || ""} placeholder="Como posso te chamar" />
        </label>
        <label className={f.campo}>
          <span>Seu WhatsApp</span>
          <input name="whatsapp" type="tel" autoComplete="tel" required maxLength={16} placeholder="(44) 99999-0000" aria-invalid={!!erro || undefined}
            onInput={e => { e.currentTarget.value = mascararWhatsapp(e.currentTarget.value); if (erro) setErro(""); }} />
        </label>
        <CampoIsca />
        {erro && <small className={f.erro} role="alert">{erro}</small>}
        <button type="submit" className={f.botao} disabled={enviando}>{enviando ? "Enviando..." : <>Quero ver a minha amostra <Seta /></>}</button>
        <p className={f.micro}>A amostra é por minha conta e não obriga a nada.</p>
      </form>}

      {!fim && <div className={f.rodapeCartao}>
        {passo > 0 ? <button type="button" className={f.voltar} onClick={() => ir(passo - 1)}><Seta esquerda /> Voltar</button> : <span />}
        {salva && <span className={f.salva}>Resposta salva</span>}
      </div>}
    </main>

    <p className={f.duvida}>Ficou com dúvida? <a href={linkWhatsApp("Oi Rafael! Vim pelo formulário da amostra e tenho uma dúvida.")} target="_blank" rel="noopener" data-cta="amostra_duvida" data-cta-dest="whatsapp">Me chama no WhatsApp</a></p>
  </div>;
}
