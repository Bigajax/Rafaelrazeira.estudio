/* Formulário de briefing em 2 passos:
   01 Seus dados (nome, WhatsApp, Instagram/site opcional)
   → 02 Sobre o projeto (tipo de projeto, o que vende, objetivo,
     identidade, detalhes).
   - Validação inline por campo (sem alert) — mensagens em CONFIG.contact.form.*.err
   - Avançar de passo dispara InitiateCheckout (com consentimento); Lead só no envio.
   - Sem FORM_ENDPOINT: modo demo. Com FORM_ENDPOINT: POST JSON com os campos. */
import { CONFIG, FORM_ENDPOINT, FORM_HEADERS } from "../config.js";
import { trackLead, trackInitiateCheckout } from "./tracking.js";

/* —— Dropdowns customizados (efeito vidro ao abrir as opções) —— */
function initDropdowns(){
  const dds = document.querySelectorAll("[data-dd]");

  const closeAll = (except) => dds.forEach(dd => {
    if (dd !== except){
      dd.classList.remove("open");
      dd.querySelector(".dd__btn").setAttribute("aria-expanded", "false");
    }
  });

  dds.forEach(dd => {
    const btn  = dd.querySelector(".dd__btn");
    const hid  = dd.querySelector("input[type=hidden]");
    const show = dd.querySelector(".dd__value");

    btn.addEventListener("click", () => {
      const abrir = !dd.classList.contains("open");
      closeAll(dd);
      dd.classList.toggle("open", abrir);
      btn.setAttribute("aria-expanded", String(abrir));
    });

    dd.querySelectorAll(".dd__opt").forEach(opt => {
      opt.addEventListener("click", () => {
        dd.querySelectorAll(".is-selected").forEach(s => s.classList.remove("is-selected"));
        opt.classList.add("is-selected");
        hid.value = opt.dataset.value;
        show.textContent = opt.dataset.value;
        dd.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
        btn.focus();
      });
    });

    dd.addEventListener("keydown", e => {
      if (e.key === "Escape"){ dd.classList.remove("open"); btn.setAttribute("aria-expanded","false"); btn.focus(); }
    });
  });

  document.addEventListener("click", e => {
    if (!e.target.closest("[data-dd]")) closeAll();
  });
}

/* —— Máscara (12) 12345-6789 enquanto digita —— */
function initWhatsMask(form){
  const tel = form.whatsapp;
  tel.addEventListener("input", () => {
    const d = tel.value.replace(/\D/g, "").slice(0, 11);
    if      (d.length > 7) tel.value = `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
    else if (d.length > 2) tel.value = `(${d.slice(0,2)}) ${d.slice(2)}`;
    else if (d.length)     tel.value = `(${d}`;
  });
}

/* —— Validação inline —— */
const whatsValido = (v) => { const d = v.replace(/\D/g, ""); return d.length === 10 || d.length === 11; };

function marcarErro(input, errEl, invalido){
  input.classList.toggle("is-invalid", invalido);
  errEl.hidden = !invalido;
  return !invalido;
}

function validarPasso1(form){
  const nomeOk  = marcarErro(form.nome,     document.getElementById("err-nome"),  !form.nome.value.trim());
  const whatsOk = marcarErro(form.whatsapp, document.getElementById("err-whats"), !whatsValido(form.whatsapp.value));
  if (!nomeOk)  { form.nome.focus();     return false; }
  if (!whatsOk) { form.whatsapp.focus(); return false; }
  return true;
}

/* ---------- a validação do formulário de um passo só ----------
   Os quatro campos são conferidos de uma vez, de cima para baixo, e o
   foco vai para o primeiro que falhar: numa lista curta isso é mais
   rápido do que espalhar erro por dois passos.

   "Site ou Instagram" é OBRIGATÓRIO aqui, ao contrário do campo
   equivalente do briefing da /estudio: sem saber para onde os anúncios
   apontam hoje, não existe análise para entregar, e a análise é o que a
   página inteira promete. */
function validarUmPasso(form){
  const checa = (campo, errId) =>
    marcarErro(form[campo], document.getElementById(errId), !form[campo].value.trim());
  for (const [campo, errId] of [["nome","err-nome"],["instagram","err-insta"],["vende","err-vende"]]){
    if (!checa(campo, errId)){ form[campo].focus(); return false; }
  }
  if (!marcarErro(form.whatsapp, document.getElementById("err-whats"), !whatsValido(form.whatsapp.value))){
    form.whatsapp.focus(); return false;
  }
  return true;
}

function validarPasso2(form){
  // Tipo de projeto (pills) — obrigatório; o erro marca o grupo inteiro
  const grupo  = form.querySelector(".choices");
  const tipoOk = !!form.tipo_projeto.value;
  grupo.classList.toggle("is-invalid", !tipoOk);
  document.getElementById("err-tipo").hidden = tipoOk;
  if (!tipoOk){ grupo.querySelector("input").focus(); return false; }

  const vendeOk = marcarErro(form.vende, document.getElementById("err-vende"), !form.vende.value.trim());
  if (!vendeOk){ form.vende.focus(); return false; }
  return true;
}

export function initForm(){
  const form = document.getElementById("briefing-form");
  if (!form) return;

  initDropdowns();
  initWhatsMask(form);

  const passo1 = form.querySelector('[data-fstep="1"]');
  const passo2 = form.querySelector('[data-fstep="2"]');
  const steps  = document.querySelectorAll(".stepper .step");
  /* Sem o passo 2 no DOM, este é o formulário de um passo só da
     /landing-page (ver js/sections/contact.js). Tudo que é de dois
     passos (stepper, botão continuar, botão voltar, InitiateCheckout ao
     avançar) fica desligado a partir daqui, e nada disso pode ser
     assumido como existente: os `getElementById` de antes davam TypeError
     na página nova. */
  const umPasso = !passo2;
  let icDisparado = false;   // InitiateCheckout: uma vez por visita

  function irParaPasso(n){
    passo1.classList.toggle("is-active", n === 1);
    passo2.classList.toggle("is-active", n === 2);
    if (steps.length === 2){
      steps[0].classList.toggle("step--active", n === 1);
      steps[0].classList.toggle("step--muted",  n !== 1);
      steps[1].classList.toggle("step--active", n === 2);
      steps[1].classList.toggle("step--muted",  n !== 2);
    }
  }

  // limpa o erro do campo enquanto digita (o "instagram" só tem erro na
  // versão de um passo, então a lista é montada conforme o que existe)
  [["nome","err-nome"],["whatsapp","err-whats"],["vende","err-vende"],["instagram","err-insta"]].forEach(([campo, errId]) => {
    const el = form[campo], err = document.getElementById(errId);
    if (!el || !err) return;
    el.addEventListener("input", () => {
      el.classList.remove("is-invalid");
      err.hidden = true;
    });
  });

  if (!umPasso){
    // limpa o erro do tipo de projeto ao escolher uma pill
    form.querySelectorAll('input[name="tipo_projeto"]').forEach(r => {
      r.addEventListener("change", () => {
        form.querySelector(".choices").classList.remove("is-invalid");
        document.getElementById("err-tipo").hidden = true;
      });
    });

    document.getElementById("btn-continue").addEventListener("click", () => {
      if (!validarPasso1(form)) return;
      irParaPasso(2);
      if (!icDisparado){ icDisparado = true; trackInitiateCheckout(); }
    });

    document.getElementById("btn-back").addEventListener("click", () => irParaPasso(1));
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (form._gotcha.value) return; // honeypot preenchido = bot
    if (umPasso){
      if (!validarUmPasso(form)) return;
    } else {
      if (!validarPasso1(form)){ irParaPasso(1); return; }
      if (!validarPasso2(form)) return;
    }

    /* O payload tem as MESMAS chaves nas duas versões: a tabela é uma só,
       e a coluna legada `email` não aceita nulo. O que a versão curta não
       pergunta vai como string vazia.
       O `origem` é o que separa as duas páginas nos dados. Sem ele não dá
       para saber qual das duas está trazendo lead, que é a primeira coisa
       que a campanha vai precisar responder. */
    const opc = (nome) => (form[nome] ? form[nome].value.trim() : "");
    const payload = {
      nome: form.nome.value.trim(),
      whatsapp: form.whatsapp.value.trim(),
      instagram: form.instagram.value.trim(),
      tipo_projeto: opc("tipo_projeto"),
      vende: opc("vende"),
      objetivo: opc("objetivo"),
      identidade: opc("identidade"),
      detalhes: opc("detalhes"),
      email: "",                       // coluna legada (not null) no Supabase
      origem: umPasso ? "landing-rafael-razeira-lp" : "landing-rafael-razeira",
    };

    const btn = form.querySelector(".btn-submit[type=submit]") || passo2.querySelector(".btn-submit");
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = "Enviando…";

    try{
      if (FORM_ENDPOINT){
        const res = await fetch(FORM_ENDPOINT, {
          method:"POST", headers:FORM_HEADERS, body:JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Falha no envio");
      } else {
        console.log("[briefing] configure FORM_ENDPOINT em js/config.js para enviar de verdade:", payload);
        await new Promise(r => setTimeout(r, 500));
      }

      // Lead deduplicado (Pixel + CAPI, mesmo event_id) — só com consentimento;
      // fire-and-forget: falha de tracking nunca afeta o envio.
      const eventId = (crypto.randomUUID && crypto.randomUUID()) ||
                      `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      trackLead(eventId, { phone: payload.whatsapp, tipo_projeto: payload.tipo_projeto });

      form.classList.add("hide");
      const stepper = document.querySelector(".form-card .stepper");
      if (stepper) stepper.style.display = "none";
      document.getElementById("form-success").classList.add("show");
    }catch(err){
      btn.disabled = false;
      btn.innerHTML = original;
      const nota = form.querySelector(".form-note");
      nota.textContent = "Não foi possível enviar agora. Tente novamente ou escreva para " + CONFIG.contact.email;
      nota.classList.add("form-note--erro");
    }
  });
}
