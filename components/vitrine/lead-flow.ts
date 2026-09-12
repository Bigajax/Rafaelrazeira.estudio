/* ============================================================
   O ENVIO DE LEAD DA VITRINE — um caminho só para os dois formulários.

   Desde 07/08 a página tem dois pontos de captura: o formulário completo da
   oferta (#contratar) e o mini-formulário do hero (#hero-form). As regras do
   envio são as mesmas e moram aqui para não existirem duas cópias que
   divergem caladas: Lead disparado ANTES de qualquer navegação com
   `abriuWhats: false`, gravação no banco antes de qualquer WhatsApp, e o
   WhatsApp abrindo só como fallback quando a gravação falha, que é quando
   "Abriu o WhatsApp" vira verdade.

   Quem chama fica dono só do estado de tela (enviando/enviado/pendente). O
   contrato de components/lead.ts e da rota /api/lead não muda: o hero manda
   `plano` ausente e a rota o aceita como nulo.

   ---------- os dois idiomas (11/09/2026) ----------
   A /en/vitrine-digital passa por aqui com `lang: "en"`, e três coisas
   mudam: o `pagina` ganha o sufixo "-en" (é o que diz à rota que o contato
   obrigatório é o e-mail e que a nota do CRM é "responder por e-mail"), o
   link de contato é um mailto: pré-preenchido em vez do wa.me, e o
   fallback NÃO navega: sem WhatsApp para abrir, a tela mostra o bloco
   "One more step" com o mailto, e a pessoa escreve. O Lead sai do mesmo
   jeito nos dois caminhos.
   ============================================================ */

import type { MotivoSuspeito } from "@/components/form-guarda";
import { salvarLead, salvarLeadDetalhado, type LojaEncontrada } from "@/components/lead";
import { contextoDaSessao, irParaWhatsapp, mpTrack, refDaVisita, trackLead } from "@/components/vitrine/tracking";
import { linkEmail, linkWhatsApp } from "@/lib/contato";
import type { Lang } from "@/lib/idiomas";

/* o vocabulário da mensagem/assunto, por idioma; é o mesmo objeto
   `contato` do dicionário da página, repetido aqui porque este módulo não
   tem acesso ao provider e as duas cópias precisam dizer o mesmo */
const TEXTO: Record<Lang, { abertura: string; nome: string; loja: string; plano: string; ref: string }> = {
  pt: { abertura: "Oi Rafael! Quero uma vitrine para minha loja.", nome: "Nome", loja: "Loja", plano: "Plano", ref: "Ref" },
  en: { abertura: "Digital storefront preview for my store", nome: "Name", loja: "Store", plano: "Plan", ref: "Ref" },
};

export const paginaDaVitrine = (lang: Lang) => (lang === "en" ? "vitrine-digital-en" : "vitrine-digital");

/* ---------- o que a pessoa digitou no campo do @ (12/09/2026) ----------
   Nos 14 dias antes desta função, três pessoas ficaram presas num loop de
   até doze envios: telefone, e-mail e o @ pessoal no campo do @, cada
   tentativa recusada pela Meta e gravada como suspeita. Telefone e
   e-mail não precisam de rede para serem reconhecidos, e a mensagem
   certa ("isso é um telefone, eu preciso do @") sai antes de qualquer
   envio. O que parece site (loja.com.br) passa: o formulário da oferta
   aceita site, e a rota já trata isso como "desconhecido". */
export type DiagnosticoArroba = "telefone" | "email";
export function diagnosticoDoArroba(v: string): DiagnosticoArroba | null {
  const s = String(v || "").trim().replace(/^@+/, "");
  if (!s) return null;
  const digitos = s.replace(/\D/g, "");
  if (digitos.length >= 8 && digitos.length / s.length > 0.7) return "telefone";
  /* o @ do e-mail some na limpeza do campo do hero ("souzafaima23gmail.com"),
     então o provedor conta tanto quanto o arroba */
  if (/@[^\s@]+\.[a-z]{2,}$/i.test(s) || /(gmail|hotmail|outlook|yahoo|icloud|live|uol|bol|terra)\.com/i.test(s)) return "email";
  return null;
}

/* ---------- o link de contato, por idioma ----------
   pt: o wa.me com a mensagem pronta. A primeira linha é a mesma dos CTAs da
   página: a conversa começa do mesmo jeito, venha de onde vier. O telefone
   não entra na mensagem de propósito (ela sai do WhatsApp da própria
   pessoa) e o código da visita fecha a última linha, para a venda
   registrada depois amarrar na visita.
   en: o mailto: com o mesmo conteúdo, assunto na primeira linha e o resto
   no corpo. */
export function linkContato(lang: Lang, d: { nome?: string; instagram?: string; plano?: string }): string {
  const t = TEXTO[lang];
  const ref = refDaVisita();
  const linhas = [
    d.nome ? `${t.nome}: ${d.nome}` : "",
    d.instagram ? `${t.loja}: ${d.instagram}` : "",
    d.plano ? `${t.plano}: ${d.plano}` : "",
    ref ? `${t.ref}: ${ref}` : "",
  ].filter(Boolean);
  return lang === "en"
    ? linkEmail(t.abertura, linhas.join("\n"))
    : linkWhatsApp([t.abertura, ...linhas].join("\n"));
}

export async function enviarLeadVitrine(d: {
  nome: string;
  whatsapp: string;
  email?: string;
  instagram?: string;
  plano?: string;
  ctaPosition: "form" | "hero_form";
  lang: Lang;
}): Promise<{ salvo: boolean; linkWa: string; arrobaInvalido: boolean; loja: LojaEncontrada | null }> {
  /* ---------- o Lead saiu de antes para DEPOIS da gravação (10/09) ----------
     Ele era disparado aqui em cima, antes de qualquer coisa, e o motivo era
     bom: não perder o evento numa navegação. Mas a navegação só acontece no
     fallback, e o preço de disparar cedo apareceu na primeira semana da
     campanha "prévia grátis": 12 de 14 leads tinham @ que não existia, e
     cada um deles já tinha virado Contact antes de a rota olhar o @. A
     campanha otimiza por Contact. Uma semana ensinando a Meta a trazer
     quem não tem loja.

     Agora a rota confere o @ primeiro (lib/arroba.ts) e o Lead só sai
     quando ela diz que a loja existe. No fallback (gravação falhou, a
     pessoa vai para o WhatsApp) ele sai como antes, ANTES de navegar, que
     é onde a regra antiga continua valendo. */
  const linkWa = linkContato(d.lang, d);

  const resposta = await salvarLeadDetalhado({
    pagina: paginaDaVitrine(d.lang),
    lang: d.lang,
    nome: d.nome,
    whatsapp: d.whatsapp,
    ...(d.email ? { email: d.email } : {}),
    canal: d.instagram || "",
    ...(d.plano ? { plano: d.plano } : {}),
    ...contextoDaSessao(),
  });

  if (resposta.ok) {
    /* O @ não existe: a linha foi gravada como suspeita, e a tela devolve o
       campo à pessoa. Nada é medido, porque não há lead para medir ainda; o
       envio corrigido volta aqui e aí conta. */
    if (resposta.arroba === "invalido") {
      mpTrack("ArrobaInvalido", { cta_position: d.ctaPosition, arroba: d.instagram || "" });
      return { salvo: false, linkWa, arrobaInvalido: true, loja: null };
    }
    /* `ctaPosition` não é rótulo qualquer: "form" e "hero_form" são os
       valores que o tracking reconhece como contratação (POSICOES_FORMULARIO),
       os únicos que chegam como Lead na Mixpanel. O repetido não passa por
       aqui: a mesma pessoa preenchendo o segundo formulário da página já
       contou no primeiro. */
    if (!resposta.repetido) {
      trackLead({ ctaPosition: d.ctaPosition, plano: d.plano, nome: d.nome, whatsapp: d.whatsapp, email: d.email, abriuWhats: false });
    }
    mpTrack("LeadSalvo", { cta_position: d.ctaPosition, plano: d.plano, repetido: !!resposta.repetido });
    return { salvo: true, linkWa, arrobaInvalido: false, loja: resposta.loja ?? null };
  }

  /* Fallback: o comportamento inteiro de antes da inversão de 06/08. O Lead
     sai aqui, antes de navegar, e com o @ sem conferir: rota fora do ar não
     pode custar o contato, e a pessoa se verifica sozinha ao mandar a
     mensagem. location.href na mesma aba, 300ms depois do Lead sair, porque
     window.open o navegador do Instagram bloqueia ou abre em aba fantasma.
     No en não há para onde navegar: quem chama mostra o mailto na tela. */
  trackLead({ ctaPosition: d.ctaPosition, plano: d.plano, nome: d.nome, whatsapp: d.whatsapp, email: d.email, abriuWhats: false });
  if (d.lang === "en") {
    mpTrack("LeadNaoSalvo", { cta_position: d.ctaPosition, plano: d.plano, origem: "fallback-email" });
    return { salvo: false, linkWa, arrobaInvalido: false, loja: null };
  }
  mpTrack("AbriuWhatsApp", { cta_position: d.ctaPosition, plano: d.plano, origem: "fallback" });
  irParaWhatsapp(linkWa);
  return { salvo: false, linkWa, arrobaInvalido: false, loja: null };
}

/* ---------- o envio que a guarda acusou (01/09/2026) ----------
   Até aqui, acusar era descartar, e um falso positivo custava o cliente
   inteiro em silêncio: a pessoa via "RECEBI SEUS DADOS" e não sobrava
   registro em lugar nenhum. Agora ele é gravado, e só gravado.

   O que este caminho NÃO faz, e cada "não" tem dono:
   • não dispara Lead, Contact nem nada na Mixpanel, porque um envio que
     pode ser robô não pode ensinar a campanha a procurar mais robôs;
   • não vira card no CRM nem e-mail, porque a fila do dia é feita para ser
     trabalhada uma por uma e não aguenta ser envenenada;
   • não abre o WhatsApp em falha, porque quem chama isto já vai mostrar a
     confirmação de qualquer jeito, e a promessa da tela é a mesma para a
     pessoa e para o robô.

   Quem decide o que é suspeito continua sendo form-guarda.tsx. Aqui só se
   registra, com o motivo junto, e sem esperar: a tela não pode ficar presa
   num envio que ninguém vai ler agora. */
export function registrarSuspeito(d: {
  nome: string;
  whatsapp: string;
  email?: string;
  instagram?: string;
  plano?: string;
  motivo: MotivoSuspeito;
  lang: Lang;
}) {
  void salvarLead({
    pagina: paginaDaVitrine(d.lang),
    lang: d.lang,
    nome: d.nome,
    whatsapp: d.whatsapp,
    ...(d.email ? { email: d.email } : {}),
    canal: d.instagram || "",
    ...(d.plano ? { plano: d.plano } : {}),
    ...contextoDaSessao(),
    /* a rota traduz isto em `status: "suspeito"` e pula CRM e aviso */
    suspeito: d.motivo,
  });
}
