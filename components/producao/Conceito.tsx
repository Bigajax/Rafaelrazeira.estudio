"use client";

/* ============================================================
   O CONCEITO — o que a vitrine diz antes de mostrar preço

   Este é o bloco que separa uma vitrine com posicionamento de um catálogo
   bonito. Sem ele, o gerador escreve "descubra a excelência em calçados
   femininos" numa loja cuja legenda real é "corre que tem pouquinho".

   ---------- por que as sugestões são DERIVADAS ----------
   Uma lista genérica de adjetivos ("moderno", "elegante", "premium") é o
   jeito mais rápido de todo briefing ficar igual: escolher entre palavras
   soltas não é decidir posicionamento, é preencher formulário.

   As sugestões de AUTORIDADE aqui não são inventadas: elas saem do que a
   oficina já colheu. A nota do Google, a cidade da bio, as marcas que
   apareceram nas fotos, o tamanho da conta. Cada uma é um fato conferível,
   e fato conferível é a única autoridade que uma loja pequena tem para
   oferecer contra um e-commerce grande.

   ---------- o que NÃO ser ----------
   O último campo é o mais subestimado. "Não é loja de departamento" e "sem
   tom de liquidação" fazem mais pelo resultado do que três adjetivos
   positivos, porque o gerador tem um padrão forte de fábrica e o que o
   desvia é a negativa. E abaixo dele mora a lista LITERAL de palavras
   proibidas, que é a versão do mesmo princípio que não se interpreta.

   ---------- a reforma de 27/08 ----------
   Este bloco foi escrito antes do FORMA, e dizia coisa que virou do FORMA:
   grade, dobra, filtro, peças por tela. As duas descrições iam para o
   MESMO prompt, e discordavam. Estrutura saiu daqui inteira e o que ficou
   é só escrita: comprimento da frase, pessoa do discurso, como o preço é
   escrito, o que a voz nunca diz. Quando a voz e a forma ainda assim
   discordarem, o cartão selecionado avisa e não impede: às vezes a
   contradição é a decisão certa, mas ela não pode passar sem ser vista.
   ============================================================ */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarConceito } from "@/app/(pt)/crm/acoes-producao";
import s from "@/app/(pt)/crm/crm.module.css";
import p from "@/app/(pt)/crm/producao.module.css";
import {
  AMOSTRA_MINIMA,
  FAMILIAS,
  PROIBIDAS_PADRAO,
  PROIBIDAS_SUGESTAO,
  VOZES,
  VOZ_DE,
  comAPeca,
  conflitoDe,
  familiaDe,
  medirVoz,
  tomDe,
  type Familia,
} from "@/lib/producao/vozes";
import type { Ativo, Conceito as TipoConceito, Loja, Produto } from "@/lib/producao/tipos";
import { Sugestoes } from "./Sugestoes";

/* As doze vozes saíram deste arquivo e foram para lib/producao/vozes.ts
   (27/08). Elas passaram a ser lidas em dois lugares — aqui e no
   compilador, que precisa da palavra do botão e das regras de escrita —
   e definição duplicada é definição que diverge. */

/* ---------- os três campos de frase, com as opções que se repetem ----------
   Público, promessa e antipadrão mudam de loja para loja, mas não são
   inventados do zero toda vez: a loja de bairro atende quase sempre as
   mesmas quatro figuras, promete quase sempre a mesma coisa (ver preço sem
   perguntar), e o que ela NÃO é sai da lista curta de vícios de
   e-commerce grande.

   Marcar duas ou três é mais rápido e mais completo que escrever, e o
   campo segue editável para o caso que a lista não previu. */
const CAMPOS: {
  campo: "publico" | "promessa" | "evitar";
  pergunta: string;
  exemplo: string;
  opcoes: string[];
}[] = [
  {
    campo: "publico",
    pergunta: "Para quem é esta loja?",
    exemplo: "Mulheres de 25 a 40 que compram pelo Instagram.",
    opcoes: [
      "Mulheres de 25 a 40",
      "Público jovem, de 18 a 28",
      "Quem compra pelo Instagram e odeia esperar resposta",
      "Cliente da cidade que prefere ver e retirar",
      "Quem chegou pelo anúncio e não conhece a loja",
      "Cliente antiga, que já compra há anos",
    ],
  },
  {
    campo: "promessa",
    pergunta: "O que a vitrine promete?",
    exemplo: "Ver preço e tamanho sem precisar perguntar.",
    opcoes: [
      "Ver preço e tamanho sem precisar perguntar",
      "Achar a peça em menos de um minuto",
      "Saber o que tem na loja antes de ir até lá",
      "Pedir sem sair da conversa",
      "Ver a coleção inteira em um link só",
    ],
  },
  {
    campo: "evitar",
    pergunta: "O que ela NÃO é?",
    exemplo: "Não é loja de departamento. Sem tom de liquidação.",
    opcoes: [
      "Não é loja de departamento",
      "Sem tom de liquidação",
      "Sem contagem regressiva nem urgência falsa",
      "Não é catálogo de atacado",
      "Sem linguagem de e-commerce grande",
      "Nada de estoque baixo piscando",
    ],
  },
];

export function Conceito({
  loja,
  produtos,
  ativos,
}: {
  loja: Loja;
  produtos: Produto[];
  /* Só pela legenda: ela é a única amostra que existe da voz da loja
     escrita pela própria dona, e estava na bancada sem ninguém ler. */
  ativos: Ativo[];
}) {
  const router = useRouter();
  /* ---------- a ficha antiga abre ----------
     Antes de hoje a voz era lista e podia ter três marcadas. `tom` passa a
     mandar, e quando ele não existe a primeira da lista velha vira ele.
     A família nunca foi gravada: ela se deduz do tom, e por isso não
     precisa de conversão nenhuma no banco. */
  const [conceito, setConceito] = useState<TipoConceito>(() => {
    const salvo = loja.conceito ?? {};
    const tom = salvo.tom ?? salvo.personalidade?.[0] ?? null;
    return {
      ...salvo,
      tom,
      familia: salvo.familia ?? VOZ_DE(tom)?.familia ?? null,
      cta: salvo.cta ?? VOZ_DE(tom)?.botao ?? "",
      proibidas: salvo.proibidas ?? PROIBIDAS_PADRAO,
    };
  });
  const [recado, setRecado] = useState("");
  const [salvando, comSalvamento] = useTransition();
  /* A origem da voz, como no FORMA: tracejado enquanto for a máquina que
     respondeu. Vive só no estado porque a leitura das legendas é um clique
     seu, e o tracejado é a resposta a esse clique. */
  const [vozInferida, setVozInferida] = useState(false);
  const [novaProibida, setNovaProibida] = useState("");

  const tom = conceito.tom ?? null;
  const familia = conceito.familia ?? null;
  const proibidas = conceito.proibidas ?? [];
  const autoridades = conceito.autoridade ?? [];
  const [novoFato, setNovoFato] = useState("");

  /* ---------- o exemplo com a peça dela ----------
     "Campus creme · 899 · 34 ao 39" é a peça de outra loja, e é o que faz
     doze cartões parecerem catálogo de agência. A estrelada vem primeiro
     porque ela é a peça que você escolheu para abrir a vitrine: ver a
     manchete com ELA dentro é ver a frase que vai existir. */
  /* Na ordem do HERO, e não na do catálogo: a tira de escolhidas existe
     para dizer qual peça abre a vitrine, e é essa que deve aparecer na
     manchete de exemplo. Com a ordem do catálogo, a frase mostrava a
     segunda escolhida só porque ela é mais antiga no feed. */
  const estreladas = produtos
    .filter((x) => x.destaque)
    .sort((a, b) => (a.ordem_destaque ?? 1e9) - (b.ordem_destaque ?? 1e9) || a.ordem - b.ordem);
  const exemplo =
    estreladas.find((x) => x.preco !== null && x.tamanhos) ??
    estreladas.find((x) => x.preco !== null) ??
    produtos.find((x) => x.preco !== null) ??
    null;

  const legendas = ativos.map((a) => a.legenda ?? "").filter((x) => x.trim());

  /* ---------- a voz medida nas legendas ----------
     Oito sinais contados, sem modelo: emoji, exclamação, caixa alta,
     gíria, pessoa, preço, urgência e comprimento. A família sai com
     confiança; o cartão sai como palpite, e é por isso que os dois nascem
     tracejados. */
  function lerAVoz() {
    const sinais = medirVoz(legendas);
    const fam = familiaDe(sinais);
    if (!fam) {
      setRecado(
        `Li ${sinais.legendas} ${sinais.legendas === 1 ? "legenda" : "legendas"} e nenhum sinal dominou: emoji, gíria, preço e urgência ficaram todos no meio. A escolha é sua.`,
      );
      return;
    }
    const escolhido = tomDe(fam, sinais);
    setConceito((c) => ({
      ...c,
      familia: fam,
      tom: escolhido,
      personalidade: [escolhido],
      /* A palavra do botão acompanha, MENOS se você já mexeu nela: o
         aviso de sobrescrita vale para a leitura automática também. */
      cta: c.cta_editado ? c.cta : VOZ_DE(escolhido)?.botao ?? c.cta,
    }));
    setVozInferida(true);
    setRecado(
      sinais.legendas < AMOSTRA_MINIMA
        ? `Só ${sinais.legendas} ${sinais.legendas === 1 ? "legenda" : "legendas"} com texto: é amostra pequena demais para confiar, e a sugestão vale como chute. Confira.`
        : `${sinais.legendas} legendas lidas. ${sinais.emoji.toFixed(1)} emoji e ${Math.round(sinais.palavras)} palavras por legenda, preço escrito em ${Math.round(sinais.preco * 100)}% delas.`,
    );
  }

  /* ---------- escolher um tom ----------
     Um só, e não vários: a vitrine tem uma voz. A palavra do botão vem
     junto, e é aqui que mora a única pergunta desta tela: se você já
     escreveu a palavra à mão, trocar de tom não a apaga em silêncio. */
  function escolherTom(nome: string) {
    const voz = VOZ_DE(nome);
    if (!voz) return;
    let cta = conceito.cta ?? "";
    let editado = conceito.cta_editado ?? false;
    if (editado && cta.trim() && cta.trim().toLowerCase() !== voz.botao.toLowerCase()) {
      const trocar = window.confirm(
        `Você escreveu "${cta}" no botão. Trocar para "${voz.botao}", que é a palavra desta voz?`,
      );
      if (trocar) {
        cta = voz.botao;
        editado = false;
      }
    } else {
      cta = voz.botao;
    }
    setConceito((c) => ({
      ...c,
      tom: nome,
      familia: voz.familia,
      personalidade: [nome],
      cta,
      cta_editado: editado,
    }));
    setVozInferida(false);
  }

  const alternarProibida = (palavra: string) =>
    setConceito((c) => {
      const atual = c.proibidas ?? [];
      return {
        ...c,
        proibidas: atual.includes(palavra)
          ? atual.filter((x) => x !== palavra)
          : [...atual, palavra],
      };
    });

  /* ---------- a autoridade que esta loja JÁ TEM ----------
     Cada linha aqui é um fato que a oficina colheu, não um elogio que eu
     inventei. É isso que uma loja pequena pode dizer contra um e-commerce
     grande, e quase sempre ela não sabe que pode. */
  const sugeridas: string[] = [];
  const lugar = loja.lugar;
  if (lugar?.nota != null) {
    sugeridas.push(
      `${String(lugar.nota).replace(".", ",")} no Google${lugar.avaliacoes ? ` em ${lugar.avaliacoes} avaliações` : ""}`,
    );
  }
  if (lugar?.endereco) {
    /* A cidade sai do endereço formatado do Google ("Rua X, 123 - Bairro,
       Maringá - PR"): é a parte que interessa numa vitrine, e o resto vai
       para a seção de endereço, não para a autoridade. */
    const cidade = lugar.endereco.split(",").slice(-2)[0]?.trim().split(" - ").pop();
    if (cidade) sugeridas.push(`Loja física em ${cidade}`);
  }
  const marcas = [...new Set(produtos.map((x) => x.marca).filter(Boolean))].slice(0, 3);
  if (marcas.length) sugeridas.push(`Trabalha com ${marcas.join(", ")}`);
  if ((loja.seguidores ?? 0) >= 1000) {
    sugeridas.push(`${(loja.seguidores as number).toLocaleString("pt-BR")} seguidores no Instagram`);
  }
  if (produtos.length >= 20) sugeridas.push(`${produtos.length} peças no catálogo`);
  sugeridas.push("Atendimento direto com a dona", "Seleção feita a dedo, não por algoritmo");

  /* Só a autoridade continua sendo lista de marcar: ela é um punhado de
     fatos, e quantos mais, melhor. A voz virou uma. */
  const alternarFato = (item: string) =>
    setConceito((c) => ({
      ...c,
      autoridade: autoridades.includes(item)
        ? autoridades.filter((x) => x !== item)
        : [...autoridades, item],
    }));

  return (
    <section className={p.bloco}>
      <div className={p.blocoCab}>
        <h2>
          Conceito<i className={s.ponto}>.</i>
        </h2>
        <span className={p.blocoRot}>o que a vitrine diz</span>
        {/* A legenda dos posts é a voz da loja escrita pela própria dona, e
            ela está na bancada desde a primeira colheita. Mesmo lugar e
            mesma promessa do LER AS CORES DAS FOTOS: a máquina responde o
            que dá para contar, e você confirma. */}
        <button
          type="button"
          className={s.btnMini}
          onClick={lerAVoz}
          disabled={!legendas.length}
          title={legendas.length ? undefined : "sem legendas na bancada"}
        >
          {legendas.length ? "LER A VOZ DAS LEGENDAS" : "SEM LEGENDAS NA BANCADA"}
        </button>
      </div>

      <p className={p.perguntasRot}>
        Como esta marca fala
        {tom && <b>1</b>}
        {vozInferida && <em>inferida das legendas, ainda não confirmada</em>}
      </p>

      {/* ---------- quatro famílias de três ----------
          Doze cartões soltos são doze decisões. Quatro famílias são uma
          decisão grossa e uma fina, que é como a escolha acontece de fato:
          primeiro "essa loja é contida ou é falante", depois qual das três.
          A leitura das legendas acerta a família muito mais do que acerta o
          cartão, e assim ela pode responder só o que sabe. */}
      {FAMILIAS.map((f) => (
        <div key={f.id} className={p.familia}>
          <p className={p.familiaRot}>{f.rotulo}</p>
          <ul className={p.vozes}>
            {VOZES.filter((v) => v.familia === f.id).map((v) => {
              const escolhida = tom === v.nome;
              /* O conflito aparece SÓ no cartão escolhido: mostrar quatro
                 avisos de uma vez seria transformar a tela num painel de
                 erro, e nenhum deles vale nada antes de a voz ser a voz. */
              const conflito = escolhida ? conflitoDe(v.nome, loja.forma) : null;
              return (
                <li key={v.nome}>
                  <button
                    type="button"
                    className={`${p.voz} ${escolhida ? p.vozEscolhida : ""} ${
                      escolhida && vozInferida ? p.inferido : ""
                    }`}
                    onClick={() => escolherTom(v.nome)}
                    aria-pressed={escolhida}
                  >
                    <b>{v.nome}</b>
                    <span>{v.nota}</span>
                    {/* A manchete é a parte mais concreta do cartão: é a
                        frase que abriria a página se esta voz vencesse, e
                        com a peça REAL da loja dentro ela deixa de ser
                        exemplo e passa a ser a frase que vai existir. */}
                    <q>{comAPeca(v.manchete, exemplo)}</q>
                    <i>{v.botao}</i>
                    <small>{v.escrita}</small>
                    {conflito && <u className={p.conflito}>{conflito}</u>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {/* ---------- a palavra do botão ----------
          É o texto que mais se repete numa vitrine, e o único da ficha em
          que a dona da loja costuma ter opinião formada. Ele nasce do tom
          escolhido e continua seu: uma vez editado, trocar de tom pergunta
          antes de sobrescrever. */}
      <p className={p.perguntasRot}>A palavra do botão</p>
      <div className={p.cta}>
        <input
          value={conceito.cta ?? ""}
          maxLength={18}
          aria-label="A palavra do botão de pedido"
          placeholder="Pedir no zap"
          onChange={(e) =>
            setConceito((c) => ({ ...c, cta: e.target.value, cta_editado: true }))
          }
        />
        <span>{(conceito.cta ?? "").length}/18</span>
      </div>
      <small className={p.formaNota}>
        essa palavra vai em todo botão da vitrine. O agente usa ela literalmente.
      </small>

      <p className={p.perguntasRot}>
        Por que confiar nela
        <b>{autoridades.length}</b>
        {/* A lista curta não é falta de ideia: ela é o retrato do que ainda
           não foi colhido. Dizer isso aqui evita a leitura de que a loja
           não tem nada a oferecer. */}
        {sugeridas.length <= 2 && (
          <em>as outras aparecem quando o Google achar a loja e o catálogo for lido</em>
        )}
      </p>
      {/* Fato conferível é a única autoridade que uma loja pequena tem para
          oferecer contra um e-commerce grande, e quase sempre ela não sabe
          que tem. Estes saíram do Google, da bio e das próprias fotos. */}
      {/* A lista mostra o que a oficina deduziu E o que você acrescentou:
         separar as duas em caixas diferentes faria você escolher entre
         "fato do sistema" e "fato meu", distinção que não existe para quem
         vai ler a página. */}
      <ul className={p.provas}>
        {[...new Set([...sugeridas, ...autoridades])].map((fato) => (
          <li key={fato}>
            <button
              type="button"
              className={`${p.prova2} ${autoridades.includes(fato) ? p.prova2Escolhida : ""}`}
              onClick={() => alternarFato(fato)}
              aria-pressed={autoridades.includes(fato)}
            >
              {fato}
            </button>
          </li>
        ))}
      </ul>

      {/* ---------- o que a máquina não tem como saber ----------
         "Quinze anos de casa", "a única revenda oficial da cidade", "quem
         atende é a dona desde 2011". Nada disso está no Google nem nas
         fotos, e costuma ser a prova mais forte que a loja tem. Sem este
         campo, a lista ficaria limitada ao que a colheita alcança. */}
      <div className={p.fatoNovo}>
        <input
          value={novoFato}
          aria-label="Acrescentar um fato sobre a loja"
          placeholder="Sabe de outro fato? 15 anos de casa, revenda oficial, atendimento da dona…"
          onChange={(e) => setNovoFato(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            const fato = novoFato.trim();
            if (!fato || autoridades.includes(fato)) return;
            setConceito((c) => ({ ...c, autoridade: [...autoridades, fato] }));
            setNovoFato("");
          }}
        />
        <span>enter para juntar</span>
      </div>

      <div className={p.conceitoCampos}>
        {CAMPOS.map(({ campo, pergunta, exemplo, opcoes }) => {
          const respondida = Boolean((conceito[campo] ?? "").trim());
          return (
            <div key={campo} className={`${p.pergunta} ${respondida ? p.perguntaOk : ""}`}>
              <label>
                <span>{pergunta}</span>
                <input
                  value={conceito[campo] ?? ""}
                  placeholder={exemplo}
                  onChange={(e) => setConceito((c) => ({ ...c, [campo]: e.target.value }))}
                />
              </label>
              <Sugestoes
                opcoes={opcoes}
                valor={conceito[campo] ?? ""}
                aoEscolher={(novo) => setConceito((c) => ({ ...c, [campo]: novo }))}
              />
            </div>
          );
        })}
      </div>

      {/* ---------- a lista literal ----------
          "O que ela NÃO é" é posicionamento, e posicionamento se
          interpreta. Esta lista não se interpreta: são as palavras que o
          padrão de fábrica de qualquer gerador escreve sozinho na primeira
          tentativa, e proibi-las pelo nome é a única coisa que segura.

          As cinco primeiras vêm marcadas em ficha nova porque não existe
          loja em que elas ajudem: são o vocabulário de e-commerce grande em
          promoção, e é disso que a vitrine de bairro precisa não parecer. */}
      <p className={p.perguntasRot}>
        Palavra que não pode aparecer
        <b>{proibidas.length}</b>
      </p>
      <ul className={p.provas}>
        {[...new Set([...PROIBIDAS_PADRAO, ...PROIBIDAS_SUGESTAO, ...proibidas])].map((palavra) => (
          <li key={palavra}>
            <button
              type="button"
              className={`${p.prova2} ${
                proibidas.includes(palavra) ? `${p.prova2Escolhida} ${p.prova2Proibida}` : ""
              }`}
              onClick={() => alternarProibida(palavra)}
              aria-pressed={proibidas.includes(palavra)}
            >
              {palavra}
            </button>
          </li>
        ))}
      </ul>
      <div className={p.fatoNovo}>
        <input
          value={novaProibida}
          aria-label="Acrescentar uma palavra proibida"
          placeholder="Outra palavra que não pode aparecer na página…"
          onChange={(e) => setNovaProibida(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            const palavra = novaProibida.trim().toLowerCase();
            if (!palavra || proibidas.includes(palavra)) return;
            setConceito((c) => ({ ...c, proibidas: [...(c.proibidas ?? []), palavra] }));
            setNovaProibida("");
          }}
        />
        <span>enter para juntar</span>
      </div>

      <button
        type="button"
        className={s.btn}
        disabled={salvando}
        onClick={() =>
          comSalvamento(async () => {
            const r = await salvarConceito(loja.id, conceito);
            setRecado(r.ok ? "Conceito guardado." : r.erro);
            router.refresh();
          })
        }
      >
        {salvando ? "GUARDANDO…" : "GUARDAR O CONCEITO"}
      </button>
      {recado && <p className={p.aviso}>{recado}</p>}
    </section>
  );
}
