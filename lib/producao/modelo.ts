/* ============================================================
   O MODELO QUE LÊ O CATÁLOGO — Claude direto, e agora OLHANDO as fotos

   A oficina nasceu chamando o OpenRouter, que é o transporte que o CRM já
   usava para pesquisar leads. No primeiro teste real (a Kanton, 26/08) essa
   escolha cobrou o preço dela: a conta do OpenRouter estava sem saldo e a
   leitura do catálogo morreu antes de ler uma legenda.

   Aqui a chamada vai para a API da Anthropic, e a troca resolveu duas
   coisas que este arquivo carrega:

     SAÍDA ESTRUTURADA. Extração vive ou morre no formato. Com
     `output_config.format` o modelo é OBRIGADO a devolver o JSON do
     esquema, validado antes de chegar aqui. Some a gambiarra de recortar do
     primeiro colchete ao último, some o "respondeu fora do formato".

     VISÃO. Esta é a mudança que fez a oficina funcionar de verdade. O
     mesmo teste mostrou que a Kanton tem SETE legendas em cinquenta e sete
     fotos, e nenhuma com preço: ler legenda ali devolvia catálogo vazio. A
     foto, ao contrário, diz tudo o que importa (é um Adidas Campus creme,
     é uma bolsa, é um tênis de corrida). O preço é o único dado que a foto
     também não tem, e ele vem por outro caminho (lib/producao/precos.ts).

   ---------- o que NÃO mudou de lugar ----------
   A pesquisa de leads do CRM continua no OpenRouter, porque depende de
   busca na web. Este arquivo cobre extração, que é offline: o material já
   está na mão.

   ---------- a chave ----------
   ANTHROPIC_API_KEY no .env.local (e em Settings, na Vercel). O construtor
   sem argumento resolve a credencial do ambiente sozinho.
   ============================================================ */

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

/* O modelo é configurável pela ANTHROPIC_MODELO, pelo mesmo motivo que o
   OPENROUTER_MODELO é no CRM: trocar de modelo não pode exigir deploy de
   código. O padrão é o Opus 5.
   SE UM DIA ISSO FICAR CARO: `claude-haiku-4-5` é o candidato natural, mas
   cuidado, agora a tarefa envolve OLHAR imagem e reconhecer marca de tênis
   pelo solado. É decisão de custo contra acerto, sua, não do código. */
const MODELO = process.env.ANTHROPIC_MODELO || "claude-opus-5";

/* Preços por milhão de tokens, da tabela oficial em 26/08/2026, usados só
   para ESTIMAR o custo que aparece na nota da loja. Estimativa, e não
   cobrança: se a tabela mudar e ninguém atualizar aqui, o painel mostra um
   número errado, nunca um valor errado é cobrado. */
const USD_ENTRADA_MTOK = 5;
const USD_SAIDA_MTOK = 25;

let clientePreguicoso: Anthropic | null = null;
export function cliente(): Anthropic {
  if (!clientePreguicoso) clientePreguicoso = new Anthropic();
  return clientePreguicoso;
}

export const temChaveDaAnthropic = () => Boolean(process.env.ANTHROPIC_API_KEY);

/* ---------- o esquema, que é o contrato ----------
   Ele não descreve só o formato: é ele que ensina o modelo o que cada campo
   é. Por isso todo campo tem `.describe()`, e as descrições carregam as
   armadilhas do domínio. Um esquema mudo devolveria JSON válido cheio de
   dado errado. */
const Item = z.object({
  media_id: z.string().describe("exatamente o id que veio na foto, sem alterar nada"),
  nome: z
    .string()
    .describe(
      'nome curto e específico do produto, em Caixa de Frase, do jeito que uma loja escreveria na etiqueta: "Tênis Adidas Campus creme", "Bolsa tiracolo caramelo". Sem emoji, sem "novidade", sem hashtag. String vazia se a foto não for de produto.',
    ),
  marca: z
    .string()
    .nullable()
    .describe(
      "a marca do produto quando ela estiver VISÍVEL na foto (logo, três listras, swoosh, nome na caixa ou na etiqueta). Nunca deduza pela forma do produto: se não dá para ler ou reconhecer o símbolo, é null.",
    ),
  cor: z.string().nullable().describe('a cor principal em uma ou duas palavras ("creme", "preto e branco").'),
  preco: z
    .number()
    .nullable()
    .describe(
      'preço À VISTA em número (189.90), SOMENTE se estiver escrito na legenda ou na própria arte da foto. Se a legenda só traz parcela ("3x de 63,30"), devolva null: parcela NÃO é preço. Nunca estime o preço pela aparência do produto.',
    ),
  preco_de: z.number().nullable().describe('preço riscado, quando anunciado ("de 299 por 189"). Senão null.'),
  tamanhos: z
    .string()
    .nullable()
    .describe('tamanhos como estão escritos ("P, M, G" ou "36 ao 40"). Null se não houver.'),
  categoria: z
    .string()
    .nullable()
    .describe('uma palavra que agrupe ("Tênis", "Bolsas", "Vestidos", "Jeans"). Use a MESMA em produtos parecidos.'),
  descricao: z.string().nullable().describe("no máximo uma frase, só o que dá para afirmar vendo a foto. Senão null."),
  /* ---------- o campo que junta o carrossel ----------
     Sem ele, um carrossel de quatro fotos do mesmo tênis vira quatro
     produtos, e a vitrine repete a mesma peça quatro vezes. Com ele, a
     primeira foto vira o produto e as outras viram fotos extras dele. */
  mesma_peca_que: z
    .string()
    .nullable()
    .describe(
      "se esta foto mostra a MESMA peça de outra foto deste lote (outro ângulo, outro pé do par, a mesma peça reposta), devolva aqui o media_id daquela outra foto. Peça igual em cor diferente NÃO é a mesma peça. Se for a primeira aparição, null.",
    ),
  descartar: z
    .boolean()
    .describe(
      "true quando a foto NÃO é de um produto à venda: cartaz de horário, frase motivacional, foto só da fachada, meme, print de recado, foto da equipe.",
    ),
});

const Resposta = z.object({
  itens: z.array(Item).describe("um objeto por foto recebida, na mesma ordem"),
});

export type ItemLido = z.infer<typeof Item>;

const INSTRUCOES = `Você monta o catálogo de uma vitrine digital olhando as fotos que a loja publicou no Instagram.

Cada foto vem com o id dela e, quando existir, a legenda do post. A LEGENDA É AUXILIAR: a maioria das lojas não escreve nada útil. O que decide é o que você VÊ na foto.

REGRAS QUE MUDAM O RESULTADO:
1. Nunca invente preço. Preço só existe se estiver escrito na legenda ou visível na arte da foto. Na dúvida, null.
2. Marca só quando for visível (logo, listras, swoosh, caixa, etiqueta). Não deduza pela forma.
3. Nomeie como uma etiqueta de loja, não como um catálogo de moda: tipo da peça, marca se houver, cor.
4. Fotos do mesmo post (ids terminados em _1, _2, _3) quase sempre são a MESMA peça em outro ângulo: use mesma_peca_que. Mas se o post mostra peças diferentes, cada uma é um produto.
5. Devolva um objeto para CADA foto recebida, na mesma ordem.`;

export type FotoParaLer = { media_id: string; url: string; legenda: string | null };

/* Uma chamada, um lote. Quem divide em lotes é o chamador, que é quem sabe
   quantas fotos existem. */
export async function lerLote(
  fotos: FotoParaLer[],
): Promise<{ itens: ItemLido[]; custo_usd: number }> {
  /* Cada foto entra como um par: a imagem e a etiqueta dela em texto. Sem a
     etiqueta logo abaixo, o modelo não tem como dizer QUAL foto ele está
     descrevendo, e o media_id volta trocado. A imagem vai por URL porque o
     bucket é público e a API busca sozinha: mandar base64 dobraria o peso
     da requisição por nada. */
  const conteudo = fotos.flatMap((f) => [
    { type: "image" as const, source: { type: "url" as const, url: f.url } },
    {
      type: "text" as const,
      text: `media_id: ${f.media_id}${f.legenda ? `\nlegenda: ${f.legenda.slice(0, 300)}` : "\n(post sem legenda)"}`,
    },
  ]);

  const resposta = await cliente().messages.parse({
    model: MODELO,
    max_tokens: 16000,
    system: INSTRUCOES,
    output_config: {
      format: zodOutputFormat(Resposta),
      /* Olhar foto e nomear peça continua sendo reconhecimento, não
         raciocínio duro. O esforço baixo é o mesmo da colheita do CRM, e é
         onde mora o custo. */
      effort: "low",
    },
    messages: [{ role: "user", content: conteudo }],
  });

  const { input_tokens: entrada, output_tokens: saida } = resposta.usage;
  const custo_usd = (entrada / 1e6) * USD_ENTRADA_MTOK + (saida / 1e6) * USD_SAIDA_MTOK;

  /* `parsed_output` vem null quando a validação falha. Com formato imposto
     isso é raro, mas raro não é nunca, e um null silencioso viraria "zero
     produtos lidos" sem explicação na tela. */
  if (!resposta.parsed_output) {
    throw new Error("O modelo respondeu fora do esquema. Tente ler o catálogo de novo.");
  }

  return { itens: resposta.parsed_output.itens, custo_usd };
}
