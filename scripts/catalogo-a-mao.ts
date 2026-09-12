/* ============================================================
   CATÁLOGO A MÃO — a leitura feita na conversa, sem gastar API

   A oficina lê o catálogo sozinha quando existe ANTHROPIC_API_KEY: ela
   manda cada foto para o modelo e recebe tipo da peça, marca e cor. Este
   script é o caminho para quando essa chave não existe (ou quando você
   simplesmente prefere assim): em vez de o servidor pagar a leitura, quem
   olha as fotos é o Claude que já está aberto na sua sessão de trabalho.

   Você não paga chamada nenhuma. O preço é que a leitura acontece com você
   presente, uma loja por vez.

   ---------- por que ele baixa as FOTOS, e não só as legendas ----------
   A primeira versão exportava um txt de legendas, porque a oficina lia
   legenda. O teste com a Kanton derrubou isso: 7 legendas em 57 fotos, e
   nenhuma com preço. Quem sabe o que a peça é, é a imagem. Então o export
   traz os arquivos para uma pasta local, com um índice que amarra cada
   arquivo ao `media_id` do banco.

   ---------- como se usa, nesta ordem ----------

   1) EXPORTAR o material de uma loja:

        npx tsx scripts/catalogo-a-mao.ts --exportar --loja usekanton

      Cria a pasta `catalogo-usekanton/` com as fotos numeradas, o
      `indice.json` (arquivo → media_id → legenda) e um `legendas.txt` para
      leitura rápida.

   2) PEDIR A LEITURA na conversa: "leia o catálogo da usekanton". O Claude
      abre as fotos da pasta, escreve `catalogo-usekanton.json` no formato
      do fim deste arquivo e roda o passo 3 sozinho.

   3) IMPORTAR o resultado:

        npx tsx scripts/catalogo-a-mao.ts --importar --loja usekanton

   O importar respeita a mesma regra da rota: produto marcado como REVISADO
   por você nunca é apagado, e o que ninguém conferiu é substituído.
   ============================================================ */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function carregarEnv() {
  const arquivo = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(arquivo)) return;
  for (const linha of fs.readFileSync(arquivo, "utf8").split(/\r?\n/)) {
    if (!linha.includes("=") || linha.trim().startsWith("#")) continue;
    const i = linha.indexOf("=");
    const chave = linha.slice(0, i).trim();
    if (process.env[chave]) continue;
    process.env[chave] = linha.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
}
carregarEnv();

const argv = process.argv.slice(2);
const tem = (nome: string) => argv.includes(`--${nome}`);
const opcao = (nome: string) => {
  const i = argv.indexOf(`--${nome}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : null;
};

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dono = process.env.CRM_OWNER_ID;
if (!url || !chave || !dono) {
  console.error("Faltam SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ou CRM_OWNER_ID no .env.local.");
  process.exit(1);
}
const supabase = createClient(url, chave, { auth: { persistSession: false } });

const LOJA = opcao("loja");
if (!LOJA) {
  console.error("Diga qual loja: --loja usekanton (o arroba ou o id).");
  process.exit(1);
}

const TETO_LEGENDA = 400;

type Loja = { id: string; arroba: string; nome: string | null };
type Ativo = {
  id: string;
  media_id: string;
  ordem: number;
  tipo: string | null;
  caminho: string;
  legenda: string | null;
  curtidas: number | null;
};

async function acharLoja(): Promise<Loja> {
  /* Aceita id ou arroba: no dia a dia você tem o arroba na cabeça, e o id
     só existe na barra de endereço. */
  const ehId = /^[0-9a-f-]{36}$/i.test(LOJA!);
  const { data } = await supabase
    .from("prod_lojas")
    .select("id,arroba,nome")
    .eq(ehId ? "id" : "arroba", LOJA!.toLowerCase().replace(/^@/, ""))
    .single<Loja>();
  if (!data) {
    console.error(`Não achei a loja "${LOJA}" na oficina.`);
    process.exit(1);
  }
  return data;
}

async function exportar() {
  const loja = await acharLoja();
  const { data } = await supabase
    .from("prod_ativos")
    .select("id,media_id,ordem,tipo,caminho,legenda,curtidas")
    .eq("loja_id", loja.id)
    .order("ordem");

  /* O material que o cliente mandou (logo, print de tabela) fica de fora:
     ele não é peça à venda, e uma pasta com o logo no meio faz a leitura
     inventar um produto chamado "logotipo". */
  const ativos = ((data as Ativo[]) ?? []).filter((a) => a.tipo !== "MATERIAL");
  if (!ativos.length) {
    console.error("Esta loja não tem foto colhida ainda. Colha primeiro, pela tela.");
    process.exit(1);
  }

  const pasta = `catalogo-${loja.arroba}`;
  fs.mkdirSync(pasta, { recursive: true });

  const indice: { arquivo: string; media_id: string; legenda: string | null; curtidas: number | null }[] = [];
  let baixadas = 0;
  let falhas = 0;

  for (const a of ativos) {
    const publica = `${url}/storage/v1/object/public/producao/${a.caminho}`;
    const r = await fetch(publica);
    if (!r.ok) {
      falhas++;
      continue;
    }
    const bytes = Buffer.from(await r.arrayBuffer());
    /* O arquivo é numerado pela ORDEM, e não pelo media_id: nome curto é o
       que permite pedir "leia da 00 à 11" na conversa sem colar um id de
       dezoito dígitos. O índice guarda o vínculo. */
    const extensao = path.extname(a.caminho) || ".jpg";
    const arquivo = `${String(a.ordem).padStart(2, "0")}${extensao}`;
    fs.writeFileSync(path.join(pasta, arquivo), bytes);
    indice.push({
      arquivo,
      media_id: a.media_id,
      legenda: a.legenda ? a.legenda.slice(0, TETO_LEGENDA) : null,
      curtidas: a.curtidas,
    });
    baixadas++;
  }

  fs.writeFileSync(path.join(pasta, "indice.json"), JSON.stringify(indice, null, 2), "utf8");
  fs.writeFileSync(
    path.join(pasta, "legendas.txt"),
    indice.map((i) => `${i.arquivo} :: ${i.media_id} :: ${i.legenda || "(sem legenda)"}`).join("\n"),
    "utf8",
  );

  const comLegenda = indice.filter((i) => i.legenda).length;
  console.log(`${pasta}/: ${baixadas} fotos${falhas ? `, ${falhas} não vieram` : ""}.`);
  console.log(`${comLegenda} têm legenda. As outras só a foto conta.`);
  console.log(`Agora peça na conversa: "leia o catálogo da ${loja.arroba}".`);
}

/* O formato que o JSON precisa ter. É o mesmo esquema de
   lib/producao/modelo.ts, e a checagem aqui é a única que existe neste
   caminho: sem a API, ninguém valida o formato antes de chegar no banco. */
type ItemLido = {
  media_id: string;
  nome?: string | null;
  marca?: string | null;
  cor?: string | null;
  preco?: number | null;
  preco_de?: number | null;
  tamanhos?: string | null;
  categoria?: string | null;
  descricao?: string | null;
  mesma_peca_que?: string | null;
  descartar?: boolean;
};

async function importar() {
  const loja = await acharLoja();
  const arquivo = opcao("arquivo") ?? `catalogo-${loja.arroba}.json`;
  if (!fs.existsSync(arquivo)) {
    console.error(`Não achei ${arquivo}. Rode o --exportar primeiro e peça a leitura.`);
    process.exit(1);
  }

  let itens: ItemLido[];
  try {
    const cru = JSON.parse(fs.readFileSync(arquivo, "utf8")) as unknown;
    /* Aceita as duas formas: o array puro e o objeto { itens: [...] }. As
       duas aparecem dependendo de como o pedido foi escrito, e recusar uma
       delas seria transformar formatação em erro. */
    itens = Array.isArray(cru) ? (cru as ItemLido[]) : ((cru as { itens?: ItemLido[] }).itens ?? []);
  } catch (e) {
    console.error(`O ${arquivo} não é JSON válido: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
  if (!itens.length) {
    console.error("O arquivo não tem item nenhum.");
    process.exit(1);
  }

  const { data: ativosCrus } = await supabase
    .from("prod_ativos")
    .select("id,media_id,ordem,tipo,caminho,legenda,curtidas")
    .eq("loja_id", loja.id);
  const ativos = ((ativosCrus as Ativo[]) ?? []).filter((a) => a.tipo !== "MATERIAL");
  const porMedia = new Map(ativos.map((a) => [a.media_id, a]));

  const { data: revisados } = await supabase
    .from("prod_produtos")
    .select("ativo_id")
    .eq("loja_id", loja.id)
    .eq("revisado", true);
  const protegidos = new Set(
    ((revisados as { ativo_id: string | null }[]) ?? []).map((p) => p.ativo_id).filter(Boolean) as string[],
  );

  await supabase.from("prod_produtos").delete().eq("loja_id", loja.id).eq("revisado", false);

  /* ---------- juntar o carrossel numa peça só ----------
     Mesma regra da rota: a foto que aponta `mesma_peca_que` não vira
     produto, ela vira ângulo extra do dono. Segue a corrente até o começo
     (a 3 aponta a 2, que aponta a 1) com teto de passos, porque uma leitura
     em ciclo travaria o script. */
  const donoDaPeca = new Map<string, string>();
  for (const item of itens) {
    let alvo = item.mesma_peca_que ?? null;
    let passos = 0;
    while (alvo && passos++ < 8) {
      const acima = itens.find((x) => x.media_id === alvo);
      if (!acima?.mesma_peca_que || acima.mesma_peca_que === item.media_id) break;
      alvo = acima.mesma_peca_que;
    }
    if (alvo && alvo !== item.media_id) donoDaPeca.set(item.media_id, alvo);
  }

  const extrasPorDono = new Map<string, string[]>();
  for (const [filho, donoMedia] of donoDaPeca) {
    const ativoFilho = porMedia.get(filho);
    if (!ativoFilho) continue;
    extrasPorDono.set(donoMedia, [...(extrasPorDono.get(donoMedia) ?? []), ativoFilho.id]);
  }

  /* A ordem é a do engajamento, com o mesmo piso da rota: abaixo de dez
     curtidas no topo, o ranking é ruído e a cronologia fica. */
  const maior = Math.max(0, ...ativos.map((a) => a.curtidas ?? 0));
  const porEngajamento = maior >= 10;
  const ranking = [...ativos].sort((a, b) =>
    porEngajamento ? (b.curtidas ?? -1) - (a.curtidas ?? -1) || a.ordem - b.ordem : a.ordem - b.ordem,
  );
  const posicao = new Map(ranking.map((a, i) => [a.id, i]));

  const linhas = [];
  let semAtivo = 0;
  for (const item of itens) {
    if (item.descartar) continue;
    if (donoDaPeca.has(item.media_id)) continue;
    const ativo = porMedia.get(String(item.media_id));
    if (!ativo) {
      /* media_id que não existe é quase sempre id copiado errado, e um
         produto sem foto na vitrine é pior que produto a menos. */
      semAtivo++;
      continue;
    }
    if (protegidos.has(ativo.id)) continue;
    const nome = String(item.nome || "").trim();
    if (!nome) continue;

    linhas.push({
      owner_id: dono,
      loja_id: loja.id,
      ativo_id: ativo.id,
      fotos_extras: extrasPorDono.get(item.media_id) ?? null,
      ordem: posicao.get(ativo.id) ?? ativo.ordem,
      nome,
      marca: item.marca ?? null,
      cor: item.cor ?? null,
      preco: item.preco ?? null,
      preco_de: item.preco_de ?? null,
      tamanhos: item.tamanhos ?? null,
      categoria: item.categoria ?? null,
      descricao: item.descricao ?? null,
      revisado: false,
    });
  }

  if (linhas.length) {
    const { error } = await supabase.from("prod_produtos").insert(linhas);
    if (error) {
      console.error(`O banco recusou: ${error.message}`);
      process.exit(1);
    }
  }

  const juntadas = donoDaPeca.size;
  const nota =
    `${linhas.length} produtos lidos na conversa.` +
    (juntadas ? ` ${juntadas} fotos viraram ângulo extra.` : "") +
    (porEngajamento ? " Ordem por curtidas." : " Ordem do feed.");

  await supabase.from("prod_lojas").update({ status: "catalogo", nota }).eq("id", loja.id);

  console.log(nota + (semAtivo ? ` ${semAtivo} itens tinham media_id desconhecido e ficaram de fora.` : ""));
  console.log(`Confira em /crm/producao/${loja.id}`);
}

/* ============================================================
   O FORMATO DO JSON (catalogo-<arroba>.json):

   [
     {
       "media_id": "17900000000000000_1",  // do indice.json, exato
       "nome": "Tênis Adidas Campus creme", // como uma etiqueta de loja
       "marca": "Adidas",                   // só se o logo estiver VISÍVEL
       "cor": "creme e marrom",
       "preco": null,                       // só se escrito. Nunca estimar
       "preco_de": null,
       "tamanhos": null,
       "categoria": "Tênis",
       "descricao": null,
       "mesma_peca_que": null,              // media_id do primeiro ângulo
       "descartar": false                   // true se não for produto
     }
   ]
   ============================================================ */

const modo = tem("importar") ? importar : tem("exportar") ? exportar : null;
if (!modo) {
  console.error("Diga o que fazer: --exportar ou --importar.");
  process.exit(1);
}
modo().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
