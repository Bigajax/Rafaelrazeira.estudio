/* ============================================================
   /api/producao/colher — busca o perfil e as fotos de uma loja

   POST { loja_id } e a rota faz o ciclo inteiro: marca a loja como
   "colhendo" (é o que a tela lê para mostrar a régua correndo), consulta a
   Business Discovery, baixa cada imagem para o Storage e grava os ativos.

   POR QUE UMA ROTA E NÃO UMA SERVER ACTION: baixar sessenta imagens leva de
   trinta segundos a dois minutos, e uma action seguraria o `useTransition`
   de quem clicou por esse tempo inteiro. Como rota, o botão atira e a tela
   se atualiza quando a colheita termina. É o mesmo desenho da pesquisa do
   CRM, pelo mesmo motivo.

   SEGURANÇA: cliente do servidor com a chave anônima e a sessão do cookie,
   então o RLS só deixa a rota ler e escrever loja do dono logado. Sem
   sessão, 401 antes de qualquer coisa.
   ============================================================ */

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { colherLinkDaBio } from "@/lib/crm/pesquisa";
import { clienteServidor, usuarioAtual } from "@/lib/crm/supabase";
import { baixarImagem, colher, extensaoDe } from "@/lib/producao/instagram";
import { acharLugar, cidadeDaBio } from "@/lib/producao/places";
import type { Loja } from "@/lib/producao/tipos";

/* Uma consulta rápida e depois até oitenta downloads sequenciais. O teto de
   cinco minutos é folga, não expectativa. */
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

  /* Duas colheitas do mesmo arroba ao mesmo tempo gastariam duas das 200
     consultas por hora pelo mesmo material. A trava é o próprio status, com
     validade: uma colheita "colhendo" há mais de cinco minutos é uma
     colheita que morreu no meio (deploy, função derrubada), e aí a próxima
     passa. Mesma regra da pesquisa do CRM. */
  if (loja.status === "colhendo") {
    const ha = Date.now() - new Date(loja.colhido_em ?? loja.criado_em).getTime();
    if (ha < 5 * 60 * 1000) {
      return NextResponse.json({ erro: "Esta colheita já está rodando." }, { status: 409 });
    }
  }

  await supabase
    .from("prod_lojas")
    .update({ status: "colhendo", nota: null, colhido_em: new Date().toISOString() })
    .eq("id", loja.id);
  revalidatePath("/crm/producao", "layout");

  try {
    const { perfil, midias } = await colher(loja.arroba);

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
        owner_id: usuario.id,
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
    revalidatePath("/crm/producao", "layout");

    return NextResponse.json({ ok: true, novas, falhas });
  } catch (e) {
    /* A frase do erro vai para a coluna `nota` e aparece na tela. As
       mensagens que importam (token vencido, perfil pessoal) já saem
       escritas em português de lib/producao/instagram.ts, então aqui é só
       transporte. */
    const frase = e instanceof Error ? e.message : "A colheita falhou.";
    await supabase.from("prod_lojas").update({ status: "erro", nota: frase }).eq("id", loja.id);
    revalidatePath("/crm/producao", "layout");
    return NextResponse.json({ erro: frase }, { status: 500 });
  }
}
