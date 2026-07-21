/* Preferência de medição (modelo OPT-OUT desde jul/2026).
   Não há mais banner: a medição roda por padrão (legítimo interesse) e
   quem quiser desativar usa o botão na Política de Privacidade, que grava
   localStorage("cookie_consent") = "declined". O gate é lido por
   js/lib/tracking.js — "declined" desliga Pixel, CAPI e Mixpanel. */

const KEY = "cookie_consent";

export function getConsent(){
  try{ return localStorage.getItem(KEY); }catch(e){ return null; }
}
