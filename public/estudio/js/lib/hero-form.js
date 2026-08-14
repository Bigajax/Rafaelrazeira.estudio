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
import { CONFIG, FORM_ENDPOINT, FORM_HEADERS, WHATSAPP_NUMBER } from "../config.js";
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

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (form._gotcha.value) return;                    // honeypot preenchido = robô

    const nomeOk  = marcar(form.nome, errNome, !form.nome.value.trim());
    const whatsOk = marcar(tel, errWhats, !whatsValido(tel.value));
    if (!nomeOk){ form.nome.focus(); return; }
    if (!whatsOk){ tel.focus(); return; }

    /* Mesmas chaves do briefing do fim: a tabela é a mesma, e mandar o
       payload incompleto quebraria a coluna legada que não aceita nulo. */
    const payload = {
      nome: form.nome.value.trim(),
      whatsapp: tel.value.trim(),
      instagram: form.instagram.value.trim(),
      tipo_projeto: "",
      vende: "",
      objetivo: "",
      identidade: "",
      detalhes: "",
      email: "",
      origem: "landing-rafael-razeira-hero",
    };

    const btn = form.querySelector(".hero-form__btn");
    const rotulo = btn.textContent;
    btn.disabled = true;
    btn.textContent = CONFIG.hero.form.enviando;

    try{
      if (FORM_ENDPOINT){
        const res = await fetch(FORM_ENDPOINT, {
          method:"POST", headers:FORM_HEADERS, body:JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Falha no envio");
      } else {
        console.log("[hero] configure FORM_ENDPOINT em js/config.js:", payload);
        await new Promise(r => setTimeout(r, 400));
      }

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
