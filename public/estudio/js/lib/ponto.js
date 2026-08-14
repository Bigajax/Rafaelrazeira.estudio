/* ============================================================
   PONTO FINAL EM ROSA

   O menor lugar possível para a cor de acento da casa, e o mais
   deliberado: numa manchete de display o ponto é a única pontuação, e no
   corpo em que essas manchetes vivem ele tem tamanho de sobra para ser
   lido como escolha, e não como sujeira.

   A regra é: TODA manchete de display da página que termina em ponto tem
   o ponto em rosa. Usada uma vez seria enfeite; usada em todas, é
   gramática. É a mesma regra do /portfolio.

   ---------- por que isto é uma função e não texto no config ----------
   `js/config.js` é o arquivo que o Rafael edita para trocar copy, e ele
   tem um contrato simples: texto, não marcação de estilo. Enfiar
   `<span class="ponto">` em oito frases lá dentro transformaria cada
   troca de manchete numa chance de esquecer a tag. Aqui a marcação nasce
   na hora de montar o HTML, e manchete nova entra sem ninguém lembrar de
   nada.

   ---------- o regex ----------
   O ponto nem sempre é o último caractere: no hero a última linha é
   `EM ATÉ <em>7 DIAS ÚTEIS.</em>`, ou seja, ele vem ANTES de tags de
   fechamento. O padrão aceita qualquer sequência de `</tag>` e espaços
   depois do ponto e devolve tudo no lugar.

   Não mexe em quem não termina em ponto (a manchete dos cases, a do
   founder), e não mexe em reticências.
   ============================================================ */
export function ponto(txt){
  if (typeof txt !== "string") return txt;
  return txt.replace(
    /(?<!\.)\.((?:\s*<\/[a-zA-Z][^>]*>)*\s*)$/,
    '<span class="ponto">.</span>$1'
  );
}
