"use client";

/* ============================================================
   O PROMPT — onde a ficha termina em artefato

   Sete blocos guardavam e nada saía junto. Aqui as decisões viram uma ordem
   de construção, e três coisas separam este bloco de um botão de exportar:

   1. ELE SE RECUSA quando a ficha não está pronta, e diz o que falta pelo
      nome. Botão cinza sem explicação é o jeito mais rápido de alguém achar
      que o sistema quebrou.
   2. ELE TEM TRÊS MODOS, e o padrão é prévia. Prévia com catálogo completo
      e WhatsApp funcionando é um site pronto de graça. O terceiro, ajuste,
      não constrói: muda o que já está no ar, e leva junto as travas da
      prévia para elas não caírem na passagem.
   3. ELE GUARDA VERSÃO. Gerar de novo não apaga a anterior: a ficha muda, e
      um mês depois é o prompt antigo que explica por que a página ficou do
      jeito que ficou.

   A lista das últimas cinco não traz o texto: ela lê id e data, e busca o
   markdown quando você clica em copiar.
   ============================================================ */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buscarPrompt, guardarPrompt } from "@/app/(pt)/crm/acoes-producao";
import s from "@/app/(pt)/crm/crm.module.css";
import p from "@/app/(pt)/crm/producao.module.css";
import { compilar, type Modo } from "@/lib/producao/compilador";
import type { Loja, Produto, VersaoPrompt } from "@/lib/producao/tipos";

const NOME_DO_MODO: Record<Modo, string> = { previa: "prévia", completa: "completa", ajuste: "ajuste" };

/* ---------- os ajustes que se repetem ----------
   Uma linha pronta por pedido que volta em toda vitrine. O @ entra
   resolvido, porque "coloque o link do Instagram" sem o @ é o agente
   procurando na bio; "aponte para instagram.com/arroba" é uma linha de
   código. */
const PRONTOS = (arroba: string): { rotulo: string; linha: string }[] => [
  {
    rotulo: "Link do Instagram",
    linha: `Todo @${arroba}, ícone ou menção ao Instagram na página vira link para https://instagram.com/${arroba}, abrindo em nova aba. Se a página não tem nenhum, coloque um no rodapé, ao lado do nome da loja, sem criar seção nova.`,
  },
  {
    rotulo: "Hero pelas estrelas",
    linha: "Refaça o hero com as peças da seção 3, nesta ordem, e nada mais na página.",
  },
  {
    rotulo: "Nome e título da aba",
    linha: "Confira o nome da loja no título da aba, no cabeçalho e no rodapé: os três iguais ao da seção 1, sem apelido.",
  },
];

export function Prompt({
  loja,
  produtos,
  urls,
  material,
  versoes,
}: {
  loja: Loja;
  produtos: Produto[];
  urls: Record<string, string>;
  /* As URLs do que o cliente mandou pelo WhatsApp. Uma pergunta só é feita
     a esta lista, e ela decide o hero: existe arquivo de logo em alta, ou
     o único que existe é a foto de perfil do Instagram? */
  material: string[];
  versoes: VersaoPrompt[];
}) {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>("previa");
  const [markdown, setMarkdown] = useState("");
  const [recado, setRecado] = useState("");
  const [gerando, comGeracao] = useTransition();

  /* ---------- o ajuste ----------
     O que muda, uma linha por alteração, e o que está no ar. A base vem
     da última geração que construiu alguma coisa: se a última foi prévia,
     é uma prévia que está no ar e as travas dela viajam no ajuste. Dá para
     virar à mão, porque a vitrine contratada pode ter saído por fora. */
  const [pedidos, setPedidos] = useState("");
  const ultimaConstrucao = versoes.find((v) => v.modo !== "ajuste")?.modo;
  const [base, setBase] = useState<"previa" | "completa">(ultimaConstrucao === "completa" ? "completa" : "previa");

  const urlDaImagem = (prod: Produto) => (prod.ativo_id ? urls[prod.ativo_id] ?? "" : "");

  /* ---------- o que falta, dito pelo nome ----------
     Marca, forma e conceito são as três que mudam o resultado inteiro: sem
     elas o compilado vira um catálogo com instruções genéricas em volta.
     Catálogo vazio entra na lista pelo mesmo motivo: não há o que montar.

     O ajuste pede outra coisa: uma alteração escrita. Ele não leva a ficha,
     então marca e forma não entram na conta. */
  const ajuste = modo === "ajuste";
  const falta = ajuste
    ? [!pedidos.trim() ? "escrever pelo menos uma alteração" : null]
    : [
        !produtos.length ? "o catálogo" : null,
        !(loja.identidade?.paleta ?? [])[0] ? "a marca" : null,
        !loja.forma?.layout ? "a forma" : null,
        !(loja.conceito?.tom ?? loja.conceito?.personalidade?.[0]) ? "o conceito" : null,
      ];
  const faltando = falta.filter(Boolean) as string[];

  const pronto = !faltando.length;

  /* Aviso, e não trava: dá para gerar sem escolher, e o resultado é pior
     de um jeito que só quem conhece a loja percebe. A frase diz exatamente
     o que vai acontecer em vez de pedir para você voltar. */
  const semEstrela = produtos.length > 0 && !produtos.some((x) => x.destaque);

  function gerar() {
    setRecado("");
    const texto = compilar(loja, produtos, urlDaImagem, modo, material, { pedidos, base });
    setMarkdown(texto);
    comGeracao(async () => {
      const r = await guardarPrompt(loja.id, texto, modo);
      if (!r.ok) setRecado(r.erro);
      router.refresh();
    });
  }

  async function copiar(texto: string, aviso = "Prompt copiado.") {
    try {
      await navigator.clipboard.writeText(texto);
      setRecado(aviso);
    } catch {
      setRecado("O navegador bloqueou a cópia. Use o botão de baixar.");
    }
  }

  function baixar() {
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${loja.arroba}-${modo}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* A linha pronta entra no fim do que já foi escrito, e não substitui:
     dois toques, duas alterações. Tocar de novo não duplica. */
  function acrescentar(linha: string) {
    setPedidos((atual) => {
      if (atual.includes(linha)) return atual;
      const limpo = atual.replace(/\s+$/, "");
      return limpo ? `${limpo}\n${linha}` : linha;
    });
  }

  return (
    /* Ele continua a faixa grafite da entrega, e não abre uma segunda: ver
       o CSS. */
    <section className={`${p.bloco} ${p.fecho}`}>
      <div className={p.blocoCab}>
        <h2>
          Prompt<i className={s.ponto}>.</i>
        </h2>
        <span className={p.blocoRot}>o que vai pro agente</span>
      </div>

      {/* ---------- o modo ----------
          Prévia é o padrão, e não uma opção secundária: é o que se faz em
          nove de cada dez fichas. A frase ao lado existe para a escolha não
          parecer um detalhe técnico. */}
      <div className={p.modos}>
        {(["previa", "completa", "ajuste"] as const).map((qual) => (
          <button
            key={qual}
            type="button"
            className={`${p.modo} ${modo === qual ? p.modoEscolhido : ""}`}
            onClick={() => setModo(qual)}
            aria-pressed={modo === qual}
          >
            <b>{qual === "previa" ? "Prévia" : qual === "completa" ? "Vitrine completa" : "Ajuste"}</b>
            <span>
              {qual === "previa"
                ? "uma página, 12 peças, sem filtro nem painel"
                : qual === "completa"
                  ? "catálogo inteiro, filtro e páginas de peça"
                  : "muda o que já está no ar: um link, um texto, o hero pelas estrelas"}
            </span>
          </button>
        ))}
      </div>

      {/* ---------- o que muda ----------
          Só no ajuste. Uma alteração por linha, e as que se repetem em toda
          vitrine entram por um toque, já com o @ resolvido. */}
      {ajuste && (
        <div className={p.ajuste}>
          <label className={s.campo}>
            <span className={s.campoRot}>O que muda, uma alteração por linha</span>
            <textarea
              rows={5}
              value={pedidos}
              placeholder={
                "Todo @ da página vira link para o Instagram da loja\nO preço da Samba preta passa a R$ 649,90\nTira a frase de frete grátis do topo"
              }
              onChange={(e) => setPedidos(e.target.value)}
            />
          </label>
          <div className={p.prontos}>
            {PRONTOS(loja.arroba).map((x) => (
              <button
                key={x.rotulo}
                type="button"
                className={`${s.btnMini} ${p.btnGrafite}`}
                onClick={() => acrescentar(x.linha)}
              >
                + {x.rotulo}
              </button>
            ))}
          </div>
          <p className={p.ajusteBase}>
            No ar hoje:{" "}
            {(["previa", "completa"] as const).map((qual) => (
              <button
                key={qual}
                type="button"
                className={`${p.baseOpcao} ${base === qual ? p.baseEscolhida : ""}`}
                onClick={() => setBase(qual)}
                aria-pressed={base === qual}
              >
                {qual === "previa" ? "a prévia" : "a vitrine contratada"}
              </button>
            ))}
            <span>
              {base === "previa"
                ? "O botão continua no WhatsApp do estúdio, e o prompt repete isso ao agente."
                : "O botão é o WhatsApp da loja, e o prompt manda não trocar."}
            </span>
          </p>
        </div>
      )}

      <div className={p.acoes}>
        <button
          type="button"
          className={`${s.btn} ${p.btnGrafite} ${pronto ? p.aVez : ""}`}
          onClick={gerar}
          disabled={!pronto || gerando}
        >
          {gerando ? "GERANDO…" : ajuste ? "GERAR O AJUSTE" : "GERAR O PROMPT"}
        </button>
        {markdown && (
          <>
            <button type="button" className={`${s.btnMini} ${p.btnGrafite}`} onClick={() => copiar(markdown)}>
              COPIAR
            </button>
            <button type="button" className={`${s.btnMini} ${p.btnGrafite}`} onClick={baixar}>
              BAIXAR .MD
            </button>
          </>
        )}
      </div>

      {/* O botão desabilitado nunca fica mudo: ele diz o que falta, com o
          nome do bloco que resolve. */}
      {!pronto && (
        <p className={p.aviso}>
          {ajuste
            ? "Falta escrever pelo menos uma alteração. O ajuste é a lista do que muda: sem ela, o agente não tem o que fazer além de conferir o hero."
            : `Falta ${faltando.join(", ").replace(/,([^,]*)$/, " e$1")}. Sem isso o compilado não tem o que dizer de específico: ele vira um catálogo com instruções de manual em volta.`}
        </p>
      )}

      {pronto && semEstrela && (
        <p className={p.aviso}>
          {ajuste
            ? "Nenhuma peça estrelada: o ajuste vai mandar não mexer no hero. Se o hero é o que muda, estrele as peças na tira do catálogo antes de gerar."
            : "Nenhuma peça escolhida: o hero vai sair com as primeiras da lista, que são as primeiras do feed. A estrela na miniatura do catálogo resolve isso em um minuto."}
        </p>
      )}

      {recado && <p className={p.aviso}>{recado}</p>}

      {markdown && (
        <pre className={p.markdown}>
          <code>{markdown}</code>
        </pre>
      )}

      {versoes.length > 0 && (
        <div className={p.versoes}>
          <p className={s.campoRot}>Últimas gerações</p>
          <ul>
            {versoes.map((v) => (
              <li key={v.id}>
                <span>{new Date(v.criado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
                <i>{NOME_DO_MODO[v.modo]}</i>
                <button
                  type="button"
                  className={`${s.btnMini} ${p.btnGrafite}`}
                  onClick={async () => {
                    /* O markdown vem só agora: a ficha carregou cinco datas,
                       não cinco prompts. */
                    const r = await buscarPrompt(v.id);
                    if (!r.ok) {
                      setRecado(r.erro);
                      return;
                    }
                    await copiar(r.markdown, "Versão copiada.");
                  }}
                >
                  COPIAR
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
