/* Formulário de briefing: dropdowns glass, máscara de WhatsApp e envio.
   - Sem FORM_ENDPOINT: modo demo (loga no console e mostra sucesso).
   - Com FORM_ENDPOINT: faz POST JSON com os dados do lead. */
import { CONFIG, FORM_ENDPOINT, FORM_HEADERS } from "../config.js";
import { trackLead } from "./tracking.js";

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

export function initForm(){
  const form = document.getElementById("briefing-form");
  if (!form) return;

  initDropdowns();
  initWhatsMask(form);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (form._gotcha.value) return; // honeypot preenchido = bot

    if (!form.nome.value.trim() || !form.email.value.trim() || !form.whatsapp.value.trim()){
      form.reportValidity();
      return;
    }

    const payload = {
      nome: form.nome.value.trim(),
      email: form.email.value.trim(),
      whatsapp: form.whatsapp.value.trim(),
      empresa: form.empresa.value.trim(),
      cargo: form.cargo.value,
      necessidade: form.necessidade.value,
      inicio: form.inicio.value,
      investimento: form.investimento.value,
      canal: form.canal.value,
      origem: "landing-rafael-razeira",
    };

    const btn = form.querySelector(".btn-submit");
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
      trackLead(eventId, { email: payload.email, phone: payload.whatsapp });

      form.classList.add("hide");
      document.getElementById("form-success").classList.add("show");
      // Avança o stepper: 01 concluído → 02 (agendar conversa) ativo
      const steps = document.querySelectorAll(".stepper .step");
      if (steps.length === 2){
        steps[0].classList.replace("step--active", "step--muted");
        steps[1].classList.replace("step--muted", "step--active");
      }
    }catch(err){
      btn.disabled = false;
      btn.innerHTML = original;
      alert("Não foi possível enviar agora. Tente novamente ou escreva para " + CONFIG.contact.email);
    }
  });
}
