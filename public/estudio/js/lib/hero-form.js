/* ============================================================
   FORMULÁRIO DO HERO

   O cartão da primeira dobra tinha um botão que ROLAVA até o briefing no
   fim da página. Quem decidia na primeira tela precisava atravessar onze
   mil pixels para conseguir falar, e cada seção no caminho é uma chance
   de fechar a aba. Agora a captura acontece ali.

   ---------- o que ele NÃO é ----------
   Não é uma segunda versão do briefing. O briefing do fim continua
   inteiro (dois passos, tipo de projeto, o que vende, objetivo) e é o
   caminho de quem quer contar o projeto todo. Este pede o mínimo para eu
   conseguir responder: nome e WhatsApp, mais o perfil se a pessoa quiser.

   Os dois gravam na MESMA tabela e disparam o MESMO Lead. O que os
   separa nos dados é o campo `origem`, que aqui vai com o sufixo
   `-hero`: sem isso não dá para saber se este formulário está
   funcionando.

   ---------- por que os ids são próprios ----------
   O `js/lib/form.js` procura os erros dele por `getElementById`
   ("err-nome", "err-whats"). Se este formulário usasse os mesmos ids, o
   erro de um apareceria no outro. Todos os ids daqui levam o prefixo
   `h-`.

   ---------- decisões que vieram da /vitrine-digital ----------
   1. RÓTULO VISÍVEL em cada campo. Só placeholder some quando a pessoa
      digita, e deixa o campo anônimo na hora de conferir.
   2. CAMPOS COM 16px. Abaixo disso o Safari do iPhone dá zoom ao focar:
      a página salta de escala e volta desalinhada. Foi onde as pessoas
      largaram o formulário de lá.
   3. A CONFIRMAÇÃO OCUPA O PRÓPRIO CARTÃO, por estado, sem navegação:
      assim ela aparece igual dentro do navegador do Instagram.
   ============================================================ */
import { CONFIG, T, WHATSAPP_NUMBER } from "../config.js";
import { trackLead, trackTocouFormulario } from "./tracking.js";

const whatsValido = (v) => { const d = v.replace(/\D/g, ""); return d.length === 10 || d.length === 11; };
/* a régua do e-mail é a mesma da rota (components/telefone-intl.ts): um @,
   um ponto no domínio, nada de espaço */
const emailValido = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

function marcar(input, err, invalido){
  input.classList.toggle("is-invalid", invalido);
  err.hidden = !invalido;
  return !invalido;
}

export function initHeroForm(){
  const form = document.getElementById("hero-form");
  if (!form) return;

  const errNome  = document.getElementById("h-err-nome");
  const errWhats = document.getElementById("h-err-whats");
  /* A /en/landing-page pede e-mail no lugar do WhatsApp (11/09/2026): o
     campo que existe no DOM é o que decide a validação, e o outro é nulo. */
  const errEmail = document.getElementById("h-err-email");
  /* Só existe onde a página pede a prévia (ver `instagramReq`, no
     config): é o campo de onde eu tiro o que montar. Nulo na /estudio,
     e aí a checagem inteira fica de fora. */
  const errInsta = document.getElementById("h-err-insta");
  /* A faixa de investimento (10/09): só existe na /landing-page, que é a
     página que promete uma prévia inteira de graça e precisa saber antes
     se a pessoa anuncia. Ver `investimento` no CONFIG_LP. */
  const errInvest = document.getElementById("h-err-invest");
  /* As faixas são rádios dentro de um fieldset (11/09): `form.investimento`
     vira um RadioNodeList, cujo `.value` é a opção marcada ou "". Quem
     recebe a marca de inválido é o fieldset, que é o que tem borda. */
  const faixas = document.getElementById("h-faixas");
  if (errInvest && faixas) faixas.addEventListener("change", () => marcar(faixas, errInvest, false));

  // máscara (44) 99999-9999 enquanto digita (só onde o campo é o WhatsApp)
  const tel = form.whatsapp || null;
  if (tel) tel.addEventListener("input", () => {
    const d = tel.value.replace(/\D/g, "").slice(0, 11);
    if      (d.length > 7) tel.value = `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
    else if (d.length > 2) tel.value = `(${d.slice(0,2)}) ${d.slice(2)}`;
    else if (d.length)     tel.value = `(${d}`;
  });

  // o erro some enquanto a pessoa corrige, não só no próximo envio
  /* `form.nome` só existe onde o config pede o nome (a /landing-page
     parou de pedir em 11/09) */
  if (form.nome) form.nome.addEventListener("input", () => marcar(form.nome, errNome, false));
  if (tel) tel.addEventListener("input", () => marcar(tel, errWhats, false));
  if (form.email) form.email.addEventListener("input", () => marcar(form.email, errEmail, false));
  if (errInsta) form.instagram.addEventListener("input", () => marcar(form.instagram, errInsta, false));

  /* o primeiro toque em qualquer campo, uma vez só (`focusin` borbulha, o
     `focus` não; `change` cobre as pílulas de faixa, que não recebem foco
     no toque em alguns navegadores embutidos) */
  let tocou = false;
  const aoTocar = () => { if (!tocou){ tocou = true; trackTocouFormulario("hero"); } };
  form.addEventListener("focusin", aoTocar);
  form.addEventListener("change", aoTocar);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (form._gotcha.value) return;                    // honeypot preenchido = robô

    const nomeOk  = !form.nome || marcar(form.nome, errNome, !form.nome.value.trim());
    const whatsOk = !tel || marcar(tel, errWhats, !whatsValido(tel.value));
    const emailOk = !form.email || marcar(form.email, errEmail, !emailValido(form.email.value));
    if (!nomeOk){ form.nome.focus(); return; }
    if (!whatsOk){ tel.focus(); return; }
    if (!emailOk){ form.email.focus(); return; }
    if (errInsta && !marcar(form.instagram, errInsta, !form.instagram.value.trim())){
      form.instagram.focus(); return;
    }
    if (errInvest && faixas && !marcar(faixas, errInvest, !form.investimento.value)){
      faixas.querySelector("input").focus(); return;
    }

    /* ---------- o hero passou a gravar em `leads`, pela /api/lead (10/09/2026) ----------
       Até aqui ele escrevia direto na `briefings` com a chave publicável, e
       a `briefings` não tem leitor: nenhum card no CRM, nenhum push, nenhum
       e-mail. O lead da landing chegava calado numa tabela que ninguém abre.
       Pela rota, ele vira card no pipeline com a faixa de investimento no
       resumo, que é onde a regra "prévia só para quem anuncia" é aplicada.

       O briefing completo do fim da página (contact.js) continua na
       `briefings`: ele tem campos que a `leads` não tem. */
    const utm = {};
    for (const [k, v] of new URLSearchParams(location.search)) if (k.startsWith("utm_")) utm[k] = v;
    /* `pagina` vem do config, nunca mais do path: em /en/landing-page o
       primeiro segmento é "en", e o lead chegaria na rota sem tipo, sem
       nota e com o dedupe errado, em silêncio. */
    const marcada = form.investimento ? form.querySelector("input[name=investimento]:checked") : null;
    const payload = {
      pagina: CONFIG.pagina,
      lang: CONFIG.lang,
      nome: form.nome ? form.nome.value.trim() : "",
      whatsapp: tel ? tel.value.trim() : "",
      email: form.email ? form.email.value.trim() : "",
      canal: form.instagram.value.trim(),
      investimento: marcada ? marcada.value : "",
      /* a chave canônica da faixa: é por ela que a rota decide a nota do
         CRM, porque o texto muda com o idioma */
      investimento_faixa: marcada ? marcada.dataset.faixa || "" : "",
      utm,
      url: location.href,
      referrer: document.referrer || "",
    };

    const btn = form.querySelector(".hero-form__btn");
    const rotulo = btn.textContent;
    btn.disabled = true;
    btn.textContent = CONFIG.hero.form.enviando;

    try{
      const res = await fetch("/api/lead", {
        method:"POST", headers:{ "Content-Type": "application/json" }, body:JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Falha no envio");
      /* `repetido`: a rota achou o envio desta pessoa nas últimas 24h e
         atualizou a linha em vez de criar outra. Sem Lead de novo: em 12 e
         15/09 dois leads que preencheram os dois formulários viraram quatro
         resultados na Meta. Corpo ilegível conta como envio novo, nunca
         como perda. */
      const resposta = await res.json().catch(() => ({}));

      /* Lead deduplicado (Pixel + CAPI, mesmo event_id), igual ao do
         briefing. Fire-and-forget: falha de medição nunca pode derrubar
         um envio que já foi gravado. */
      if (!resposta.repetido){
        const eventId = (crypto.randomUUID && crypto.randomUUID()) ||
                        `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        trackLead(eventId, { phone: payload.whatsapp, email: payload.email });
      }

      document.getElementById("hero-card").classList.add("is-enviado");
    }catch(err){
      btn.disabled = false;
      btn.textContent = rotulo;
      const nota = form.querySelector(".hero-form__erro");
      nota.textContent = CONFIG.hero.form.erro;
      nota.hidden = false;
    }
  });

  // o botão da confirmação abre a conversa já com o nome preenchido
  // (WhatsApp no pt; no en o href já é o mailto: do config e fica como está)
  const okCta = document.getElementById("hero-ok-cta");
  if (okCta && !form.email){
    okCta.addEventListener("click", () => {
      const nome = form.nome ? form.nome.value.trim() : "";
      okCta.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(T.msgHero(nome))}`;
    });
  }
}
