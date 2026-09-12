/* ============================================================
   AS CONSULTAS DA OFICINA

   Mesma disciplina do CRM (lib/crm/dados.ts): nenhuma tela monta consulta
   própria. Todas rodam no servidor, com a sessão do cookie, e o RLS filtra
   por dono em toda linha.
   ============================================================ */

import { clienteServidor, SUPABASE_URL } from "@/lib/crm/supabase";
import type { Ativo, Loja, Produto, VersaoPrompt } from "./tipos";

/* O bucket é público para leitura (ver a nota no producao.sql), então a URL
   é montada, não assinada. Uma URL assinada venceria no meio da revisão e
   deixaria a tabela cheia de imagem quebrada, que é exatamente o problema
   que baixar do Instagram veio resolver. */
export function urlDoAtivo(caminho: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/producao/${caminho}`;
}

/* `revisados` entra na lista porque a régua de produção precisa dele: a
   etapa "conferida" é a única que o banco não sabe sozinho (ela é todo
   produto revisado), e sem esse número a régua da lista discordaria da
   régua da ficha. */
export type LojaNaLista = Loja & {
  produtos: number;
  imagens: number;
  revisados: number;
  /* Dias desde a última colheita, calculados AQUI e não na tela. Duas
     razões: a lista é componente de navegador e um `Date.now()` no render
     daria hidratação divergente (o servidor renderiza num instante e o
     navegador em outro); e material velho é decisão de oficina, não
     enfeite: uma loja colhida há três semanas provavelmente postou coisa
     nova, e quem abre a bancada precisa ver isso antes de escolher. */
  colhidoHa: number | null;
};

export async function listarLojas(): Promise<LojaNaLista[]> {
  const supabase = await clienteServidor();

  /* Três consultas e não um join com contagem: o PostgREST devolve
     `count` agregado só com sintaxe de embed, e embed aqui traria as
     linhas inteiras de produto e ativo de todas as lojas para contar no
     cliente. Duas listas de ids são mais baratas que isso e mais fáceis de
     ler daqui a seis meses. */
  const [{ data: lojas }, { data: produtos }, { data: ativos }] = await Promise.all([
    supabase.from("prod_lojas").select("*").order("criado_em", { ascending: false }),
    supabase.from("prod_produtos").select("loja_id,revisado"),
    supabase.from("prod_ativos").select("loja_id,tipo"),
  ]);

  const conta = (linhas: { loja_id: string }[] | null) => {
    const m = new Map<string, number>();
    for (const l of linhas ?? []) m.set(l.loja_id, (m.get(l.loja_id) ?? 0) + 1);
    return m;
  };
  const todos = (produtos as { loja_id: string; revisado: boolean }[]) ?? [];
  const nProdutos = conta(todos);
  const nRevisados = conta(todos.filter((x) => x.revisado));
  /* O material que o cliente mandou não é foto colhida: contá-lo aqui
     faria a ficha dizer que a loja tem sessenta fotos quando três são o
     logo. */
  const nAtivos = conta(((ativos as { loja_id: string; tipo: string | null }[]) ?? []).filter((a) => a.tipo !== "MATERIAL"));

  return ((lojas as Loja[]) ?? []).map((l) => ({
    ...l,
    produtos: nProdutos.get(l.id) ?? 0,
    imagens: nAtivos.get(l.id) ?? 0,
    revisados: nRevisados.get(l.id) ?? 0,
    colhidoHa: l.colhido_em
      ? Math.floor((Date.now() - new Date(l.colhido_em).getTime()) / 86400000)
      : null,
  }));
}

export async function lojaCompleta(
  id: string,
): Promise<{ loja: Loja; ativos: Ativo[]; produtos: Produto[]; versoes: VersaoPrompt[] } | null> {
  const supabase = await clienteServidor();

  const { data: loja } = await supabase.from("prod_lojas").select("*").eq("id", id).single<Loja>();
  if (!loja) return null;

  /* O markdown NÃO entra nesta consulta. A ficha desenha cinco linhas de
     data, e cada compilado passa de vinte mil caracteres: trazer os cinco
     seria carregar cem mil caracteres para escrever cinco datas. O texto vem
     por `buscarPrompt` quando você clica em copiar. */
  const [{ data: ativos }, { data: produtos }, { data: versoes }] = await Promise.all([
    supabase.from("prod_ativos").select("*").eq("loja_id", id).order("ordem"),
    supabase.from("prod_produtos").select("*").eq("loja_id", id).order("ordem"),
    supabase
      .from("prod_prompts")
      .select("id,criado_em,modo")
      .eq("loja_id", id)
      .order("criado_em", { ascending: false })
      .limit(5),
  ]);

  return {
    loja,
    ativos: (ativos as Ativo[]) ?? [],
    produtos: (produtos as Produto[]) ?? [],
    versoes: (versoes as VersaoPrompt[]) ?? [],
  };
}

/* Os leads que ainda não viraram loja, para o campo de vínculo do formulário
   de nova loja. Só os ativos: oferecer um lead perdido de abril na hora de
   abrir uma prévia é ruído. */
export async function leadsParaVincular(): Promise<{ id: string; nome: string; empresa: string | null; instagram: string | null }[]> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("crm_leads")
    .select("id,nome,empresa,instagram,estagio")
    .not("estagio", "in", '("ganho","perdido")')
    .order("criado_em", { ascending: false })
    .limit(80);

  return ((data as { id: string; nome: string; empresa: string | null; instagram: string | null }[]) ?? []).map(
    ({ id, nome, empresa, instagram }) => ({ id, nome, empresa, instagram }),
  );
}
