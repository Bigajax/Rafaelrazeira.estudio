/* ============================================================
   E-MAIL E TELEFONE INTERNACIONAL — a régua da versão em inglês (11/09/2026)

   POR QUE EXISTE: `components/telefone.ts` só aceita celular brasileiro,
   de propósito (é onde o WhatsApp mora, e é a régua da campanha pt). A
   /en/landing-page pede E-MAIL como contato obrigatório e o telefone vira
   opcional, com DDI, sem máscara: um americano digita +1 555 123 4567 e
   um português +351 91 234 5678, e nenhum dos dois cabe na régua do DDD.

   SEM REACT de propósito, pelo mesmo motivo do irmão: a rota /api/lead
   importa daqui e a validação precisa ser a MESMA nos dois lados. O
   cliente (public/estudio/js/lib/{hero-form,form}.js) repete estas duas
   expressões à mão porque é JS de navegador sem bundler; ao mudar aqui,
   mudar lá.

   A régua do telefone é a do E.164, frouxa de propósito: 7 a 15 dígitos
   depois de tirar tudo que não é dígito. Repetição (9999999) e escada
   (1234567) continuam recusadas: ninguém tem esse número.
   ============================================================ */

export const emailValido = (v: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v ?? "").trim());

export function telefoneInternacionalValido(v: string): boolean {
  const d = String(v ?? "").replace(/\D/g, "");
  if (d.length < 7 || d.length > 15) return false;
  if (/^(\d)\1+$/.test(d)) return false;
  const n = [...d].map(Number);
  const escada = (passo: number) => n.every((x, i) => i === 0 || x === (n[i - 1] + passo + 10) % 10);
  if (escada(1) || escada(-1)) return false;
  return true;
}
