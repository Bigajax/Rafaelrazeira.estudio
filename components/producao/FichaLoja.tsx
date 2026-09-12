"use client";

/* ============================================================
   A FICHA DA LOJA — a bancada de uma marca só

   Nove blocos, na ordem do trabalho:

     1. o perfil colhido, com os dois botões que fazem a máquina girar
     2. a loja física (Google) e as quatro perguntas do cliente
     3. a ficha da marca (paleta, fundo, tipografia)
     4. a forma: o que o catálogo exige da página
     5. o conceito: como a marca fala e por que confiar nela
     6. o material que o cliente mandou pelo WhatsApp
     7. o catálogo, que é onde você passa o tempo
     8. a exportação dos dados, para dentro do projeto do cliente
     9. o prompt, que é a ordem de construção da vitrine

   POR QUE OS DOIS BOTÕES CHAMAM ROTA E NÃO ACTION: colher sessenta imagens
   e ler sessenta legendas levam minutos. Rota deixa a tela responder na
   hora; o `router.refresh()` no fim traz o resultado sem recarregar a
   página inteira. Mesmo desenho da pesquisa do CRM.
   ============================================================ */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { apagarLoja, marcarPronta } from "@/app/(pt)/crm/acoes-producao";
import s from "@/app/(pt)/crm/crm.module.css";
import p from "@/app/(pt)/crm/producao.module.css";
import type { Ativo, Loja, Produto, VersaoPrompt } from "@/lib/producao/tipos";
import { Estado } from "./Lojas";
import { Exportar } from "./Exportar";
import { Conceito } from "./Conceito";
import { Forma } from "./Forma";
import { Loja as BlocoLoja } from "./Loja";
import { Material } from "./Material";
import { Paleta } from "./Paleta";
import { Prompt } from "./Prompt";
import { Regua, etapasDe } from "./Regua";
import { TabelaProdutos } from "./TabelaProdutos";

/* O link da bio de loja que vende no direct é quase sempre um wa.me. Só
   conta como WhatsApp o que tem doze ou treze dígitos depois do DDI 55:
   um link encurtado qualquer não vira telefone por acidente. */
function whatsDoLink(site: string): string | null {
  const m = site.match(/(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=)(\d{12,13})/i);
  return m ? m[1] : null;
}

/* 5532991169200 vira "(32) 99116-9200". O DDI sai da tela porque ele é o
   mesmo em todo cliente do estúdio, e o que se confere de relance é o DDD
   com o número, não o 55. */
function telefoneBonito(digitos: string): string {
  const semDdi = digitos.replace(/^55/, "");
  const ddd = semDdi.slice(0, 2);
  const resto = semDdi.slice(2);
  if (resto.length < 8) return digitos;
  const meio = resto.length === 9 ? resto.slice(0, 5) : resto.slice(0, 4);
  const fim = resto.length === 9 ? resto.slice(5) : resto.slice(4);
  return `(${ddd}) ${meio}-${fim}`;
}

export function FichaLoja({
  loja,
  ativos,
  produtos,
  urls,
  versoes,
  comVisao,
}: {
  loja: Loja;
  ativos: Ativo[];
  produtos: Produto[];
  urls: Record<string, string>;
  /* As últimas cinco gerações do prompt, sem o texto: id, data e modo. O
     markdown vem por ação quando você clica em copiar. */
  versoes: VersaoPrompt[];
  /* Verdadeiro quando existe ANTHROPIC_API_KEY: a leitura olha as fotos.
     Falso quando a oficina vai depender do OpenRouter, que só lê texto. */
  comVisao: boolean;
}) {
  const router = useRouter();
  const [rodando, setRodando] = useState<"" | "colher" | "catalogo">("");
  const [erro, setErro] = useState("");
  const [salvando, comSalvamento] = useTransition();

  async function disparar(qual: "colher" | "catalogo") {
    setErro("");
    setRodando(qual);
    try {
      const r = await fetch(`/api/producao/${qual}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ loja_id: loja.id }),
      });
      const corpo = (await r.json()) as { erro?: string };
      if (!r.ok) setErro(corpo.erro || "Não deu certo. Tente de novo.");
    } catch {
      /* Rede caída ou função derrubada no meio. O status no banco continua
         "colhendo" e destrava sozinho em cinco minutos, então a frase aqui
         precisa dizer isso em vez de sugerir clicar de novo agora. */
      setErro("A conexão caiu no meio. Espere um minuto e confira antes de repetir.");
    } finally {
      setRodando("");
      router.refresh();
    }
  }

  /* O material do cliente mora na mesma tabela das fotos colhidas, com
     tipo MATERIAL. Separar aqui é o que impede o logo de aparecer no meio
     das peças na tela e na contagem. */
  const materiais = ativos.filter((a) => a.tipo === "MATERIAL");
  const fotos = ativos.filter((a) => a.tipo !== "MATERIAL");
  const semImagem = !fotos.length;
  const revisados = produtos.filter((x) => x.revisado).length;
  const etapas = etapasDe(loja.status, produtos.length, revisados);

  return (
    <div className={s.wrap}>
      <p className={p.volta}>
        <Link href="/crm/producao">← todas as lojas</Link>
      </p>

      {/* ---------- 1. o perfil ---------- */}
      <header className={p.cabecalho}>
        <span className={p.avatarGrande} aria-hidden>
          {loja.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={loja.avatar} alt="" />
          ) : (
            <i>{loja.arroba.slice(0, 2).toUpperCase()}</i>
          )}
        </span>
        <div className={p.cabecalhoTxt}>
          <h1>
            {loja.nome || `@${loja.arroba}`}
            <i className={s.ponto}>.</i>
          </h1>
          <p className={p.arroba}>
            <a href={`https://instagram.com/${loja.arroba}`} target="_blank" rel="noopener">
              @{loja.arroba} ↗
            </a>
            {/* O número em tinta cheia e a palavra em cinza: são dados de
                tamanho da conta, e é o dígito que se compara entre lojas. */}
            {loja.seguidores !== null && (
              <span>
                <b>{loja.seguidores.toLocaleString("pt-BR")}</b> seguidores
              </span>
            )}
            {loja.publicacoes !== null && (
              <span>
                <b>{loja.publicacoes}</b> publicações
              </span>
            )}
          </p>
          {/* A bio é a VOZ DA LOJA dentro da ficha, e não texto do
              sistema: ela entra como citação, com o filete na margem, do
              mesmo jeito que uma fala de cliente entra num documento. É
              dela que sai o tom que o prompt vai pedir ao gerador. */}
          {loja.bio && <blockquote className={p.bio}>{loja.bio}</blockquote>}
          {/* ---------- o link da bio, e o número que a vitrine inteira usa ----------
              Quando o link da bio é um wa.me (o caso mais comum em loja que
              vende no direct), ele não é "o site": é O WHATSAPP DA LOJA, o
              destino de todo botão de pedido da vitrine que vai ser
              construída. Tratá-lo como um link cinza no rodapé, escrito
              "wa.me/5532991169200", era esconder o dado mais importante
              desta tela atrás da forma mais ilegível dele.

              Formatado, ele também vira conferível: um DDD errado salta aos
              olhos em "(32) 99116-9200" e passa despercebido em treze
              dígitos colados. */}
          {loja.site && (whatsDoLink(loja.site) ? (
            <p className={p.whats}>
              <span>WhatsApp da loja</span>
              <a href={loja.site} target="_blank" rel="noopener">
                {telefoneBonito(whatsDoLink(loja.site) as string)} ↗
              </a>
            </p>
          ) : (
            <p className={p.site}>
              <a href={loja.site} target="_blank" rel="noopener">
                {loja.site.replace(/^https?:\/\//, "")} ↗
              </a>
            </p>
          ))}
        </div>
        {/* O rótulo do status saiu daqui: a régua, logo abaixo, já diz a
            etapa, e dizer duas vezes gastava o canto mais nobre do
            cabeçalho com uma palavra repetida. Fica a NOTA, que é a única
            coisa que a régua não sabe contar: o que a última operação fez. */}
        {loja.nota && (
          <p className={`${p.recadoFicha} ${loja.status === "erro" ? p.recadoErro : ""}`}>{loja.nota}</p>
        )}

        {/* O carimbo é o único gesto solto da tela, e ele aparece uma vez
            por loja: quando o trabalho termina. */}
        {loja.status === "pronta" && <span className={p.carimbo}>Pronta</span>}
      </header>

      {/* A régua responde "em que pé isso está" antes de qualquer botão. */}
      <Regua etapas={etapas} className={p.reguaFicha} />

      {/* ---------- a barra de operações ----------
          Três botões de contorno iguais não dizem qual é a vez, e a vez
          existe: a régua acabou de calculá-la. A ação que faz a loja andar
          para o próximo marco vem em TINTA CHEIA; as outras continuam
          disponíveis, em contorno, porque refazer um passo é comum aqui.

          É a régua mandando no layout, que é o que a torna um dispositivo
          de verdade e não um desenho de progresso. */}
      <div className={p.acoes}>
        <button
          type="button"
          className={`${s.btn} ${!etapas.colhida ? p.aVez : ""}`}
          onClick={() => disparar("colher")}
          disabled={!!rodando}
        >
          {rodando === "colher" ? "COLHENDO…" : ativos.length ? "COLHER DE NOVO" : "COLHER DO INSTAGRAM"}
        </button>
        <button
          type="button"
          className={`${s.btn} ${etapas.colhida && !etapas.catalogo ? p.aVez : ""}`}
          onClick={() => disparar("catalogo")}
          disabled={!!rodando || semImagem}
          /* Sem foto colhida não existe o que ler, e a leitura voltaria
             vazia depois de uma espera de minutos. */
          title={semImagem ? "Colha as fotos primeiro" : undefined}
        >
          {rodando === "catalogo" ? "LENDO…" : produtos.length ? "LER O CATÁLOGO DE NOVO" : "LER O CATÁLOGO"}
        </button>
        {produtos.length > 0 && loja.status !== "pronta" && (
          <button
            type="button"
            className={`${s.btn} ${etapas.conferida ? p.aVez : ""}`}
            disabled={salvando}
            onClick={() =>
              comSalvamento(async () => {
                const r = await marcarPronta(loja.id);
                if (!r.ok) setErro(r.erro);
                router.refresh();
              })
            }
          >
            MARCAR COMO PRONTA
          </button>
        )}
        <Apagar id={loja.id} arroba={loja.arroba} />
      </div>

      {erro && (
        <p className={p.erro} role="alert">
          {erro}
        </p>
      )}

      {rodando === "catalogo" && (
        <p className={p.aviso}>
          {comVisao
            ? "Olhando as fotos uma a uma. Sessenta levam alguns minutos, e o custo aparece na nota quando terminar."
            : "Lendo as legendas. O custo aparece na nota quando terminar."}
        </p>
      )}

      {/* O aviso aparece ANTES do clique, e não depois da falha: quando a
          leitura automática está no modo cego, ela enxerga só legenda, e a
          Kanton mostrou o que isso significa numa loja de moda (7 legendas
          em 57 fotos, nenhuma com preço). Quem lê isso decide se vale
          clicar ou se é hora de pedir a leitura na conversa. */}
      {!comVisao && !!ativos.length && (
        <p className={p.aviso}>
          A leitura automática está enxergando só a legenda dos posts. Em loja que não escreve legenda, ela
          volta quase vazia: nesses casos, o caminho é pedir a leitura das fotos direto na conversa.
        </p>
      )}

      {/* ---------- 2. a loja, e as quatro perguntas ---------- */}
      <BlocoLoja loja={loja} />

      {/* ---------- 3. a marca ---------- */}
      <Paleta loja={loja} ativos={fotos} urls={urls} />

      {/* ---------- 4. a forma ----------
          Entre a marca e o conceito porque é a ponte entre os dois: a marca
          disse com que cara, a forma diz com que ESTRUTURA, e o conceito
          escreve por cima disso. Ela também é o único bloco que já chega
          com resposta: o catálogo lido responde sozinho quantas peças tem,
          se há preço, se há variação. O que a máquina inferiu vem tracejado
          até você clicar. */}
      <Forma loja={loja} produtos={produtos} ativos={fotos} urls={urls} />

      {/* ---------- 5. o conceito ----------
          Vem depois da marca de propósito: a cor e a tipografia são o que
          a vitrine PARECE, e o conceito é o que ela DIZ. Nessa ordem, a
          segunda decisão herda o clima que a primeira acabou de fixar. */}
      <Conceito loja={loja} produtos={produtos} ativos={fotos} />

      {/* ---------- 6. o material que o cliente mandou ---------- */}
      <Material loja_id={loja.id} materiais={materiais} urls={urls} />

      {/* ---------- 7. o catálogo ---------- */}
      <TabelaProdutos loja={loja} produtos={produtos} ativos={fotos} urls={urls} />

      {/* ---------- 8. a saída dos dados ---------- */}
      {produtos.length > 0 && <Exportar loja={loja} produtos={produtos} urls={urls} />}

      {/* ---------- 9. o prompt ----------
          Por último, e depois de tudo, porque ele é a única coisa aqui que
          LÊ os outros oito. Enquanto faltar marca, forma ou conceito, ele
          não gera: diz o que falta, com o nome do bloco que resolve. */}
      <Prompt
        loja={loja}
        produtos={produtos}
        urls={urls}
        material={materiais.map((m) => urls[m.id]).filter(Boolean)}
        versoes={versoes}
      />
    </div>
  );
}

/* Apagar pede confirmação no lugar, sem modal: é a mesma escada de dois
   toques que o CRM usa nos templates, e ela existe porque apagar leva junto
   as imagens do Storage, que não voltam com um ctrl+z. */
function Apagar({ id, arroba }: { id: string; arroba: string }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [indo, comIda] = useTransition();

  if (!confirmando) {
    return (
      <button type="button" className={`${s.btnMini} ${p.acaoIsolada}`} onClick={() => setConfirmando(true)}>
        APAGAR
      </button>
    );
  }

  return (
    <span className={p.acaoIsolada}>
      <button
        type="button"
        className={s.btnMini}
        disabled={indo}
        onClick={() =>
          comIda(async () => {
            await apagarLoja(id);
            router.push("/crm/producao");
          })
        }
      >
        {indo ? "APAGANDO…" : `APAGAR @${arroba} E AS FOTOS`}
      </button>
      <button type="button" className={s.btnMini} onClick={() => setConfirmando(false)}>
        CANCELAR
      </button>
    </span>
  );
}
