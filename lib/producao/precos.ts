/* ============================================================
   OS PREÇOS QUE CHEGAM PELO WHATSAPP

   O preço não está no Instagram e não vai estar: a loja guarda ele para o
   direct, que é a dor que a vitrine resolve. Mas ele chega, e chega sempre
   do mesmo jeito, num texto torto colado numa conversa:

       Campus creme 899
       Samba preto - R$ 649,90
       bolsa caramelo 189
       Nike cinza 799,90 (só 37 e 38)

   Este arquivo transforma isso em preço no catálogo, casando cada linha com
   a peça certa. É o par da leitura por visão: a foto dá o nome, a colagem
   dá o preço.

   ---------- por que casar por palavra, e não por modelo ----------
   Isto poderia ser mais uma chamada paga. Não é, por dois motivos: o
   casamento é conferível (você vê o que casou e o que sobrou, e conserta na
   tabela) e é PREVISÍVEL, que é o que importa quando o erro custa um preço
   errado na loja de alguém. Um modelo acertaria mais nos casos difíceis e
   erraria em silêncio nos fáceis.

   ---------- a regra de ouro ----------
   Na dúvida, NÃO casa. Uma linha que não achou dona volta como órfã na
   tela, e você resolve em cinco segundos. Um preço colado na peça errada
   fica escondido até o cliente reclamar.
   ============================================================ */

import type { Produto } from "./tipos";

/* Palavras que aparecem em metade das linhas e não identificam nada. Sem
   isso, "bolsa 189" casaria com qualquer bolsa do catálogo. */
const VAZIAS = new Set([
  "de", "da", "do", "com", "sem", "por", "para", "em", "e", "ou", "the", "reais", "real",
  "unidade", "un", "cada", "pronta", "entrega", "novo", "nova", "novos", "novas",
]);

const semAcento = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const tokens = (s: string) =>
  semAcento(s)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !VAZIAS.has(t));

/* ---------- achar o preço na linha ----------
   A primeira versão pegava o ÚLTIMO número, porque o nome vem antes do
   preço. O teste derrubou isso na primeira linha real: "Nike cinza 799,90
   (só 37 e 38)" tem o tamanho no fim, e a peça foi para a vitrine
   custando trinta e oito reais.

   A regra agora tem duas camadas, na ordem em que a certeza cai:
     1. Se algum número vem marcado com R$, é ele. Ninguém escreve R$
        antes de tamanho.
     2. Senão, o MAIOR número da linha. Preço de peça é maior que tamanho,
        que quantidade e que número de parcela, e essa é a única relação
        que se sustenta sem saber a loja.

   Parcela ("3x de 63,30") sai antes de tudo: ela não é preço à vista, e
   deixar a parcela virar preço é o erro mais caro deste arquivo. */
function precoDaLinha(linha: string): number | null {
  const semParcela = linha.replace(/\d+\s*x\s*(de)?\s*[\d.,]+/gi, " ");

  const candidatos: { valor: number; comCifrao: boolean }[] = [];
  for (const m of semParcela.matchAll(/(r\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:[.,]\d{1,2})?)/gi)) {
    const valor = Number(m[2].replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
    /* Abaixo de 10 é tamanho, quantidade ou número de parcela, nunca preço
       de peça de roupa. Piso grosseiro e de propósito: preço de verdade
       que caia abaixo dele você digita na tabela. */
    if (Number.isFinite(valor) && valor >= 10) candidatos.push({ valor, comCifrao: Boolean(m[1]) });
  }
  if (!candidatos.length) return null;

  const marcado = candidatos.find((c) => c.comCifrao);
  if (marcado) return marcado.valor;

  return candidatos.reduce((a, b) => (b.valor > a.valor ? b : a)).valor;
}

/* O nome é o que sobra quando os números saem. */
const nomeDaLinha = (linha: string) =>
  linha
    .replace(/(?:r\$)?\s*\d+(?:[.,]\d+)*/gi, " ")
    .replace(/\b\d+\s*x\b/gi, " ")
    .replace(/[|•·\-–—:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export type Casamento = { produto_id: string; nome: string; preco: number; linha: string };
export type Resultado = { casados: Casamento[]; orfas: string[]; ignoradas: number };

export function casarPrecos(texto: string, produtos: Produto[]): Resultado {
  const casados: Casamento[] = [];
  const orfas: string[] = [];
  let ignoradas = 0;

  /* Um produto só recebe um preço. Se duas linhas apontarem para a mesma
     peça, a segunda vira órfã e aparece na tela: é quase sempre sinal de
     que o catálogo tem duas peças parecidas e você precisa olhar. */
  const jaLevou = new Set<string>();

  for (const bruta of texto.split(/\r?\n/)) {
    const linha = bruta.trim();
    if (!linha) continue;

    const preco = precoDaLinha(linha);
    const nome = nomeDaLinha(linha);
    if (preco === null || !nome) {
      ignoradas++;
      continue;
    }

    const daLinha = tokens(nome);
    if (!daLinha.length) {
      ignoradas++;
      continue;
    }

    let melhor: { produto: Produto; pontos: number } | null = null;
    let empate = false;

    for (const produto of produtos) {
      if (jaLevou.has(produto.id)) continue;

      /* ---------- o nome vale dobrado ----------
         "Campus creme" empatava com "Campus bordô", porque a cor do bordô
         é "creme e bordô": as duas peças tinham as mesmas duas palavras, e
         o empate mandava a linha para a lista de órfãs mesmo existindo uma
         resposta certa e óbvia.

         Palavra que está no NOME da peça vale dois; palavra que só aparece
         na marca ou na cor vale um. É o que faz a peça que se CHAMA campus
         creme ganhar da peça que apenas TEM creme na descrição. */
      const doNome = new Set(tokens(produto.nome));
      const doResto = new Set(tokens([produto.marca, produto.cor].filter(Boolean).join(" ")));
      let pontos = 0;
      for (const t of daLinha) {
        if (doNome.has(t)) pontos += 2;
        else if (doResto.has(t)) pontos += 1;
      }
      if (!pontos) continue;

      if (!melhor || pontos > melhor.pontos) {
        melhor = { produto, pontos };
        empate = false;
      } else if (pontos === melhor.pontos) {
        empate = true;
      }
    }

    /* Empate no topo é ambiguidade, e ambiguidade não casa: "Campus 899"
       com duas Campus no catálogo é exatamente a hora de perguntar, não de
       adivinhar. */
    if (!melhor || empate) {
      orfas.push(linha);
      continue;
    }

    jaLevou.add(melhor.produto.id);
    casados.push({ produto_id: melhor.produto.id, nome: melhor.produto.nome, preco, linha });
  }

  return { casados, orfas, ignoradas };
}
