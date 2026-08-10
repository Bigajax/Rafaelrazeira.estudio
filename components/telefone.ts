/* ============================================================
   TELEFONE DE WHATSAPP — máscara e validação, num lugar só.

   POR QUE EXISTE: até 10/08 o campo de WhatsApp era `type="tel" required`,
   e "required" só confere se está vazio. "123" e "asdasd" viravam lead no
   banco, e pior: disparavam o Contact que é o evento pelo qual a campanha
   da vitrine otimiza desde 10/08. Telefone lixo não é só atendimento
   perdido, é a Meta aprendendo com um falso positivo.

   SEM REACT de propósito: este módulo é importado também pela rota
   /api/lead, e a validação precisa ser a MESMA nos dois lados. O que o
   cliente aceita e o servidor recusa vira formulário que "não funciona";
   o contrário vira lixo no banco.

   A régua (celular brasileiro, que é onde o WhatsApp mora):
   • 10 ou 11 dígitos depois de tirar máscara e o 55 do país colado;
   • DDD entre 11 e 99 (nenhum DDD tem zero em posição nenhuma);
   • com 11 dígitos, o nono dígito é 9 (padrão desde 2016);
   • todos os dígitos iguais (99999999999) e escadas (12345678901,
     98765432109) são recusados: ninguém tem esse número, e é o que a
     pessoa digita quando quer passar pelo campo sem dar o telefone.
   ============================================================ */

export const apenasDigitos = (v: string) => v.replace(/\D/g, "");

/* o 55 do país entra quando a pessoa cola o número do próprio perfil do
   WhatsApp; só é removido quando sobra um número completo por baixo */
const semPais = (d: string) => (d.startsWith("55") && d.length > 11 ? d.slice(2) : d);

export function whatsappValido(v: string): boolean {
  const d = semPais(apenasDigitos(String(v ?? "")));
  if (d.length !== 10 && d.length !== 11) return false;
  if (d[0] === "0" || d[1] === "0") return false;
  if (d.length === 11 && d[2] !== "9") return false;
  if (/^(\d)\1+$/.test(d)) return false;
  const n = [...d].map(Number);
  const escada = (passo: number) => n.every((x, i) => i === 0 || x === (n[i - 1] + passo + 10) % 10);
  if (escada(1) || escada(-1)) return false;
  return true;
}

/* Máscara progressiva: o valor do campo é reescrito a cada tecla e a pessoa
   vê (44) 99999-7219 se formando. Metade do lixo é erro honesto de digitação,
   e formato visível é o que faz a pessoa conferir o próprio número. */
export function mascararWhatsapp(v: string): string {
  const d = semPais(apenasDigitos(String(v ?? ""))).slice(0, 11);
  if (!d) return "";
  if (d.length <= 2) return `(${d}`;
  const resto = d.slice(2);
  if (resto.length <= 4) return `(${d.slice(0, 2)}) ${resto}`;
  const corte = resto.length - 4;
  return `(${d.slice(0, 2)}) ${resto.slice(0, corte)}-${resto.slice(corte)}`;
}
