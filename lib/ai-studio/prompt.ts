/* ============================================================
   O PROMPT QUE DE FATO VAI PARA O MODELO

   A API de imagem recebe uma lista de imagens e um texto, e mais nada: não
   existe campo para dizer "esta é o produto, esta é o estilo". Então a
   função de cada referência e as instruções de preservação viram linhas
   numeradas no fim do prompt, na mesma ordem em que as imagens são
   enviadas. O texto do Rafael vai primeiro e intacto; o que este arquivo
   acrescenta vem depois, separado, e fica gravado em `prompt_final` para
   conferir o que foi pedido de verdade.

   Nada aqui promete preservação perfeita. O modelo lê a instrução e
   costuma respeitar, mas o resultado precisa ser olhado.
   ============================================================ */
import { FUNCOES, type FuncaoReferencia } from "./modelos";

export type Origem = "criar" | "editar" | "variacao" | "quadro";

export type MontarPrompt = {
  origem: Origem;
  prompt: string;
  /* a imagem que entra como base (edição, variação, próximo quadro) */
  temBase: boolean;
  funcoes: FuncaoReferencia[];
  preservar: string[];
  /* o contexto do projeto, para a sequência */
  projeto?: { nome: string; descricao: string | null } | null;
};

export function montarPrompt(p: MontarPrompt): string {
  const partes: string[] = [];
  const base = p.temBase ? 1 : 0;

  if (p.origem === "editar") {
    partes.push("Edite a imagem 1 conforme a instrução abaixo. Altere somente o que for pedido; o resto da imagem deve continuar igual.");
    partes.push(`INSTRUÇÃO: ${p.prompt}`);
  } else if (p.origem === "variacao") {
    partes.push(
      "Crie uma variação da imagem 1: o mesmo conceito, a mesma direção de arte e os mesmos elementos principais, com uma nova composição ou um novo ângulo.",
    );
    if (p.prompt) partes.push(`PROMPT ORIGINAL: ${p.prompt}`);
  } else if (p.origem === "quadro" && p.temBase) {
    partes.push(
      "Esta é a próxima cena de uma sequência cinematográfica. A imagem 1 é o quadro anterior: mantenha o mesmo estilo visual, a mesma paleta, a mesma luz, a mesma lente e a mesma identidade de personagens e produtos, salvo o que a instrução mudar. A continuidade entre os quadros é a prioridade.",
    );
    partes.push(`COMO A CENA CONTINUA: ${p.prompt}`);
  } else {
    partes.push(p.prompt);
  }

  if (p.projeto && p.origem === "quadro") {
    const desc = p.projeto.descricao?.trim();
    partes.push(`PROJETO: ${p.projeto.nome}${desc ? `. ${desc}` : ""}`);
  }

  if (p.funcoes.length) {
    const linhas = p.funcoes.map((f, i) => `- Imagem ${i + 1 + base}: ${FUNCOES[f].instrucao}.`);
    partes.push(`IMAGENS DE REFERÊNCIA:\n${linhas.join("\n")}`);
  }

  const preservar = p.preservar.map((t) => t.trim()).filter(Boolean);
  if (preservar.length) {
    partes.push(`PRESERVAR (não alterar):\n${preservar.map((t) => `- ${t}`).join("\n")}`);
  }

  return partes.join("\n\n");
}
