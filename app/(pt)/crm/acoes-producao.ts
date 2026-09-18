"use server";

/* ============================================================
   AS AÇÕES DA OFICINA — tudo que escreve à mão passa por aqui

   As duas coisas caras (colher o Instagram e ler o catálogo) são rotas de
   API, porque demoram minutos. O que sobra é escrita curta: criar a loja,
   corrigir um produto, salvar a ficha da marca. Isso é server action, pelo
   mesmo motivo do CRM: regra de negócio conferida só no navegador é
   sugestão.

   Contrato de retorno igual ao de app/crm/acoes.ts:

     { ok: true }              gravou
     { ok: false, erro: "…" }  não gravou, e a frase é para aparecer na tela
   ============================================================ */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clienteServidor, usuarioAtual } from "@/lib/crm/supabase";
import { casarPrecos } from "@/lib/producao/precos";
import { FORMA_VAZIA, type Forma } from "@/lib/producao/forma";
import {
  normalizarArroba,
  type Conceito,
  type Condicoes,
  type Identidade,
  type Produto,
} from "@/lib/producao/tipos";

export type Feito = { ok: true } | { ok: false; erro: string };

/* A oficina inteira é derivada das mesmas três tabelas, e qualquer escrita
   muda pelo menos duas telas (corrigir um produto muda a ficha da loja E o
   contador da lista). Revalidar a árvore é mais barato que manter a lista
   de quem depende de quem, que seria a primeira coisa a desatualizar. */
function atualizar() {
  revalidatePath("/crm/producao", "layout");
}

async function sessao() {
  const usuario = await usuarioAtual();
  if (!usuario) return null;
  return { usuario, supabase: await clienteServidor() };
}

/* ---------- criar ----------
   Só o arroba é obrigatório, e ele é normalizado antes de tudo: colar a URL
   do perfil é o jeito mais rápido de trazer o endereço do Instagram, e
   exigir que você limpe a mão é atrito à toa. O vínculo com o lead é
   opcional porque nem toda loja desenhada veio do funil. */
export async function criarLoja(form: FormData): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  const arroba = normalizarArroba(String(form.get("arroba") || ""));
  if (!arroba) return { ok: false, erro: "Escreva o arroba da loja." };

  const lead_id = String(form.get("lead_id") || "") || null;

  const { data, error } = await s.supabase
    .from("prod_lojas")
    .insert({ owner_id: s.usuario.id, arroba, lead_id })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    /* 23505 é o índice único do arroba. Não é erro do seu ponto de vista: é
       a loja que já existe, e o certo é levar você até ela em vez de pedir
       para digitar outro nome. */
    if (error.code === "23505") {
      const { data: existente } = await s.supabase
        .from("prod_lojas")
        .select("id")
        .eq("arroba", arroba)
        .single<{ id: string }>();
      if (existente) {
        atualizar();
        redirect(`/crm/producao/${existente.id}`);
      }
      return { ok: false, erro: `@${arroba} já está na oficina.` };
    }
    return { ok: false, erro: error.message };
  }

  atualizar();
  redirect(`/crm/producao/${data.id}`);
}

export async function apagarLoja(id: string): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  /* As imagens do Storage não caem junto com a linha: o `on delete cascade`
     do Postgres não alcança o bucket. Sem esta faxina, apagar uma loja
     deixaria oitenta arquivos órfãos que ninguém mais consegue listar,
     porque a lista deles morava na tabela que acabou de sumir. */
  const { data: ativos } = await s.supabase.from("prod_ativos").select("caminho").eq("loja_id", id);
  const caminhos = ((ativos as { caminho: string }[]) ?? []).map((a) => a.caminho);
  if (caminhos.length) await s.supabase.storage.from("producao").remove(caminhos);

  const { error } = await s.supabase.from("prod_lojas").delete().eq("id", id);
  if (error) return { ok: false, erro: error.message };

  atualizar();
  return { ok: true };
}

/* ---------- o produto ----------
   Uma ação só para qualquer campo, e o campo chega pelo nome. A alternativa
   (uma ação por coluna) daria oito funções idênticas; a lista de permitidos
   é o que impede isso de virar um update aberto onde a tela escolhe a
   coluna. */
const CAMPOS = [
  "nome", "marca", "cor", "preco", "preco_de", "tamanhos", "categoria", "descricao", "revisado", "ordem",
] as const;
type Campo = (typeof CAMPOS)[number];

export async function salvarProduto(
  id: string,
  campo: Campo,
  valor: string | number | boolean | null,
): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  if (!CAMPOS.includes(campo)) return { ok: false, erro: "Campo desconhecido." };

  if (campo === "nome" && !String(valor || "").trim()) {
    return { ok: false, erro: "O produto precisa de nome." };
  }

  const { error } = await s.supabase
    .from("prod_produtos")
    .update({ [campo]: valor })
    .eq("id", id);
  if (error) return { ok: false, erro: error.message };

  atualizar();
  return { ok: true };
}

/* ---------- o material que o cliente manda ----------
   Entra na mesma tabela dos posts, com tipo MATERIAL, porque `prod_ativos`
   já é "toda imagem desta loja" e já tem a faxina do Storage amarrada. A
   ordem começa em 1000 para o logo nunca disputar as primeiras posições
   com as peças (a paleta lê as doze primeiras fotos). */
const ORDEM_MATERIAL = 1000;

export async function subirMaterial(loja_id: string, dados: FormData): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  const arquivo = dados.get("arquivo");
  if (!(arquivo instanceof File) || !arquivo.size) return { ok: false, erro: "Escolha um arquivo." };
  if (!arquivo.type.startsWith("image/")) return { ok: false, erro: "Por enquanto só imagem." };
  /* Dez megabytes cobre foto de celular e print de tabela com folga, e
     segura o dedo pesado que tenta subir um vídeo de trinta segundos. */
  if (arquivo.size > 10 * 1024 * 1024) return { ok: false, erro: "Imagem grande demais (máximo 10 MB)." };

  const { data: ultimo } = await s.supabase
    .from("prod_ativos")
    .select("ordem")
    .eq("loja_id", loja_id)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle<{ ordem: number }>();

  const ordem = Math.max(ORDEM_MATERIAL, (ultimo?.ordem ?? 0) + 1);
  /* O nome do arquivo não vai para o caminho: acento, espaço e parêntese
     de "WhatsApp Image (1).jpeg" já quebraram upload em bucket antes. O
     media_id guarda a origem, o caminho é limpo. */
  const marca = `material_${ordem}`;
  const extensao = arquivo.type.includes("png") ? "png" : arquivo.type.includes("webp") ? "webp" : "jpg";
  const caminho = `${loja_id}/${marca}.${extensao}`;

  const { error: erroUpload } = await s.supabase.storage
    .from("producao")
    .upload(caminho, arquivo, { contentType: arquivo.type, upsert: true });
  if (erroUpload) return { ok: false, erro: erroUpload.message };

  const { error } = await s.supabase.from("prod_ativos").insert({
    owner_id: s.usuario.id,
    loja_id,
    media_id: marca,
    ordem,
    tipo: "MATERIAL",
    caminho,
    legenda: arquivo.name,
  });
  if (error) return { ok: false, erro: error.message };

  atualizar();
  return { ok: true };
}

/* Apagar um ativo tira a linha E o arquivo: o `on delete cascade` do
   Postgres não alcança o bucket, e arquivo órfão em bucket ninguém acha
   depois. */
export async function apagarAtivo(id: string): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  const { data: ativo } = await s.supabase
    .from("prod_ativos")
    .select("caminho")
    .eq("id", id)
    .single<{ caminho: string }>();
  if (ativo) await s.supabase.storage.from("producao").remove([ativo.caminho]);

  const { error } = await s.supabase.from("prod_ativos").delete().eq("id", id);
  if (error) return { ok: false, erro: error.message };

  atualizar();
  return { ok: true };
}

export async function apagarProduto(id: string): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const { error } = await s.supabase.from("prod_produtos").delete().eq("id", id);
  if (error) return { ok: false, erro: error.message };
  atualizar();
  return { ok: true };
}

/* Um produto à mão, para a peça que só existe no story ou que o modelo
   descartou por engano. Entra no fim da lista e já nasce revisado: quem
   digitou foi você. */
export async function novoProduto(loja_id: string, ativo_id: string | null): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  const { data: ultimo } = await s.supabase
    .from("prod_produtos")
    .select("ordem")
    .eq("loja_id", loja_id)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle<{ ordem: number }>();

  const { error } = await s.supabase.from("prod_produtos").insert({
    owner_id: s.usuario.id,
    loja_id,
    ativo_id,
    ordem: (ultimo?.ordem ?? -1) + 1,
    nome: "Peça nova",
    revisado: true,
  });
  if (error) return { ok: false, erro: error.message };

  atualizar();
  return { ok: true };
}

/* ---------- a ficha da marca ----------
   Chega inteira e substitui inteira. A ficha é pequena e sempre editada na
   mesma tela; salvar campo a campo aqui só criaria a chance de meia ficha
   gravada. */
export async function salvarIdentidade(loja_id: string, identidade: Identidade): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  const { error } = await s.supabase.from("prod_lojas").update({ identidade }).eq("id", loja_id);
  if (error) return { ok: false, erro: error.message };

  atualizar();
  return { ok: true };
}

/* ---------- a tabela de preços colada da conversa ----------
   Devolve o resumo do que casou e do que sobrou, e a tela mostra os dois.
   Preço aplicado NÃO marca o produto como revisado: quem confere é você,
   olhando o par foto/preço na tabela, e é justamente o preço o campo em
   que um erro passa despercebido por mais tempo. */
export type Aplicados =
  | { ok: true; casados: number; orfas: string[]; ignoradas: number }
  | { ok: false; erro: string };

export async function aplicarPrecos(loja_id: string, texto: string): Promise<Aplicados> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  if (!texto.trim()) return { ok: false, erro: "Cole a lista de preços primeiro." };

  const { data } = await s.supabase
    .from("prod_produtos")
    .select("*")
    .eq("loja_id", loja_id)
    .order("ordem");
  const produtos = (data as Produto[]) ?? [];
  if (!produtos.length) return { ok: false, erro: "Leia o catálogo antes de colar os preços." };

  const { casados, orfas, ignoradas } = casarPrecos(texto, produtos);

  /* Um update por peça, e não um upsert em lote: são dezenas de linhas, o
     custo é irrelevante, e assim uma peça que falhar não leva as outras. */
  for (const c of casados) {
    await s.supabase.from("prod_produtos").update({ preco: c.preco }).eq("id", c.produto_id);
  }

  atualizar();
  return { ok: true, casados: casados.length, orfas, ignoradas };
}

/* As quatro respostas do cliente (entrega, pagamento, retirada, troca).
   Chega inteiro e substitui inteiro, como a ficha da marca: é um bloco
   pequeno, editado sempre na mesma tela, e salvar campo a campo só criaria
   a chance de meia resposta gravada. */
export async function salvarCondicoes(loja_id: string, condicoes: Condicoes): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  const { error } = await s.supabase.from("prod_lojas").update({ condicoes }).eq("id", loja_id);
  if (error) return { ok: false, erro: error.message };

  atualizar();
  return { ok: true };
}

/* O conceito da marca: personalidade, autoridade, público, promessa e o
   que evitar. Mesma regra dos outros blocos de ficha: chega inteiro e
   substitui inteiro. */
export async function salvarConceito(loja_id: string, conceito: Conceito): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  const { error } = await s.supabase.from("prod_lojas").update({ conceito }).eq("id", loja_id);
  if (error) return { ok: false, erro: error.message };

  atualizar();
  return { ok: true };
}

/* "Pronta" é uma afirmação sua, não um cálculo: o banco não tem como saber
   que você olhou as sessenta linhas. Por isso é um botão, e por isso ele
   exige que exista catálogo. */
export async function marcarPronta(loja_id: string): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  const { count } = await s.supabase
    .from("prod_produtos")
    .select("id", { count: "exact", head: true })
    .eq("loja_id", loja_id);
  if (!count) return { ok: false, erro: "Sem produto nenhum, não dá para marcar como pronta." };

  const { error } = await s.supabase
    .from("prod_lojas")
    .update({ status: "pronta", nota: `${count} produtos, revisada por você.` })
    .eq("id", loja_id);
  if (error) return { ok: false, erro: error.message };

  /* ---------- a oficina fechando o ciclo com o funil ----------
     A `prod_lojas` guarda o `lead_id` desde o primeiro dia e ninguém usava.
     Uma loja marcada como pronta é, no funil, exatamente a definição da
     etapa Prévia: `desenhei e mandei ver`. Mover à mão depois é o tipo de
     passo que se esquece justamente nos dias corridos.

     Só anda para FRENTE: um lead que já está em proposta, negociação ou
     ganho não volta para prévia porque você reexportou o catálogo. */
  const { data: loja } = await s.supabase
    .from("prod_lojas")
    .select("lead_id")
    .eq("id", loja_id)
    .single<{ lead_id: string | null }>();

  if (loja?.lead_id) {
    const { data: lead } = await s.supabase
      .from("crm_leads")
      .select("estagio")
      .eq("id", loja.lead_id)
      .single<{ estagio: string }>();
    const antes = ["lista", "contatado", "follow_up", "conversa"];
    if (lead && antes.includes(lead.estagio)) {
      await s.supabase.from("crm_leads").update({ estagio: "previa" }).eq("id", loja.lead_id);
      revalidatePath("/crm", "layout");
    }
  }

  atualizar();
  return { ok: true };
}

/* ---------- a forma ----------
   O que o catálogo exige da página: volume, tipo de foto, variação, preço,
   clique, categorias, esgotado e o arquétipo. Mesma regra dos outros blocos
   de ficha: chega inteira e substitui inteira. O `origem` de cada campo vai
   junto, e é ele que separa o que a máquina inferiu do que você confirmou:
   um mês depois, é a única forma de saber se aquele "sem preço" foi decisão
   ou omissão. */
export async function salvarForma(loja_id: string, forma: Forma): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  /* Uma chave do `origem` NÃO vem desta tela: `destaques` é escrita pelo
     CATÁLOGO, e o bloco FORMA carrega a forma inteira em estado local. Sem
     esta linha, estrelar uma peça e depois clicar em GUARDAR A FORMA
     desfaria a marca com um valor velho de outro bloco. */
  const { data: atual } = await s.supabase
    .from("prod_lojas")
    .select("forma")
    .eq("id", loja_id)
    .single<{ forma: Forma | null }>();
  const destaques = atual?.forma?.origem?.destaques;
  const comOrigem: Forma = destaques
    ? { ...forma, origem: { ...forma.origem, destaques } }
    : forma;

  const { error } = await s.supabase.from("prod_lojas").update({ forma: comOrigem }).eq("id", loja_id);
  if (error) return { ok: false, erro: error.message };

  atualizar();
  return { ok: true };
}

/* ---------- o prompt compilado ----------
   Guarda o markdown E o retrato da ficha no instante em que ele saiu. O
   markdown sozinho responde "o que eu mandei"; o snapshot responde "com
   quais decisões", que é a pergunta que aparece quando a vitrine ficou
   diferente do combinado e a ficha já mudou três vezes desde então.

   Gerar de novo não apaga o anterior. Versão é histórico, e histórico que
   se sobrescreve é só um campo. */
export async function guardarPrompt(
  loja_id: string,
  markdown: string,
  modo: "previa" | "completa" | "ajuste",
): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  const { data: loja } = await s.supabase
    .from("prod_lojas")
    .select("identidade,conceito,condicoes,forma,lugar,status")
    .eq("id", loja_id)
    .single();

  const { error } = await s.supabase.from("prod_prompts").insert({
    owner_id: s.usuario.id,
    loja_id,
    markdown,
    snapshot: loja ?? {},
    modo,
  });
  if (error) return { ok: false, erro: error.message };

  atualizar();
  return { ok: true };
}

/* O texto de UMA versão, buscado só quando você clica em copiar. A ficha
   carrega cinco datas, não cinco prompts: um compilado passa de vinte mil
   caracteres, e desenhar cinco linhas de data não precisa de nenhum deles. */
export async function buscarPrompt(
  id: string,
): Promise<{ ok: true; markdown: string } | { ok: false; erro: string }> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  const { data, error } = await s.supabase
    .from("prod_prompts")
    .select("markdown")
    .eq("id", id)
    .single<{ markdown: string }>();
  if (error || !data) return { ok: false, erro: "Essa versão não está mais lá." };

  return { ok: true, markdown: data.markdown };
}


/* ---------- as peças escolhidas ----------
   O compilador mandava usar "as de melhor foto", que não é instrução: quem
   lê pega as primeiras da lista. A estrela é você respondendo essa pergunta
   olhando as miniaturas, e ela decide o hero E as doze da prévia.

   Estrelar à mão CONFIRMA a seleção inteira: é o que apaga o tracejado que
   o botão de escolha automática deixou. */
export async function estrelar(loja_id: string, id: string, valor: boolean): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  /* Entra no fim da fila quando é marcada, e larga a posição quando sai:
     posição órfã de peça sem estrela reapareceria fora de ordem no dia em
     que ela fosse estrelada de novo. */
  let ordem_destaque: number | null = null;
  if (valor) {
    const { data: ultima } = await s.supabase
      .from("prod_produtos")
      .select("ordem_destaque")
      .eq("loja_id", loja_id)
      .eq("destaque", true)
      .order("ordem_destaque", { ascending: false })
      .limit(1)
      .maybeSingle<{ ordem_destaque: number | null }>();
    ordem_destaque = (ultima?.ordem_destaque ?? -1) + 1;
  }

  const { error } = await s.supabase
    .from("prod_produtos")
    .update({ destaque: valor, ordem_destaque })
    .eq("id", id);
  if (error) return { ok: false, erro: error.message };

  await marcarDestaques(s, loja_id, "confirmado");
  atualizar();
  return { ok: true };
}

/* A ordem da tira, que é a ordem do hero. Chega inteira, na ordem em que os
   cartões ficaram depois do arrasto. */
export async function ordenarDestaques(loja_id: string, ids: string[]): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  for (let i = 0; i < ids.length; i++) {
    await s.supabase.from("prod_produtos").update({ ordem_destaque: i }).eq("id", ids[i]);
  }

  await marcarDestaques(s, loja_id, "confirmado");
  atualizar();
  return { ok: true };
}

/* A pré-seleção da máquina. Os ids já chegam ORDENADOS pela tela, que é
   onde as imagens existem: resolução e ocupação da peça no quadro só se
   medem com a foto carregada, e isso é trabalho de navegador.

   Ela apaga as estrelas anteriores de propósito: é uma sugestão inteira,
   não um acréscimo, e misturar as duas deixaria você sem saber o que foi
   escolha sua. Por isso ela também volta a marcar a seleção como INFERIDA. */
export async function escolherSozinho(loja_id: string, ids: string[]): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  if (!ids.length) return { ok: false, erro: "Não consegui medir nenhuma foto." };

  await s.supabase
    .from("prod_produtos")
    .update({ destaque: false, ordem_destaque: null })
    .eq("loja_id", loja_id)
    .eq("destaque", true);

  for (let i = 0; i < ids.length; i++) {
    await s.supabase
      .from("prod_produtos")
      .update({ destaque: true, ordem_destaque: i })
      .eq("id", ids[i]);
  }

  await marcarDestaques(s, loja_id, "inferido");
  atualizar();
  return { ok: true };
}

/* De quem é a seleção, gravado no `origem` da forma. Não é uma coluna nova
   porque é um booleano, e o jsonb da forma já existe e já é exatamente o
   lugar onde esta ficha guarda "isto foi palpite ou decisão". */
async function marcarDestaques(
  s: { supabase: Awaited<ReturnType<typeof clienteServidor>> },
  loja_id: string,
  origem: "inferido" | "confirmado",
): Promise<void> {
  const { data } = await s.supabase
    .from("prod_lojas")
    .select("forma")
    .eq("id", loja_id)
    .single<{ forma: Forma | null }>();

  const forma: Forma = { ...FORMA_VAZIA, ...(data?.forma ?? {}) };
  forma.origem = { ...forma.origem, destaques: origem };
  await s.supabase.from("prod_lojas").update({ forma }).eq("id", loja_id);
}
