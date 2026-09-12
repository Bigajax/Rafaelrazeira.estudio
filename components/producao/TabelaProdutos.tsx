"use client";

/* ============================================================
   O CATÁLOGO — a tela onde o tempo é gasto de verdade

   O modelo lê sessenta legendas em um minuto e acerta a maioria. O que
   sobra é esta tabela: conferir preço, arrumar nome, jogar fora o que não é
   produto. É trabalho de olho, e por isso a tela é uma tabela e não um
   formulário por item: comparar dez preços seguidos é o que faz o erro
   aparecer.

   ---------- as três decisões desta tela ----------
   1. EDIÇÃO NO LUGAR, sem botão de salvar. Cada campo grava quando você sai
      dele. Um botão "salvar" por linha em sessenta linhas seria sessenta
      cliques a mais para nada.
   2. A MINIATURA É A PRIMEIRA COLUNA. O nome do produto não diz se o preço
      está certo; a foto diz. Ela também é o link para o post original, que
      é onde a dúvida se resolve.
   3. "CONFERI" É UMA CAIXA, E É A COLUNA MAIS IMPORTANTE. Ela é o que
      sobrevive a uma releitura do catálogo (a rota não apaga produto
      revisado) e o que separa o que você olhou do que ninguém olhou.
   ============================================================ */

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  apagarProduto,
  escolherSozinho,
  estrelar,
  novoProduto,
  ordenarDestaques,
  salvarProduto,
} from "@/app/(pt)/crm/acoes-producao";
import { PrecosColados } from "./PrecosColados";
import s from "@/app/(pt)/crm/crm.module.css";
import p from "@/app/(pt)/crm/producao.module.css";
import { precoNumero, precoTexto, type Ativo, type Loja, type Produto } from "@/lib/producao/tipos";

/* Doze é o corte do hero e o corte da prévia, e é o mesmo doze do
   compilador. Estrelar mais que isso é permitido de propósito: as que
   sobram entram no catálogo da prévia. O que não pode é você reordenar
   a décima quinta achando que mexeu no hero, e é por isso que a tira
   desenha a linha do corte. */
const NO_HERO = 12;

/* Sessenta fotos medidas de uma vez travam a aba. A escolha automática
   olha as primeiras trinta, que é onde o material bom de qualquer loja de
   Instagram está: o feed é cronológico e a foto boa é a recente. */
const MEDIDAS_MAXIMO = 30;
const LADO = 64;

export function TabelaProdutos({
  loja,
  produtos,
  ativos,
  urls,
}: {
  loja: Loja;
  produtos: Produto[];
  ativos: Ativo[];
  urls: Record<string, string>;
}) {
  const router = useRouter();
  const [criando, comCriacao] = useTransition();
  const [medindo, setMedindo] = useState(false);
  const [recado, setRecado] = useState("");

  const porId = new Map(ativos.map((a) => [a.id, a]));

  /* As escolhidas, na ordem do hero. Nulo vai para o fim: é a peça
     estrelada que ainda não foi posicionada. */
  const escolhidas = produtos
    .filter((x) => x.destaque)
    .sort((a, b) => (a.ordem_destaque ?? 1e9) - (b.ordem_destaque ?? 1e9) || a.ordem - b.ordem);
  const inferidas = loja.forma?.origem?.destaques === "inferido";

  /* ---------- a escolha automática ----------
     Duas medidas, e as duas só existem com a imagem carregada, o que faz
     disto trabalho de navegador e não de servidor: RESOLUÇÃO, porque uma
     foto de 640px não aguenta abrir a página a 800 de largura; e OCUPAÇÃO,
     que é quanto do quadro a peça toma. Foto onde o produto é um detalhe
     no meio do ambiente encolhe até sumir no hero, e ela é justamente a
     que costuma ter mais curtida. */
  async function medirEEscolher() {
    setMedindo(true);
    setRecado("");
    const candidatos = produtos.slice(0, MEDIDAS_MAXIMO);
    const notas: { id: string; nota: number }[] = [];

    const tela = document.createElement("canvas");
    tela.width = LADO;
    tela.height = LADO;
    const ctx = tela.getContext("2d", { willReadFrequently: true });

    for (const prod of candidatos) {
      const src = prod.ativo_id ? urls[prod.ativo_id] : null;
      if (!src) continue;
      const img = await new Promise<HTMLImageElement | null>((resolve) => {
        const el = new Image();
        el.crossOrigin = "anonymous";
        el.onload = () => resolve(el);
        el.onerror = () => resolve(null);
        el.src = src;
      });
      if (!img?.naturalWidth || !ctx) continue;

      /* 1200px de lado é o teto útil: acima disso a diferença não aparece
         numa tela, e deixar a nota crescer sem fim faria uma foto enorme e
         chapada ganhar de uma foto boa. */
      const resolucao = Math.min(1, Math.min(img.naturalWidth, img.naturalHeight) / 1200);
      let ocupacao = 0.5;
      ctx.clearRect(0, 0, LADO, LADO);
      ctx.drawImage(img, 0, 0, LADO, LADO);
      try {
        const dados = ctx.getImageData(0, 0, LADO, LADO).data;
        /* A cor do canto superior esquerdo é o fundo, por convenção: em
           foto de produto ele é o que sobra. Conta quantos pixels fogem
           dele, e essa é a peça. */
        const r0 = dados[0], g0 = dados[1], b0 = dados[2];
        let fora = 0;
        for (let i = 0; i < dados.length; i += 4) {
          const d =
            Math.abs(dados[i] - r0) + Math.abs(dados[i + 1] - g0) + Math.abs(dados[i + 2] - b0);
          if (d > 60) fora++;
        }
        ocupacao = fora / (LADO * LADO);
      } catch {
        /* Canvas contaminado: a resolução continua valendo. */
      }

      /* Ocupação boa é a do meio: 0.15 é o produto perdido no ambiente,
         0.95 é textura de tecido em close, sem forma reconhecível. */
      const enquadramento = 1 - Math.abs(0.55 - ocupacao) / 0.55;
      notas.push({ id: prod.id, nota: resolucao * 0.5 + Math.max(0, enquadramento) * 0.5 });
    }

    setMedindo(false);
    if (!notas.length) {
      setRecado("Não consegui medir nenhuma foto. Elas já foram colhidas?");
      return;
    }

    const ids = notas.sort((a, b) => b.nota - a.nota).slice(0, NO_HERO).map((x) => x.id);
    const r = await escolherSozinho(loja.id, ids);
    setRecado(r.ok ? `${ids.length} escolhidas por resolução e enquadramento. Confira: clicar em qualquer estrela vira escolha sua.` : r.erro);
    router.refresh();
  }
  const revisados = produtos.filter((x) => x.revisado).length;
  /* "Sem preço" fica ao lado de "conferidas" porque as duas medem a mesma
     coisa por ângulos diferentes: o quanto deste catálogo já é confiável. */
  const semPreco = produtos.filter((x) => x.preco === null).length;

  return (
    <section className={p.bloco}>
      <div className={p.blocoCab}>
        <h2>
          Catálogo<i className={s.ponto}>.</i>
        </h2>
        <span className={p.blocoRot}>lido das fotos</span>
        {/* O catálogo é onde o dia inteiro acontece, e era o bloco com o
            cabeçalho mais fraco da ficha: uma linha de texto em cinza. Os
            três números são os mesmos da bancada, e respondem de relance a
            pergunta que se faz ao voltar para esta tela: quanto falta. */}
        {produtos.length > 0 && (
          <span className={p.numeros}>
            <span className={p.num}>
              <b>{produtos.length}</b>
              <span>peças</span>
            </span>
            <span className={`${p.num} ${revisados ? "" : p.numVazio}`}>
              <b>{revisados}</b>
              <span>conferidas</span>
            </span>
            <span className={`${p.num} ${semPreco ? "" : p.numVazio}`}>
              <b>{semPreco}</b>
              <span>sem preço</span>
            </span>
          </span>
        )}
      </div>

      {/* ---------- as escolhidas ----------
          O compilador mandava usar "as de melhor foto", que é um adjetivo,
          não uma instrução: quem lê pega as primeiras da lista. A estrela é
          você respondendo isso com o olho, e a tira é onde a ORDEM se
          decide, porque arrastar linha numa tabela de sessenta para
          posicionar doze é pescar. */}
      {produtos.length > 0 && (
        <div className={p.escolhas}>
          <p className={p.escolhasRot}>
            {/* Passar de doze é permitido, e o contador precisa parar de
                somar quando isso acontece: "14 de 12" é uma conta impossível
                e some com a informação que importa, que é quantas entram no
                hero. Acima do corte ele passa a mostrar as duas contas. */}
            <b>{escolhidas.length}</b>
            <span>escolhidas</span>
            {escolhidas.length > NO_HERO ? (
              <>
                <b>{NO_HERO}</b>
                <span>no hero</span>
              </>
            ) : (
              <span>de {NO_HERO}</span>
            )}
            {inferidas && !!escolhidas.length && <em>sugeridas pela medição, ainda não confirmadas</em>}
            <button type="button" className={s.btnMini} onClick={medirEEscolher} disabled={medindo}>
              {medindo ? "MEDINDO…" : "ESCOLHER SOZINHO"}
            </button>
          </p>

          {recado && <p className={p.aviso}>{recado}</p>}

          {escolhidas.length > 0 && (
            <Tira
              loja_id={loja.id}
              escolhidas={escolhidas}
              porId={porId}
              urls={urls}
              inferidas={inferidas}
            />
          )}
        </div>
      )}

      {!produtos.length ? (
        <div className={p.vazio}>
          <b>Catálogo vazio</b>
          <p>
            Com as fotos colhidas, &quot;ler o catálogo&quot; olha peça por peça e devolve nome, marca e cor.
            Preço só entra quando estiver escrito: o que ele não souber, você completa aqui.
          </p>
        </div>
      ) : (
        <div className={p.rolagem}>
          <table className={p.tabela}>
            <thead>
              <tr>
                <th aria-label="Foto" />
                <th>Produto</th>
                {/* Marca é editável porque um erro dela é grave: chamar de
                    Nike um genérico é promessa que a loja não pode cumprir. */}
                <th>Marca</th>
                <th>Preço</th>
                <th>De</th>
                <th>Tamanhos</th>
                <th>Categoria</th>
                {/* Só leitura, e do lado do preço de propósito: é o número
                    que explica por que esta peça está no alto da lista. */}
                <th title="Curtidas no post original">♥</th>
                <th>Conferi</th>
                <th aria-label="Apagar" />
              </tr>
            </thead>
            <tbody>
              {produtos.map((prod) => (
                <Linha
                  key={prod.id}
                  produto={prod}
                  ativo={prod.ativo_id ? porId.get(prod.ativo_id) ?? null : null}
                  urls={urls}
                  loja_id={loja.id}
                  inferida={inferidas}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {produtos.length > 0 && <PrecosColados loja_id={loja.id} />}

      {ativos.length > 0 && (
        <button
          type="button"
          className={s.btnMini}
          disabled={criando}
          onClick={() =>
            comCriacao(async () => {
              await novoProduto(loja.id, null);
              router.refresh();
            })
          }
        >
          {criando ? "CRIANDO…" : "+ PRODUTO À MÃO"}
        </button>
      )}
    </section>
  );
}

/* ============================================================
   A TIRA — as escolhidas, na ordem em que o hero as mostra

   Ela existe por uma razão de gesto: a estrela decide QUAIS, e a tira decide
   EM QUE ORDEM. Arrastar linha numa tabela de sessenta para posicionar doze
   é pescar; aqui só as escolhidas aparecem, no tamanho em que a decisão é
   visual ("essa é a primeira que a pessoa vê").

   ---------- o corte é desenhado ----------
   Estrelar vinte é permitido: as oito que sobram entram no catálogo da
   prévia. O que não pode acontecer é você arrastar a décima quinta achando
   que mexeu no hero. Por isso existe a linha depois da posição doze, com a
   frase escrita: sem ela, o gesto não faz nada e nada diz isso.
   ============================================================ */
function Tira({
  loja_id,
  escolhidas,
  porId,
  urls,
  inferidas,
}: {
  loja_id: string;
  escolhidas: Produto[];
  porId: Map<string, Ativo>;
  urls: Record<string, string>;
  inferidas: boolean;
}) {
  const router = useRouter();
  /* A ordem vive aqui durante o arrasto e só desce ao banco quando ele
     termina. Um update por cartão a cada passagem do mouse seria uma
     dezena de escritas para uma decisão só. */
  const [ordem, setOrdem] = useState<Produto[]>(escolhidas);
  const [pegou, setPegou] = useState<number | null>(null);

  /* A lista de fora manda quando ela muda de tamanho: estrelar ou desestrelar
     no meio da tabela precisa aparecer aqui na hora. */
  useEffect(() => {
    setOrdem(escolhidas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escolhidas.map((x) => x.id).join(",")]);

  function soltar(destino: number) {
    if (pegou === null || pegou === destino) return setPegou(null);
    const nova = [...ordem];
    const [movido] = nova.splice(pegou, 1);
    nova.splice(destino, 0, movido);
    setOrdem(nova);
    setPegou(null);
    void ordenarDestaques(loja_id, nova.map((x) => x.id)).then(() => router.refresh());
  }

  return (
    <ol className={p.tira}>
      {ordem.map((prod, i) => {
        const ativo = prod.ativo_id ? porId.get(prod.ativo_id) : null;
        const foto = ativo ? urls[ativo.id] : null;
        const foraDoHero = i >= NO_HERO;
        return (
          <li
            key={prod.id}
            /* A borda do corte fica no PRIMEIRO cartão de fora, e não depois
               do último de dentro: é ele que precisa se explicar. */
            className={`${p.tiraItem} ${foraDoHero ? p.tiraFora : ""} ${i === NO_HERO ? p.tiraCorte : ""}`}
            draggable
            onDragStart={() => setPegou(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => soltar(i)}
            onDragEnd={() => setPegou(null)}
            title={prod.nome}
          >
            {foto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={foto} alt="" loading="lazy" className={inferidas ? p.tiraInferida : undefined} />
            ) : (
              <span className={p.semFoto} aria-hidden />
            )}
            <b>{i + 1}</b>
          </li>
        );
      })}
      {ordem.length > NO_HERO && (
        <li className={p.tiraNota} aria-hidden={false}>
          daqui pra baixo não entra no hero: estas peças ficam só no catálogo da prévia
        </li>
      )}
    </ol>
  );
}

function Linha({
  produto,
  ativo,
  urls,
  loja_id,
  inferida,
}: {
  produto: Produto;
  ativo: Ativo | null;
  urls: Record<string, string>;
  loja_id: string;
  /* Verdadeiro quando a estrela veio da medição e você ainda não tocou em
     nenhuma: ela aparece tracejada, igual a todo palpite desta ficha. */
  inferida: boolean;
}) {
  const router = useRouter();
  const [indo, comIda] = useTransition();
  const foto = ativo ? urls[ativo.id] : null;
  const extras = produto.fotos_extras?.length ?? 0;

  /* Grava e atualiza. O `router.refresh()` no fim não é para esta linha (o
     valor já está na tela), é para os contadores e para a exportação, que
     leem do servidor. */
  const gravar = (campo: Parameters<typeof salvarProduto>[1], valor: string | number | boolean | null) =>
    comIda(async () => {
      await salvarProduto(produto.id, campo, valor);
      router.refresh();
    });

  return (
    <tr className={produto.revisado ? p.linhaOk : undefined}>
      <td className={p.celFoto}>
        {/* A estrela mora NA MINIATURA porque é olhando a foto que a
            decisão se toma. Ela é um botão sobre o link do post, e o
            `stopPropagation` não é necessário: são irmãos, não aninhados. */}
        <button
          type="button"
          className={`${p.estrela} ${produto.destaque ? p.estrelaCheia : ""} ${
            produto.destaque && inferida ? p.estrelaInferida : ""
          }`}
          title={produto.destaque ? "Tirar do hero" : "Escolher para o hero"}
          aria-pressed={produto.destaque}
          onClick={() =>
            comIda(async () => {
              await estrelar(loja_id, produto.id, !produto.destaque);
              router.refresh();
            })
          }
        >
          {produto.destaque ? "★" : "☆"}
        </button>
        {foto ? (
          <a href={ativo?.permalink || foto} target="_blank" rel="noopener" title="Ver o post original">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={foto} alt="" loading="lazy" />
            {/* O carrossel virou uma peça só, e os outros ângulos ficaram
                pendurados nela. O número na quina é a prova disso na tela:
                sem ele, agrupar quatro fotos em uma linha parece perda de
                material, e é o contrário. */}
            {!!extras && <i className={p.extras}>+{extras}</i>}
          </a>
        ) : (
          <span className={p.semFoto} aria-hidden />
        )}
      </td>
      <td>
        <Campo valor={produto.nome} aoSair={(v) => v.trim() && gravar("nome", v.trim())} largo />
      </td>
      <td>
        <Campo valor={produto.marca ?? ""} placeholder="sem marca" aoSair={(v) => gravar("marca", v || null)} />
      </td>
      <td>
        <Campo
          valor={precoTexto(produto.preco)}
          /* É assim que a peça sem preço vai aparecer na vitrine, e o
             placeholder que diz isso poupa a pergunta "e as que ficaram
             sem?" toda vez. */
          placeholder="consulte"
          aoSair={(v) => gravar("preco", precoNumero(v))}
        />
      </td>
      <td>
        <Campo
          valor={precoTexto(produto.preco_de)}
          placeholder="riscado"
          aoSair={(v) => gravar("preco_de", precoNumero(v))}
        />
      </td>
      <td>
        <Campo valor={produto.tamanhos ?? ""} placeholder="P, M, G" aoSair={(v) => gravar("tamanhos", v || null)} />
      </td>
      <td>
        <Campo valor={produto.categoria ?? ""} placeholder="categoria" aoSair={(v) => gravar("categoria", v || null)} />
      </td>
      <td className={p.celCurtidas}>{ativo?.curtidas ?? ""}</td>
      <td className={p.celOk}>
        <input
          type="checkbox"
          checked={produto.revisado}
          aria-label="Conferi este produto"
          onChange={(e) => gravar("revisado", e.target.checked)}
        />
      </td>
      <td className={p.celApagar}>
        <button
          type="button"
          className={p.apagarLinha}
          disabled={indo}
          aria-label={`Apagar ${produto.nome}`}
          onClick={() =>
            comIda(async () => {
              await apagarProduto(produto.id);
              router.refresh();
            })
          }
        >
          ×
        </button>
      </td>
    </tr>
  );
}

/* O campo que grava ao sair. O estado local existe porque o input precisa
   responder à digitação antes de o servidor saber de nada; o `useEffect`
   traz o valor do servidor de volta quando ele muda por fora (releitura do
   catálogo, por exemplo), e sem ele a tabela ficaria mostrando o que você
   digitou sobre um dado que não existe mais. */
function Campo({
  valor,
  aoSair,
  placeholder,
  largo,
}: {
  valor: string;
  aoSair: (v: string) => void;
  placeholder?: string;
  largo?: boolean;
}) {
  const [texto, setTexto] = useState(valor);
  useEffect(() => setTexto(valor), [valor]);

  return (
    <input
      className={largo ? p.campoLargo : p.campoCurto}
      value={texto}
      placeholder={placeholder}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={() => texto !== valor && aoSair(texto)}
      /* Enter tira o foco em vez de enviar formulário nenhum: numa tabela
         de sessenta linhas, o gesto natural depois de corrigir um preço é
         apertar Enter e ir para o próximo. */
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
    />
  );
}
