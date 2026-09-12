"use client";

/* ============================================================
   O BLOCO FORMA — o que o catálogo exige

   Ele entra entre MARCA e CONCEITO porque é essa a ordem da decisão: a cor
   e a letra dizem como a página PARECE, a forma diz o que ela COMPORTA, e o
   conceito diz o que ela DIZ. Estrutura decidida depois do texto é
   estrutura que se adapta ao texto, e aqui é o contrário: sessenta peças
   com numeração não cabem numa vitrine de oito, por mais bem escrito que
   esteja o briefing.

   ---------- inferido é tracejado até você tocar ----------
   Quase tudo aqui é deduzido do catálogo lido. Dedução e decisão não podem
   ter a mesma cara: campo inferido fica com borda tracejada e a palavra
   `inferido` no canto, e vira sólido no clique. No primeiro carregamento
   NENHUM card é sólido, mesmo quando a inferência acertou tudo.

   ---------- o que só a foto responde ----------
   Proporção e fundo branco não estão em texto nenhum: eles são medidos das
   imagens, atrás do botão "ler a forma das fotos", pelo mesmo caminho da
   paleta (as cópias no Storage, que têm CORS; a URL crua do Instagram
   contamina o canvas e faz `getImageData` lançar).

   E a leitura de fundo degrada mal: still em fundo branco e modelo em
   estúdio branco dão a mesma borda clara. Na dúvida ela devolve `misto`,
   que custa um clique seu; `still` errado muda o grid inteiro.
   ============================================================ */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarForma } from "@/app/(pt)/crm/acoes-producao";
import s from "@/app/(pt)/crm/crm.module.css";
import p from "@/app/(pt)/crm/producao.module.css";
import {
  FOTOS_PADRAO,
  FOTOS_POSSIVEIS,
  FORMA_VAZIA,
  HEROS,
  HERO_VAZIO,
  LAYOUTS,
  MARCAS_NA_TIRA,
  OPCOES,
  arquetipoAtual,
  faixaDe,
  heroDe,
  marcasDo,
  temTiraDeMarcas,
  inferirDoCatalogo,
  layoutDe,
  type Dobra,
  type Forma as TipoForma,
  type Foto,
  type Hero as TipoHero,
  type HeroArquetipo,
  type Layout,
  type NFotos,
  type Origem,
  type TextoHero,
  type Variacao,
} from "@/lib/producao/forma";
import type { Ativo, Loja, Produto } from "@/lib/producao/tipos";

/* Doze fotos bastam para a proporção: o formato de uma loja é uma decisão
   de quem fotografa, e ela não muda no meio do feed. */
const FOTOS_LIDAS = 12;
const LADO = 64;

const ROTULO_FAIXA: Record<string, string> = {
  curto: "curto · até 15",
  medio: "médio · 16 a 60",
  longo: "longo · mais de 60",
};

export function Forma({
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
  const [forma, setForma] = useState<TipoForma>(() => {
    const salva = loja.forma;
    if (salva) {
      /* A FAIXA saiu, e a ficha salva com ela abre na grade de entrada em
         vez de abrir vazia: o arquétipo continua marcado como estava, e o
         que mudou foi o nome da coisa mais próxima que existe hoje. */
      const hero = salva.hero
        ? { ...HERO_VAZIO, ...salva.hero, arquetipo: arquetipoAtual(salva.hero.arquetipo) }
        : null;
      return { ...FORMA_VAZIA, ...salva, hero, origem: salva.origem ?? {} };
    }
    /* Sem forma salva, o que o catálogo já responde entra como inferido, e o
       arquétipo vem junto: ele é a soma desses campos. */
    const doCatalogo = inferirDoCatalogo(produtos);
    if (!Object.keys(doCatalogo).length) return FORMA_VAZIA;
    const origem = Object.fromEntries(
      Object.keys(doCatalogo).map((k) => [k, "inferido" as Origem]),
    ) as TipoForma["origem"];
    const layout = layoutDe(doCatalogo);
    /* O hero também é soma de palpites, e nasce palpite: arquétipo pelo
       tipo de foto e pela faixa, número de fotos pelo padrão do arquétipo.
       As duas outras respostas (de onde vem o texto, o que fica acima da
       dobra) NÃO são inferidas: nenhum dado da ficha as responde, e um
       palpite ali seria só um valor escolhido por ninguém. */
    const arquetipo = heroDe(doCatalogo);
    const hero: TipoHero = {
      ...HERO_VAZIO,
      arquetipo,
      n_fotos: FOTOS_PADRAO[arquetipo],
      tira_marcas: temTiraDeMarcas(produtos),
      marcas: marcasDo(produtos),
    };
    return {
      ...FORMA_VAZIA,
      ...doCatalogo,
      layout,
      hero,
      origem: { ...origem, layout: "inferido", hero: "inferido", hero_fotos: "inferido" },
    };
  });

  const [lendo, setLendo] = useState(false);
  const [recado, setRecado] = useState("");
  const [salvando, comSalvamento] = useTransition();

  /* A chave é a do `origem`, e não a do `Forma`: duas marcas (`hero_fotos`,
     `destaques`) existem lá sem existir aqui, porque descrevem decisões que
     não são um campo só. */
  type Marca = keyof TipoForma["origem"];
  const origemDe = (campo: Marca) => forma.origem?.[campo];
  const classeOrigem = (campo: Marca) => (origemDe(campo) === "inferido" ? p.inferido : "");

  /* Toda mudança à mão CONFIRMA o campo. É a única forma de o palpite virar
     decisão, e ela não pede botão próprio: tocar já é decidir. */
  function definir<K extends keyof TipoForma>(campo: K, valor: TipoForma[K]) {
    setForma((f) => ({
      ...f,
      [campo]: valor,
      origem: { ...f.origem, [campo]: "confirmado" as Origem },
    }));
  }

  /* Cada campo do hero confirma o que é DELE. O arquétipo e o número de
     fotos têm marcas separadas porque se decidem separado: trocar de
     mosaico para faixa é uma decisão, e mudar de 5 para 7 fotos é outra.
     Texto e dobra não têm marca nenhuma: eles nunca foram inferidos. */
  function definirHero<K extends keyof TipoHero>(campo: K, valor: TipoHero[K]) {
    setForma((f) => {
      const hero = { ...(f.hero ?? HERO_VAZIO), [campo]: valor };
      /* Trocar de arquétipo pode invalidar o número de fotos: faixa não
         desce a 1, peça única é sempre 1. Reencaixa em vez de guardar um
         valor que a régua nova não oferece. */
      if (campo === "arquetipo") {
        const cabe = FOTOS_POSSIVEIS[valor as HeroArquetipo];
        if (valor === "peca_unica") hero.n_fotos = 1;
        else if (hero.n_fotos === null || !cabe.includes(hero.n_fotos)) {
          hero.n_fotos = FOTOS_PADRAO[valor as HeroArquetipo];
        }
      }
      const chave = campo === "arquetipo" ? "hero" : campo === "n_fotos" ? "hero_fotos" : null;
      return {
        ...f,
        hero,
        origem: chave ? { ...f.origem, [chave]: "confirmado" as Origem } : f.origem,
      };
    });
  }

  function alternarVariacao(v: Variacao) {
    const tem = forma.variacao.includes(v);
    /* "Não varia" é exclusivo: marcar junto com numeração seria dizer as
       duas coisas ao mesmo tempo. */
    const lista =
      v === "nenhuma"
        ? tem
          ? []
          : ["nenhuma" as Variacao]
        : tem
          ? forma.variacao.filter((x) => x !== v)
          : [...forma.variacao.filter((x) => x !== "nenhuma"), v];
    definir("variacao", lista);
  }

  /* ---------- a leitura das fotos ----------
     Proporção média e clareza da borda, no navegador, sobre as cópias do
     Storage. O resultado entra como INFERIDO, nunca como confirmado. */
  async function lerFotos() {
    setLendo(true);
    setRecado("");
    const fontes = ativos.slice(0, FOTOS_LIDAS).map((a) => urls[a.id]).filter(Boolean);
    const medidas = await medirFotos(fontes);
    setLendo(false);

    if (!medidas) {
      setRecado("Não consegui ler as fotos. Elas já foram colhidas?");
      return;
    }

    setForma((f) => {
      const nova = { ...f, foto: medidas.foto, origem: { ...f.origem, foto: "inferido" as Origem } };
      /* O arquétipo depende da proporção quando o catálogo é curto: ler as
         fotos pode mudar a resposta, e ele volta a ser palpite. */
      if (origemDe("layout") !== "confirmado") {
        nova.layout = layoutDe(nova);
        nova.origem = { ...nova.origem, layout: "inferido" };
      }
      /* O hero é o que MAIS muda com a leitura das fotos, e é o motivo de
         o botão existir: objeto na mão e catálogo misto viram letreiro,
         porque foto de chão de loja a 800px sangrando deixa de mostrar a
         peça e passa a mostrar o chão. */
      if (origemDe("hero") !== "confirmado") {
        const arquetipo = heroDe(nova);
        const antes = nova.hero ?? HERO_VAZIO;
        const cabe = FOTOS_POSSIVEIS[arquetipo];
        const n =
          origemDe("hero_fotos") === "confirmado" && antes.n_fotos !== null && cabe.includes(antes.n_fotos)
            ? antes.n_fotos
            : FOTOS_PADRAO[arquetipo];
        /* A tira é apurada na MESMA passada, e não num botão próprio: ela
           sai do catálogo, não das fotos, mas quem clica aqui está pedindo
           que a máquina responda o que der, e um segundo botão para contar
           marcas seria um clique a mais por nada. */
        nova.hero = {
          ...antes,
          arquetipo,
          n_fotos: n,
          tira_marcas: antes.tira_marcas ?? temTiraDeMarcas(produtos),
          marcas: marcasDo(produtos),
        };
        nova.origem = { ...nova.origem, hero: "inferido" };
      }
      return nova;
    });
    setRecado(medidas.nota);
  }

  const faixa = forma.volume ? faixaDe(forma.volume) : forma.faixa;
  const hero = forma.hero ?? HERO_VAZIO;
  /* Recalculadas do catálogo a cada render, e não lidas do que está salvo:
     ler o catálogo de novo muda a lista, e a tela tem que mostrar a de
     agora. O que fica salvo serve à ficha, não a esta linha. */
  const marcas = marcasDo(produtos);

  return (
    <section className={p.bloco}>
      <div className={p.blocoCab}>
        <h2>
          Forma<i className={s.ponto}>.</i>
        </h2>
        <span className={p.blocoRot}>o que o catálogo exige</span>
        <button type="button" className={s.btnMini} onClick={lerFotos} disabled={lendo || !ativos.length}>
          {lendo ? "MEDINDO AS FOTOS…" : "LER A FORMA DAS FOTOS"}
        </button>
      </div>

      {recado && <p className={p.aviso}>{recado}</p>}

      {/* ---------- volume ---------- */}
      <p className={p.perguntasRot}>Quantas peças entram?</p>
      <div className={p.volume}>
        <input
          type="number"
          min={0}
          aria-label="Número de peças no catálogo"
          value={forma.volume ?? ""}
          onChange={(e) => {
            const n = e.target.value === "" ? null : Number(e.target.value);
            setForma((f) => ({
              ...f,
              volume: n,
              faixa: n ? faixaDe(n) : null,
              origem: { ...f.origem, volume: "confirmado", faixa: "confirmado" },
            }));
          }}
        />
        <span className={`${p.faixa} ${classeOrigem("faixa")}`}>{faixa ? ROTULO_FAIXA[faixa] : "sem faixa"}</span>
        <small>abaixo de 15 peças não existe filtro nem categoria: é uma tela só</small>
      </div>

      {/* ---------- foto ---------- */}
      <Campo
        titulo="Como são as fotos?"
        nota="decide o corte do card. Card 4:5 corta tênis fotografado quadrado."
        origem={origemDe("foto")}
      >
        {OPCOES.foto.map((o) => (
          <Chip
            key={o.id}
            nome={o.nome}
            nota={o.nota}
            marcado={forma.foto === o.id}
            inferido={origemDe("foto") === "inferido"}
            aoClicar={() => definir("foto", o.id as Foto)}
          />
        ))}
      </Campo>

      {/* ---------- variação ---------- */}
      <Campo titulo="A peça varia em quê?" nota="marque quantas valerem" origem={origemDe("variacao")}>
        {OPCOES.variacao.map((o) => (
          <Chip
            key={o.id}
            nome={o.nome}
            nota={o.nota}
            marcado={forma.variacao.includes(o.id)}
            inferido={origemDe("variacao") === "inferido"}
            aoClicar={() => alternarVariacao(o.id)}
          />
        ))}
      </Campo>

      {/* ---------- preço ---------- */}
      <Campo titulo="O preço aparece?" nota="decisão da loja, não de estilo" origem={origemDe("preco")}>
        {OPCOES.preco.map((o) => (
          <Chip
            key={o.id}
            nome={o.nome}
            marcado={forma.preco === o.id}
            inferido={origemDe("preco") === "inferido"}
            aoClicar={() => definir("preco", o.id)}
          />
        ))}
      </Campo>

      {/* ---------- clique ---------- */}
      <Campo titulo="O que acontece no clique?" nota="é a conversão inteira" origem={origemDe("clique")}>
        {OPCOES.clique.map((o) => (
          <Chip
            key={o.id}
            nome={o.nome}
            marcado={forma.clique === o.id}
            inferido={origemDe("clique") === "inferido"}
            aoClicar={() => definir("clique", o.id)}
          />
        ))}
      </Campo>

      <div className={p.formaDupla}>
        {/* ---------- categorias ---------- */}
        <Campo titulo="Tem categoria?" origem={origemDe("categorias")}>
          <Chip
            nome="Não"
            marcado={forma.categorias === false}
            inferido={origemDe("categorias") === "inferido"}
            aoClicar={() => {
              definir("categorias", false);
              setForma((f) => ({ ...f, n_categorias: null }));
            }}
          />
          <Chip
            nome="Sim"
            marcado={forma.categorias === true}
            inferido={origemDe("categorias") === "inferido"}
            aoClicar={() => definir("categorias", true)}
          />
          {forma.categorias && (
            <input
              type="number"
              min={2}
              className={p.nCategorias}
              aria-label="Quantas categorias"
              value={forma.n_categorias ?? ""}
              onChange={(e) =>
                definir("n_categorias", e.target.value === "" ? null : Number(e.target.value))
              }
            />
          )}
        </Campo>

        {/* ---------- esgotado ---------- */}
        <Campo titulo="E peça esgotada?" origem={origemDe("esgotado")}>
          {OPCOES.esgotado.map((o) => (
            <Chip
              key={o.id}
              nome={o.nome}
              marcado={forma.esgotado === o.id}
              inferido={origemDe("esgotado") === "inferido"}
              aoClicar={() => definir("esgotado", o.id)}
            />
          ))}
        </Campo>
      </div>

      {/* ---------- o hero ----------
          Antes do layout porque decide a primeira tela, e a primeira tela
          é decidida por outra coisa: o layout responde ao VOLUME, o hero
          responde ao TIPO DE FOTO. Sessenta peças pedem grade densa
          embaixo e ainda podem abrir com uma foto só sangrando em cima. */}
      <p className={p.divisor}>
        <span>Hero</span>
        <i>a primeira tela</i>
      </p>

      <ul className={p.arquetipos}>
        {HEROS.map((h) => (
          <li key={h.id}>
            <button
              type="button"
              className={`${p.arquetipo} ${hero.arquetipo === h.id ? p.arquetipoEscolhido : ""} ${
                hero.arquetipo === h.id && origemDe("hero") === "inferido" ? p.inferido : ""
              }`}
              onClick={() => definirHero("arquetipo", h.id)}
              aria-pressed={hero.arquetipo === h.id}
            >
              <HeroWireframe id={h.id} />
              <b>{h.nome}</b>
              <span>{h.oque}</span>
              <small>{h.quando}</small>
            </button>
          </li>
        ))}
      </ul>

      {/* ---------- a tira de marcas ----------
          Não é um quinto arquétipo, e por isso não é um cartão: é um
          interruptor que vale para os quatro. A frase embaixo é o argumento
          inteiro, e ele é comercial: a cliente não conhece esta loja, mas
          conhece as marcas que ela vende. */}
      <Campo
        titulo="Tira de marcas"
        nota={
          marcas.length
            ? `${marcas.length} apuradas do catálogo: ${marcas.slice(0, MARCAS_NA_TIRA).join(" · ")}`
            : "nenhuma marca com duas peças ou mais no catálogo: sem material para a tira"
        }
        origem={origemDe("hero")}
      >
        <Chip
          nome="Não"
          marcado={hero.tira_marcas === false}
          inferido={origemDe("hero") === "inferido"}
          aoClicar={() => definirHero("tira_marcas", false)}
        />
        <Chip
          nome="Sim"
          nota="a cliente não conhece a loja, mas conhece Nike, Adidas e New Balance"
          marcado={hero.tira_marcas === true}
          inferido={origemDe("hero") === "inferido"}
          aoClicar={() => {
            /* Ligar à mão também apura: a tira pode ser ligada antes de
               qualquer leitura, e ela precisa de nomes para mostrar. */
            setForma((f) => ({
              ...f,
              hero: { ...(f.hero ?? HERO_VAZIO), tira_marcas: true, marcas: marcasDo(produtos) },
              origem: { ...f.origem, hero: "confirmado" as Origem },
            }));
          }}
        />
      </Campo>

      {/* ---------- quantas fotos ----------
          A régua muda com o arquétipo, e some inteira na peça única, que é
          uma foto por definição. Na faixa ela começa em 5: trilho de uma
          foto não é trilho, é peça única mal feita, e a tela não deve
          oferecer o erro. No letreiro a pergunta é outra (ter ou não ter
          foto), então ela é feita com outras palavras. */}
      {/* Régua vazia quer dizer que a pergunta não existe: peça única é uma
          foto por definição, e na grade de entrada o número é o de
          categorias do catálogo, que não é escolha sua. */}
      {hero.arquetipo && FOTOS_POSSIVEIS[hero.arquetipo].length > 0 && (
        <Campo
          titulo={hero.arquetipo === "letreiro" ? "Foto ao lado do nome?" : "Quantas fotos no hero?"}
          nota={
            hero.arquetipo === "letreiro"
              ? "uma foto pequena dá escala e prova que existe produto. Nenhuma deixa a tipografia sozinha."
              : undefined
          }
          origem={origemDe("hero_fotos")}
        >
          {FOTOS_POSSIVEIS[hero.arquetipo].map((n) => (
            <Chip
              key={n}
              nome={hero.arquetipo === "letreiro" ? (n === 0 ? "Nenhuma" : "Uma") : String(n)}
              marcado={hero.n_fotos === n}
              inferido={origemDe("hero_fotos") === "inferido"}
              aoClicar={() => definirHero("n_fotos", n as NFotos)}
            />
          ))}
        </Campo>
      )}

      <Campo titulo="O texto do hero vem de onde?" nota="a bio já foi escrita pela dona. Costuma ganhar de frase inventada.">
        {OPCOES.hero_texto.map((o) => (
          <Chip
            key={o.id}
            nome={o.nome}
            marcado={hero.texto === o.id}
            inferido={false}
            aoClicar={() => definirHero("texto", o.id as TextoHero)}
          />
        ))}
      </Campo>

      <Campo
        titulo="O que fica acima da dobra?"
        nota="a fileira espiando diz que tem catálogo embaixo. Sem ela, muita gente não rola."
      >
        {OPCOES.hero_dobra.map((o) => (
          <Chip
            key={o.id}
            nome={o.nome}
            marcado={hero.dobra === o.id}
            inferido={false}
            aoClicar={() => definirHero("dobra", o.id as Dobra)}
          />
        ))}
      </Campo>

      {/* ---------- os arquétipos de layout ---------- */}
      <p className={p.divisor}>
        <span>Layout</span>
        <i>o resto da página</i>
        {origemDe("layout") === "inferido" && <em>inferido pelo volume e pelas categorias</em>}
      </p>
      <ul className={p.arquetipos}>
        {LAYOUTS.map((l) => (
          <li key={l.id}>
            <button
              type="button"
              className={`${p.arquetipo} ${forma.layout === l.id ? p.arquetipoEscolhido : ""} ${
                forma.layout === l.id && origemDe("layout") === "inferido" ? p.inferido : ""
              }`}
              onClick={() => definir("layout", l.id as Layout)}
              aria-pressed={forma.layout === l.id}
            >
              <Wireframe id={l.id} />
              <b>{l.nome}</b>
              <span>{l.oque}</span>
              <small>{l.quando}</small>
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className={s.btn}
        disabled={salvando}
        onClick={() =>
          comSalvamento(async () => {
            const r = await salvarForma(loja.id, forma);
            setRecado(r.ok ? "Forma guardada." : r.erro);
            router.refresh();
          })
        }
      >
        {salvando ? "GUARDANDO…" : "GUARDAR A FORMA"}
      </button>
    </section>
  );
}

/* ---------- as peças da tela ---------- */

function Campo({
  titulo,
  nota,
  origem,
  children,
}: {
  titulo: string;
  nota?: string;
  origem?: Origem;
  children: React.ReactNode;
}) {
  return (
    <div className={p.formaCampo}>
      <p className={p.perguntasRot}>
        {titulo}
        {origem === "inferido" && <em>inferido</em>}
      </p>
      <div className={p.chips}>{children}</div>
      {nota && <small className={p.formaNota}>{nota}</small>}
    </div>
  );
}

function Chip({
  nome,
  nota,
  marcado,
  inferido,
  aoClicar,
}: {
  nome: string;
  nota?: string;
  marcado: boolean;
  inferido: boolean;
  aoClicar: () => void;
}) {
  return (
    <button
      type="button"
      /* Marcado e inferido é o estado que a tela precisava distinguir: a
         escolha aparece, mas a borda continua tracejada até você tocar. */
      className={`${p.chipForma} ${marcado ? p.chipMarcado : ""} ${marcado && inferido ? p.inferido : ""}`}
      onClick={aoClicar}
      aria-pressed={marcado}
    >
      <b>{nome}</b>
      {nota && <span>{nota}</span>}
    </button>
  );
}

/* Os quatro heros no mesmo desenho dos quatro layouts, e de propósito: são
   dois cardápios da mesma natureza, e um deles com ícone bonito faria o
   outro parecer secundário. A diferença está no CONTEÚDO do quadro, que
   aqui é sempre a primeira tela inteira, e nunca uma página rolada. */
function HeroWireframe({ id }: { id: HeroArquetipo }) {
  const bloco = (x: number, y: number, w: number, h: number, o = 0.22) => (
    <rect key={`${x}-${y}-${w}-${h}`} x={x} y={y} width={w} height={h} fill="currentColor" opacity={o} />
  );
  return (
    <svg className={p.wireframe} viewBox="0 0 100 64" role="img" aria-hidden focusable="false">
      {id === "mosaico" && (
        <>
          {bloco(6, 6, 22, 3, 0.4)}
          {bloco(6, 13, 44, 45)}
          {bloco(52, 13, 42, 21)}
          {bloco(52, 36, 20, 22)}
          {bloco(74, 36, 20, 22)}
        </>
      )}
      {id === "letreiro" && (
        <>
          {bloco(6, 14, 56, 13, 0.45)}
          {bloco(6, 30, 38, 13, 0.45)}
          {bloco(6, 49, 30, 3, 0.25)}
          {bloco(68, 14, 26, 32, 0.18)}
        </>
      )}
      {id === "peca_unica" && (
        <>
          {bloco(0, 0, 100, 46, 0.26)}
          {bloco(6, 52, 40, 3.5, 0.4)}
          {bloco(6, 58, 20, 3.5, 0.25)}
        </>
      )}
      {id === "grade_entrada" && (
        <>
          {bloco(6, 4, 20, 3, 0.4)}
          {/* Seis blocos iguais, e a tarja escura na base de cada um: é ela
              que diz que o nome da categoria fica SOBRE a foto e embaixo, e
              não centralizado no meio da imagem. */}
          {[0, 1].map((l) =>
            [0, 1, 2].map((c) => (
              <g key={`${l}-${c}`}>
                {bloco(6 + c * 30, 11 + l * 27, 26, 19)}
                {bloco(6 + c * 30, 25 + l * 27, 26, 5, 0.42)}
              </g>
            )),
          )}
        </>
      )}
    </svg>
  );
}

/* Wireframe e não miniatura de página: retângulo cinza mostra ESTRUTURA, e
   qualquer texto de mentira ali viraria a coisa mais lida do cartão. */
function Wireframe({ id }: { id: Layout }) {
  const cor = "currentColor";
  const bloco = (x: number, y: number, w: number, h: number, o = 0.22) => (
    <rect key={`${x}-${y}-${w}`} x={x} y={y} width={w} height={h} fill={cor} opacity={o} />
  );
  return (
    <svg className={p.wireframe} viewBox="0 0 100 64" role="img" aria-hidden focusable="false">
      {id === "feira" && (
        <>
          {bloco(8, 6, 84, 6, 0.35)}
          {[0, 1, 2].map((c) => [0, 1, 2].map((l) => bloco(8 + c * 30, 18 + l * 15, 24, 11))).flat()}
        </>
      )}
      {id === "vitrine" && (
        <>
          {bloco(14, 6, 72, 22)}
          {bloco(14, 32, 40, 3, 0.35)}
          {bloco(14, 40, 72, 22)}
        </>
      )}
      {id === "prateleira" && (
        <>
          {[0, 1, 2].map((l) => (
            <g key={l}>
              {bloco(8, 6 + l * 20, 26, 3, 0.35)}
              {bloco(8, 12 + l * 20, 22, 12)}
              {bloco(33, 12 + l * 20, 22, 12)}
              {bloco(58, 12 + l * 20, 22, 12)}
              {bloco(83, 12 + l * 20, 9, 12, 0.12)}
            </g>
          ))}
        </>
      )}
      {id === "ficha" && (
        <>
          {[0, 1].map((l) => (
            <g key={l}>
              {bloco(8, 8 + l * 28, 26, 22)}
              {bloco(38, 8 + l * 28, 40, 3, 0.35)}
              {bloco(38, 15 + l * 28, 54, 2, 0.18)}
              {bloco(38, 20 + l * 28, 54, 2, 0.18)}
              {bloco(38, 25 + l * 28, 30, 5, 0.28)}
            </g>
          ))}
        </>
      )}
    </svg>
  );
}

/* ---------- a medição ----------
   Proporção média das fotos e clareza das bordas. Roda sobre as cópias do
   Storage (públicas e com CORS); a URL assinada do Instagram contaminaria o
   canvas e `getImageData` lançaria.

   O critério de fundo é deliberadamente conservador: só chama de `still`
   quando a borda é quase branca em quase todas as fotos. Modelo em estúdio
   branco dá a mesma leitura, e errar para `still` muda o grid inteiro,
   enquanto errar para `misto` custa um clique. */
async function medirFotos(fontes: string[]): Promise<{ foto: Foto; nota: string } | null> {
  if (!fontes.length) return null;

  const tela = document.createElement("canvas");
  tela.width = LADO;
  tela.height = LADO;
  const ctx = tela.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  let lidas = 0;
  let quadradas = 0;
  let altas = 0;
  let bordasClaras = 0;

  for (const src of fontes) {
    const img = await new Promise<HTMLImageElement | null>((resolve) => {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.onload = () => resolve(el);
      el.onerror = () => resolve(null);
      el.src = src;
    });
    if (!img?.naturalWidth) continue;
    lidas++;

    const razao = img.naturalHeight / img.naturalWidth;
    if (razao <= 1.06) quadradas++;
    else if (razao >= 1.2) altas++;

    ctx.clearRect(0, 0, LADO, LADO);
    ctx.drawImage(img, 0, 0, LADO, LADO);
    try {
      const dados = ctx.getImageData(0, 0, LADO, LADO).data;
      let soma = 0;
      let n = 0;
      /* Só a moldura de 6px: o miolo é o produto, e ele não diz nada sobre
         o fundo. */
      for (let y = 0; y < LADO; y++) {
        for (let x = 0; x < LADO; x++) {
          const borda = x < 6 || y < 6 || x > LADO - 7 || y > LADO - 7;
          if (!borda) continue;
          const i = (y * LADO + x) * 4;
          soma += (dados[i] * 299 + dados[i + 1] * 587 + dados[i + 2] * 114) / 1000;
          n++;
        }
      }
      if (n && soma / n > 232) bordasClaras++;
    } catch {
      /* Canvas contaminado: a proporção continua valendo, o fundo não. */
    }
  }

  if (!lidas) return null;

  const parte = (x: number) => x / lidas;
  let foto: Foto = "misto";
  if (parte(bordasClaras) > 0.75 && parte(quadradas) > 0.6) foto = "still";
  else if (parte(altas) > 0.6) foto = "corpo";
  else if (parte(quadradas) > 0.6) foto = "objeto";

  const nota =
    foto === "misto"
      ? `${lidas} fotos medidas, sem formato dominante: ficou como misto. Se você souber que é still ou corpo, marque à mão.`
      : `${lidas} fotos medidas. Formato dominante: ${foto === "still" ? "still de fundo branco" : foto === "corpo" ? "corpo inteiro" : "objeto quadrado"}.`;

  return { foto, nota };
}
