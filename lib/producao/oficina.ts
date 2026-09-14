/* ============================================================
   OS DOIS CICLOS DA OFICINA, SEM SABER QUEM CHAMOU

   Colher (perfil, Google Places, link da bio, fotos para o Storage) e ler
   o catálogo (as fotos viram produtos) moravam dentro das rotas de
   /api/producao. Saíram de lá porque passaram a ter DOIS chamadores: a
   tela do CRM, com a sessão do cookie e o RLS filtrando por dono, e a
   linha de comando (scripts/colher-loja.ts, scripts/ler-catalogo.ts), com
   a service role e o CRM_OWNER_ID, para o dia em que um lead responde
   "sim" no WhatsApp e a colheita precisa sair sem abrir o painel.

   Por isso as funções recebem o cliente e o dono em vez de criá-los: quem
   chama decide a chave, e o ciclo é um só. Nenhuma delas revalida cache
   nem devolve resposta HTTP; isso continua sendo assunto da rota.
   ============================================================ */

import type { SupabaseClient } from "@supabase/supabase-js";
import { colherLinkDaBio } from "@/lib/crm/pesquisa";
import { lerCatalogo } from "./catalogo";
import { baixarImagem, colher, extensaoDe } from "./instagram";
import { acharLugar, cidadeDaBio } from "./places";
import type { Ativo, Loja } from "./tipos";

/* O bucket é público para leitura (ver a nota no producao.sql), então a
   URL é montada, não assinada. Uma URL assinada venceria no meio da
   revisão e deixaria a tabela cheia de imagem quebrada, que é exatamente
   o problema que baixar do Instagram veio resolver.

   Mora aqui, e não em dados.ts, porque dados.ts importa `next/headers` e a
   linha de comando não tem isso. A URL base aceita as duas variáveis
   porque o servidor do site só conhece SUPABASE_URL e o CRM só a pública. */
export function urlDoAtivo(caminho: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  return `${base}/storage/v1/object/public/producao/${caminho}`;
}

export type Passo = (mensagem: string) => void;

/* Duas colheitas do mesmo arroba ao mesmo tempo gastariam duas das 200
   consultas por hora pelo mesmo material. A trava é o próprio status, com
   validade: uma colheita "colhendo" há mais de cinco minutos é uma
   colheita que morreu no meio (deploy, função derrubada), e aí a próxima
   passa. Mesma regra da pesquisa do CRM. */
export function colheitaEmCurso(loja: Loja): boolean {
  if (loja.status !== "colhendo") return false;
  const ha = Date.now() - new Date(loja.colhido_em ?? loja.criado_em).getTime();
  return ha < 5 * 60 * 1000;
}

export async function colherLoja(
  supabase: SupabaseClient,
  loja: Loja,
  dono: string,
  passo: Passo = () => {},
): Promise<{ novas: number; falhas: number; nota: string }> {
  await supabase
    .from("prod_lojas")
    .update({ status: "colhendo", nota: null, colhido_em: new Date().toISOString() })
    .eq("id", loja.id);

  try {
    const { perfil, midias } = await colher(loja.arroba);
    passo(
      `Perfil: ${perfil.nome} · ${perfil.seguidores} seguidores · ${perfil.publicacoes} publicações · ${midias.length} mídias`,
    );

    /* O perfil entra primeiro e sozinho: se o download das imagens falhar
       no meio, bio, site e seguidores já estão gravados e a tela tem o que
       mostrar.

       A loja física entra junto com o perfil, e não numa segunda etapa com
       botão próprio: é uma consulta só, ela é barata, e o que ela traz
       (endereço, horário e a nota do Google) é justamente o que a vitrine
       não tem como inventar. Loja que só existe no Instagram devolve null,
       e isso é normal: o bloco fica vazio e a seção não entra na página. */
    const lugar = await acharLugar(perfil.nome || loja.arroba, cidadeDaBio(perfil.bio), loja.arroba);

    /* ---------- o que a loja já publica hoje ----------
       Quando existe linktree ou um site antigo no link da bio, é ali que
       costumam estar a tabela de preços, as condições de entrega e às
       vezes o catálogo inteiro: é a única fonte de PREÇO que não depende
       de perguntar ao cliente. O CRM já sabe ler esse link desde 17/08.

       Falha aqui não é erro: link morto, site que exige javascript e
       loja sem link nenhum são o caso comum, e todos devolvem null. */
    const link_bio = perfil.site ? await colherLinkDaBio(perfil.site) : null;

    await supabase
      .from("prod_lojas")
      .update({
        nome: perfil.nome,
        bio: perfil.bio,
        site: perfil.site,
        seguidores: perfil.seguidores,
        publicacoes: perfil.publicacoes,
        avatar: perfil.avatar,
        ...(lugar ? { lugar } : {}),
        ...(link_bio ? { link_bio } : {}),
      })
      .eq("id", loja.id);

    /* O que já está no Storage não é baixado de novo. Recolher uma loja
       três meses depois é o caso comum (a marca postou coisa nova), e
       rebaixar oitenta imagens que não mudaram seria pagar tempo e banda
       pelo mesmo arquivo. */
    const { data: jaTem } = await supabase
      .from("prod_ativos")
      .select("media_id")
      .eq("loja_id", loja.id);
    const conhecidos = new Set(((jaTem as { media_id: string }[]) ?? []).map((a) => a.media_id));

    let novas = 0;
    let atualizadas = 0;
    let falhas = 0;

    for (const midia of midias) {
      /* ---------- o que muda numa foto que já está aqui ----------
         A imagem não muda: ela já foi baixada e não vale a banda de baixar
         de novo. Mas curtidas, comentários e legenda MUDAM com o tempo, e
         é justamente o engajamento que decide a ordem da vitrine.

         Sem este bloco, a coluna de curtidas nasceria vazia para toda loja
         colhida antes de ela existir, e só encheria para lojas novas: a
         recolheita pularia as cinquenta e sete fotos da Kanton em silêncio
         e a ordem continuaria sendo a do feed. */
      if (conhecidos.has(midia.media_id)) {
        const { error } = await supabase
          .from("prod_ativos")
          .update({
            curtidas: midia.curtidas,
            comentarios: midia.comentarios,
            legenda: midia.legenda,
          })
          .eq("loja_id", loja.id)
          .eq("media_id", midia.media_id);
        if (!error) atualizadas++;
        continue;
      }

      const arquivo = await baixarImagem(midia.url);
      /* Uma imagem que não veio não derruba a colheita: ela vira uma linha
         a menos e o contador de falhas na nota. O contrário (abortar tudo
         na primeira falha) já deixaria você sem catálogo por causa de um
         reel antigo com thumbnail quebrado. */
      if (!arquivo) {
        falhas++;
        continue;
      }

      const caminho = `${loja.id}/${midia.media_id}.${extensaoDe(arquivo.tipo)}`;
      const { error: erroUpload } = await supabase.storage
        .from("producao")
        .upload(caminho, arquivo.bytes, { contentType: arquivo.tipo, upsert: true });
      if (erroUpload) {
        falhas++;
        continue;
      }

      const { error: erroLinha } = await supabase.from("prod_ativos").insert({
        owner_id: dono,
        loja_id: loja.id,
        media_id: midia.media_id,
        ordem: midia.ordem,
        tipo: midia.tipo,
        caminho,
        legenda: midia.legenda,
        permalink: midia.permalink,
        publicado_em: midia.publicado_em,
        curtidas: midia.curtidas,
        comentarios: midia.comentarios,
      });
      if (erroLinha) {
        falhas++;
        continue;
      }
      novas++;
      if (novas % 10 === 0) passo(`${novas} imagens baixadas...`);
    }

    const nota =
      (novas === 0 && conhecidos.size > 0
        ? "Nada novo desde a última colheita."
        : `${novas} imagens novas${falhas ? `, ${falhas} não vieram` : ""}.`) +
      (atualizadas ? ` ${atualizadas} tiveram curtidas atualizadas.` : "") +
      (lugar ? ` Loja achada no Google${lugar.nota ? ` (${lugar.nota} ★)` : ""}.` : "");

    await supabase
      .from("prod_lojas")
      .update({ status: "colhida", nota, colhido_em: new Date().toISOString() })
      .eq("id", loja.id);

    return { novas, falhas, nota };
  } catch (e) {
    /* A frase do erro vai para a coluna `nota` e aparece na tela. As
       mensagens que importam (token vencido, perfil pessoal) já saem
       escritas em português de lib/producao/instagram.ts, então aqui é só
       transporte. */
    const frase = e instanceof Error ? e.message : "A colheita falhou.";
    await supabase.from("prod_lojas").update({ status: "erro", nota: frase }).eq("id", loja.id);
    throw e;
  }
}

/* O QUE ESTA LEITURA NUNCA FAZ: apagar produto que você marcou como
   revisado. Reler o catálogo é uma coisa que se faz duas ou três vezes (a
   primeira leitura sai torta, você corrige o prompt mentalmente e manda de
   novo), e uma releitura que atropela a revisão transforma trinta minutos
   de conferência em lixo. Revisado fica; o resto é substituído. */
export async function lerCatalogoDaLoja(
  supabase: SupabaseClient,
  loja: Loja,
  dono: string,
): Promise<{ produtos: number; custo_usd: number; nota: string }> {
  const { data: ativosCrus } = await supabase
    .from("prod_ativos")
    .select("*")
    .eq("loja_id", loja.id)
    .order("ordem");
  /* Logo e print de tabela não são peça à venda: o material fica fora da
     leitura, senão o logo da loja vira produto no catálogo. */
  const ativos = ((ativosCrus as Ativo[]) ?? []).filter((a) => a.tipo !== "MATERIAL");
  if (!ativos.length) throw new Error("Colha as imagens antes de ler o catálogo.");

  try {
    /* A URL pública vai junto: é ela que o modelo abre para OLHAR a peça.
       O bucket é público de leitura justamente para isto (e para o canvas
       da paleta), então não há link assinado para vencer no meio. */
    const { produtos, custo_usd, via } = await lerCatalogo(
      ativos.map((a) => ({
        media_id: a.media_id,
        legenda: a.legenda,
        url: urlDoAtivo(a.caminho),
      })),
    );

    /* A revisão é o que sobrevive a uma releitura. Guardo os `ativo_id` já
       revisados para não recriar produto em cima deles, e apago só o que
       ninguém conferiu. */
    const { data: revisados } = await supabase
      .from("prod_produtos")
      .select("ativo_id")
      .eq("loja_id", loja.id)
      .eq("revisado", true);
    const protegidos = new Set(
      ((revisados as { ativo_id: string | null }[]) ?? []).map((p) => p.ativo_id).filter(Boolean) as string[],
    );

    await supabase.from("prod_produtos").delete().eq("loja_id", loja.id).eq("revisado", false);

    const porMedia = new Map(ativos.map((a) => [a.media_id, a]));

    /* ---------- a ordem da vitrine é a ordem do público ----------
       Até aqui o catálogo saía na ordem do feed, que é a ordem em que a
       loja postou. Isso é a agenda dela, não o interesse de quem compra.
       As curtidas dizem qual peça a audiência DESTA loja já validou, e
       elas vêm de graça na mesma chamada da colheita: a vitrine passa a
       abrir pela peça de trezentas curtidas, não pelo post de ontem.

       Post sem número (curtidas nulas) vai para o fim, e não para o
       começo: desconhecido não pode ganhar de medido. Empate mantém a
       cronologia, que é o desempate mais previsível para quem revisa.

       ---------- O PISO, e por que ele existe ----------
       A Kanton, no primeiro teste com números reais, tem 930 seguidores e
       um topo de OITO curtidas: 8, 5, 3, 2, 1, 1, 1, 1. Ordenar por isso
       não é ordenar por interesse, é ordenar por ruído, e o resultado
       pareceria escolha quando é sorteio.

       Abaixo do piso a cronologia fica: o feed é uma ordem que a dona da
       loja reconhece e sabe explicar, e uma ordem explicável vale mais que
       uma ordem aleatória com cara de dado. */
    const TOPO_MINIMO = 10;
    const maior = Math.max(0, ...ativos.map((a) => a.curtidas ?? 0));
    const porEngajamento = maior >= TOPO_MINIMO;

    const ranking = [...ativos].sort((a, b) => {
      if (!porEngajamento) return a.ordem - b.ordem;
      const ca = a.curtidas ?? -1;
      const cb = b.curtidas ?? -1;
      return cb - ca || a.ordem - b.ordem;
    });
    const posicao = new Map(ranking.map((a, i) => [a.id, i]));

    /* ---------- juntar o carrossel numa peça só ----------
       O modelo aponta, em `mesma_peca_que`, qual foto mostra a MESMA peça
       de outra. Aqui isso vira: a primeira aparição é o produto, e as
       outras entram como fotos extras dele.

       O `while` segue a corrente até o começo porque a foto 3 costuma
       apontar para a 2, que aponta para a 1: sem seguir, a 3 viraria um
       produto solto pendurado numa foto que também não é produto. O teto
       de passos existe porque um modelo pode devolver um ciclo (A aponta
       B, B aponta A), e ciclo em loop trava a rota inteira. */
    const donoDaPeca = new Map<string, string>();
    for (const lido of produtos) {
      let alvo = lido.mesma_peca_que ?? null;
      let passos = 0;
      while (alvo && passos++ < 8) {
        const acima = produtos.find((x) => x.media_id === alvo);
        if (!acima?.mesma_peca_que || acima.mesma_peca_que === lido.media_id) break;
        alvo = acima.mesma_peca_que;
      }
      if (alvo && alvo !== lido.media_id) donoDaPeca.set(lido.media_id, alvo);
    }

    const extrasPorDono = new Map<string, string[]>();
    for (const [filho, donoDoFilho] of donoDaPeca) {
      const ativoFilho = porMedia.get(filho);
      if (!ativoFilho) continue;
      extrasPorDono.set(donoDoFilho, [...(extrasPorDono.get(donoDoFilho) ?? []), ativoFilho.id]);
    }

    const linhas = [];
    for (const lido of produtos) {
      if (lido.descartar) continue;
      /* Foto que é outro ângulo não vira produto: ela já foi para as fotos
         extras do dono, logo acima. */
      if (donoDaPeca.has(lido.media_id)) continue;
      const ativo = porMedia.get(lido.media_id);
      if (!ativo || protegidos.has(ativo.id)) continue;
      /* Sem nome não é produto: é uma legenda que o modelo não entendeu, e
         uma linha chamada "null" na tabela custa mais atenção do que vale. */
      const nome = (lido.nome || "").trim();
      if (!nome) continue;

      linhas.push({
        owner_id: dono,
        loja_id: loja.id,
        ativo_id: ativo.id,
        ordem: posicao.get(ativo.id) ?? ativo.ordem,
        nome,
        marca: lido.marca ?? null,
        cor: lido.cor ?? null,
        fotos_extras: extrasPorDono.get(lido.media_id) ?? null,
        preco: lido.preco ?? null,
        preco_de: lido.preco_de ?? null,
        tamanhos: lido.tamanhos ?? null,
        categoria: lido.categoria ?? null,
        descricao: lido.descricao ?? null,
        revisado: false,
      });
    }

    if (linhas.length) {
      const { error } = await supabase.from("prod_produtos").insert(linhas);
      if (error) throw new Error(error.message);
    }

    /* O custo aparece na tela porque ele é a coisa que some da consciência
       primeiro. Quatro centavos por loja é barato; quarenta releituras num
       dia é uma conta que ninguém viu crescer. */
    const centavos = Math.round((custo_usd || 0) * 100);
    /* Quem leu vai na nota junto com o custo. Os dois transportes acertam
       coisas diferentes (a Anthropic com esquema imposto, o OpenRouter com
       JSON pedido em prosa), e no dia em que um catálogo sair torto a
       primeira pergunta vai ser por onde ele passou. */
    const juntadas = donoDaPeca.size;
    const ordemUsada = porEngajamento
      ? " Ordem por curtidas."
      : " Engajamento baixo demais para ordenar: ficou a ordem do feed.";
    const nota =
      `${linhas.length} produtos lidos por ${via === "anthropic" ? "Claude" : "OpenRouter"}${
        centavos ? ` · US$ ${(centavos / 100).toFixed(2)}` : ""
      }.` +
      ordemUsada +
      (juntadas ? ` ${juntadas} fotos viraram ângulo extra.` : "");

    await supabase.from("prod_lojas").update({ status: "catalogo", nota }).eq("id", loja.id);

    return { produtos: linhas.length, custo_usd, nota };
  } catch (e) {
    const frase = e instanceof Error ? e.message : "A leitura do catálogo falhou.";
    await supabase.from("prod_lojas").update({ nota: frase }).eq("id", loja.id);
    throw e;
  }
}
