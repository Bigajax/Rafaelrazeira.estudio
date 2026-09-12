/* ============================================================
   /api/producao/catalogo — as legendas colhidas viram produtos

   POST { loja_id }. Roda depois da colheita: lê as legendas dos ativos, faz
   o modelo extrair nome, preço, tamanho e categoria, e grava a tabela de
   produtos.

   O QUE ESTA ROTA NUNCA FAZ: apagar produto que você marcou como revisado.
   Reler o catálogo é uma coisa que se faz duas ou três vezes (a primeira
   leitura sai torta, você corrige o prompt mentalmente e manda de novo), e
   uma releitura que atropela a revisão transforma trinta minutos de
   conferência em lixo. Revisado fica; o resto é substituído.

   Como a pesquisa do CRM, é rota e não action: sessenta legendas levam de
   vinte segundos a um minuto e meio.
   ============================================================ */

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { clienteServidor, usuarioAtual } from "@/lib/crm/supabase";
import { lerCatalogo } from "@/lib/producao/catalogo";
import { urlDoAtivo } from "@/lib/producao/dados";
import type { Ativo, Loja } from "@/lib/producao/tipos";

export const maxDuration = 300;

export async function POST(pedido: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ erro: "Sem sessão." }, { status: 401 });

  let loja_id = "";
  try {
    const corpo = (await pedido.json()) as { loja_id?: string };
    loja_id = String(corpo.loja_id || "");
  } catch {
    /* corpo ausente ou inválido: cai no 400 abaixo */
  }
  if (!loja_id) return NextResponse.json({ erro: "Faltou o loja_id." }, { status: 400 });

  const supabase = await clienteServidor();
  const { data: loja } = await supabase.from("prod_lojas").select("*").eq("id", loja_id).single<Loja>();
  if (!loja) return NextResponse.json({ erro: "Loja não encontrada." }, { status: 404 });

  const { data: ativosCrus } = await supabase
    .from("prod_ativos")
    .select("*")
    .eq("loja_id", loja.id)
    .order("ordem");
  /* Logo e print de tabela não são peça à venda: o material fica fora da
     leitura, senão o logo da loja vira produto no catálogo. */
  const ativos = ((ativosCrus as Ativo[]) ?? []).filter((a) => a.tipo !== "MATERIAL");
  if (!ativos.length) {
    return NextResponse.json({ erro: "Colha as imagens antes de ler o catálogo." }, { status: 409 });
  }

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
    for (const [filho, dono] of donoDaPeca) {
      const ativoFilho = porMedia.get(filho);
      if (!ativoFilho) continue;
      extrasPorDono.set(dono, [...(extrasPorDono.get(dono) ?? []), ativoFilho.id]);
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
        owner_id: usuario.id,
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
    const nota = `${linhas.length} produtos lidos por ${via === "anthropic" ? "Claude" : "OpenRouter"}${
      centavos ? ` · US$ ${(centavos / 100).toFixed(2)}` : ""
    }.` + ordemUsada + (juntadas ? ` ${juntadas} fotos viraram ângulo extra.` : "");

    await supabase.from("prod_lojas").update({ status: "catalogo", nota }).eq("id", loja.id);
    revalidatePath("/crm/producao", "layout");

    return NextResponse.json({ ok: true, produtos: linhas.length, custo_usd });
  } catch (e) {
    const frase = e instanceof Error ? e.message : "A leitura do catálogo falhou.";
    await supabase.from("prod_lojas").update({ nota: frase }).eq("id", loja.id);
    revalidatePath("/crm/producao", "layout");
    return NextResponse.json({ erro: frase }, { status: 500 });
  }
}
