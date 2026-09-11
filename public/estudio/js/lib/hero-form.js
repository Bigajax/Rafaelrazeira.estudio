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
import { CONFIG, WHATSAPP_NUMBER } from "../config.js";
import { trackLead } from "./tracking.js";

const whatsValido = (v) => { const d = v.replace(/\D/g, ""); return d.length === 10 || d.length === 11; };

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
  /* Só existe onde a página pede a prévia (ver `instagramReq`, no
     config): é o campo de onde eu tiro o que montar. Nulo na /estudio,
     e aí a checagem inteira fica de fora. */
  const errInsta = document.getElementById("h-err-insta");
  /* A faixa de investimento (10/09): só existe na /landing-page, que é a
     página que promete uma prévia inteira de graça e precisa saber antes
     se a pessoa anuncia. Ver `investimento` no CONFIG_LP. */
  const errInvest = document.getElementById("h-err-invest");
  if (errInvest) form.investimento.addEventListener("change", () => marcar(form.investimento, errInvest, false));

  // máscara (44) 99999-9999 enquanto digita
  const tel = form.whatsapp;
  tel.addEventListener("input", () => {
    const d = tel.value.replace(/\D/g, "").slice(0, 11);
    if      (d.length > 7) tel.value = `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
    else if (d.length > 2) tel.value = `(${d.slice(0,2)}) ${d.slice(2)}`;
    else if (d.length)     tel.value = `(${d}`;
  });

  // o erro some enquanto a pessoa corrige, não só no próximo envio
  form.nome.addEventListener("input", () => marcar(form.nome, errNome, false));
  tel.addEventListener("input", () => marcar(tel, errWhats, false));
  if (errInsta) form.instagram.addEventListener("input", () => marcar(form.instagram, errInsta, false));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (form._gotcha.value) return;                    // honeypot preenchido = robô

    const nomeOk  = marcar(form.nome, errNome, !form.nome.value.trim());
    const whatsOk = marcar(tel, errWhats, !whatsValido(tel.value));
    if (!nomeOk){ form.nome.focus(); return; }
    if (!whatsOk){ tel.focus(); return; }
    if (errInsta && !marcar(form.instagram, errInsta, !form.instagram.value.trim())){
      form.instagram.focus(); return;
    }
    if (errInvest && !marcar(form.investimento, errInvest, !form.investimento.value)){
      form.investimento.focus(); return;
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
    const pagina = location.pathname.replace(/^\/|\/$/g, "").split("/")[0] || "estudio";
    const payload = {
      pagina,
      nome: form.nome.value.trim(),
      whatsapp: tel.value.trim(),
      canal: form.instagram.value.trim(),
      investimento: form.investimento ? form.investimento.value : "",
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

      /* Lead deduplicado (Pixel + CAPI, mesmo event_id), igual ao do
         briefing. Fire-and-forget: falha de medição nunca pode derrubar
         um envio que já foi gravado. */
      const eventId = (crypto.randomUUID && crypto.randomUUID()) ||
                      `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      trackLead(eventId, { phone: payload.whatsapp });

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
  const okCta = document.getElementById("hero-ok-cta");
  if (okCta){
    okCta.addEventListener("click", () => {
      const nome = form.nome.value.trim();
      const msg = `Olá, Rafael! Acabei de deixar meu contato no site${nome ? `, sou ${nome}` : ""}. Quero falar sobre o meu projeto.`;
      okCta.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    });
  }
}
