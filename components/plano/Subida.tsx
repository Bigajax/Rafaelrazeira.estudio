"use client";

/* ============================================================
   A SUBIDA (30/09/2026)

   "Quero a página do plano mais didática e com personalidade." O placar
   de números virou uma montanha: o faturamento do mês é a altitude, cada
   prêmio é um acampamento na trilha e o cume é a visão (a agência). É a
   mesma neve da foto do Rafael no post "Prazer, sou o Rafael", e responde
   de longe a única pergunta que o placar não respondia: quanto falta para
   o próximo prêmio.

   A altitude é o que entrou no Caixa NESTE mês, porque é isso que destrava
   (um mês acima do patamar). O melhor mês do ano fica marcado na trilha
   como pegada, para mostrar até onde já se chegou.

   Um único movimento na tela: o marcador sobe da base até a altitude do mês
   quando a página abre. Com "reduzir movimento" ele já nasce no lugar.
   ============================================================ */

import { MESES_LONGOS, formatar, situacaoDoDegrau, type Degrau } from "@/lib/plano/tipos";
import p from "@/app/(pt)/crm/plano.module.css";

/* ---------- o desenho (viewBox 640 × 400) ----------
   Redesenho de 30/09 ("melhora o design disso aqui"): a primeira montanha
   era um triângulo chapado, com a serra cortada reta na borda e os rótulos
   em caixas escuras amontoados no cume. Agora:
   - a montanha tem volume: face iluminada à esquerda, face de sombra à
     direita, e a neve segue as duas;
   - duas serras atrás, mais claras quanto mais longe, e o céu clareia até
     o horizonte;
   - a trilha sobe em zigue-zague pela face iluminada;
   - os prêmios saem do desenho e vão para um ALTÍMETRO à direita: uma
     régua com uma marca na altura de cada patamar, ligada ao acampamento
     por um pontilhado. Os nomes ficam em coluna e nunca se sobrepõem. */
const PICO = { x: 250, y: 58 };
const PE_ESQ = 0; // onde a face iluminada toca o chão
const PE_CRISTA = 292; // onde a crista (luz × sombra) toca o chão
const PE_DIR = 446; // onde a face de sombra toca o chão
const CHAO = 380; // a altitude zero da trilha
const TOPO = 130; // o degrau mais alto fica aqui; acima dele só o cume
const REGUA = 470; // o altímetro

/* as bordas da face iluminada numa altura y */
const faceEsq = (y: number) => PE_ESQ + ((400 - y) * (PICO.x - PE_ESQ)) / (400 - PICO.y);
const crista = (y: number) => PICO.x + ((y - PICO.y) * (PE_CRISTA - PICO.x)) / (400 - PICO.y);

function pinheiro(x: number, base: number, alto: number) {
  const l = alto * 0.42;
  return `M${x} ${base - alto} L${x + l * 0.55} ${base - alto * 0.55} L${x + l * 0.3} ${base - alto * 0.55} L${x + l} ${base - alto * 0.12} L${x + l * 0.2} ${base - alto * 0.12} L${x + l * 0.2} ${base} L${x - l * 0.2} ${base} L${x - l * 0.2} ${base - alto * 0.12} L${x - l} ${base - alto * 0.12} L${x - l * 0.3} ${base - alto * 0.55} L${x - l * 0.55} ${base - alto * 0.55} Z`;
}

type Acampamento = { d: Degrau; y: number; x: number; destravado: boolean; proximo: boolean; quando: number | null };

export function Subida({
  ano,
  ate,
  degraus,
  recebido,
  vendido = {},
  visao,
  horizonte,
}: {
  ano: number;
  ate: number;
  degraus: Degrau[];
  recebido: Partial<Record<number, number>>;
  /* o ganho do mês (06/10): só leitura, os degraus seguem o Caixa */
  vendido?: Partial<Record<number, number>>;
  visao: string | null;
  horizonte: number | null;
}) {
  const lista = [...degraus].sort((a, b) => a.patamar - b.patamar || a.meses - b.meses);
  const teto = Math.max(1, ...lista.map((d) => d.patamar));
  /* degraus com o mesmo patamar (10 mil num mês e 10 mil por 3 meses) ficam
     um acima do outro: quem pede mais meses está mais alto na trilha */
  const altura = (v: number, extra = 0) => CHAO - Math.min(1, v / teto) * (CHAO - TOPO) - extra;
  let proximoAchado = false;
  const acampamentos: Acampamento[] = lista.map((d, i) => {
    const s = situacaoDoDegrau(d, recebido, ate);
    const repetidos = lista.slice(0, i).filter((o) => o.patamar === d.patamar).length;
    const y = altura(d.patamar, repetidos * 40);
    const proximo = !s.destravado && !proximoAchado;
    if (proximo) proximoAchado = true;
    /* zigue-zague: os acampamentos alternam entre a beira e o meio da face */
    const x = faceEsq(y) + (crista(y) - faceEsq(y)) * (i % 2 ? 0.72 : 0.38);
    return { d, y, x, destravado: s.destravado, proximo, quando: s.quando };
  });

  const doMes = ate ? recebido[ate] ?? 0 : 0;
  const melhor = Math.max(0, ...Array.from({ length: ate }, (_, i) => recebido[i + 1] ?? 0));
  const yVoce = altura(doMes);
  const yMelhor = altura(melhor);
  /* na trilha, a altitude cai entre dois acampamentos: o ponto é interpolado */
  const pontos = [
    { x: faceEsq(CHAO + 12) + 34, y: CHAO + 12 },
    ...acampamentos.map((a) => ({ x: a.x, y: a.y })),
    { x: PICO.x - 4, y: PICO.y + 8 },
  ];
  const naTrilha = (y: number) => {
    for (let k = 0; k < pontos.length - 1; k++) {
      const a = pontos[k];
      const b = pontos[k + 1];
      if (y <= a.y && y >= b.y) return a.x + ((a.y - y) / Math.max(1, a.y - b.y)) * (b.x - a.x);
    }
    return pontos[0].x;
  };
  const trilha = pontos.map((q, i) => `${i ? "L" : "M"}${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(" ");
  const xVoce = naTrilha(yVoce);

  const alvo = acampamentos.find((a) => a.proximo);
  const pct = (v: number, total: number) => `${((v / total) * 100).toFixed(2)}%`;

  return (
    <div className={p.subida}>
      <div className={p.subidaTexto}>
        <p className={p.subidaAno}>A subida de {ano}</p>
        <p className={p.subidaFrase}>
          {!lista.length
            ? "Crie os prêmios: cada um vira um acampamento na montanha."
            : !alvo
              ? `Você destravou todos os prêmios de ${ano}.`
              : alvo.d.meses > 1
                ? `Para ${minuscula(alvo.d.nome)}: ${alvo.d.meses} meses seguidos acima de ${formatar(alvo.d.patamar, "R$")}.`
                : doMes >= alvo.d.patamar
                  ? `Este mês já passa de ${formatar(alvo.d.patamar, "R$")}: ${minuscula(alvo.d.nome)} destrava quando ele fechar.`
                  : `Faltam ${formatar(alvo.d.patamar - doMes, "R$")} neste mês para ${minuscula(alvo.d.nome)}.`}
        </p>
        <p className={p.subidaApoio}>
          {ate ? (
            <>
              Em {MESES_LONGOS[ate - 1]} entraram <b>{formatar(doMes, "R$")}</b> no Caixa
              {vendido[ate] ? <> e foram vendidos <b>{formatar(vendido[ate] ?? 0, "R$")}</b></> : null}
              {melhor > doMes ? <>; o seu melhor mês do ano foi de {formatar(melhor, "R$")}</> : null}. A altitude é o que entrou no Caixa no
              mês, e cada prêmio destrava quando um mês passa do patamar dele.
            </>
          ) : (
            <>O ano ainda não começou. A altitude é o que entrou no Caixa no mês, e cada prêmio destrava quando um mês passa do patamar dele.</>
          )}
        </p>
      </div>

      <div className={p.montanha}>
        <svg viewBox="0 0 640 400" role="img" aria-label={`Montanha dos prêmios: ${lista.length} acampamentos, você a ${formatar(doMes, "R$")}`}>
          <defs>
            <linearGradient id="plano-ceu" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2A4FBC" />
              <stop offset="1" stopColor="#5E86DE" />
            </linearGradient>
          </defs>
          <rect width="640" height="400" fill="url(#plano-ceu)" />
          {/* a serra mais longe: morros suaves, quase da cor do céu */}
          <path d="M0 262 Q70 226 140 246 T290 214 T450 236 T640 204 L640 400 L0 400 Z" className={p.serraLonge} />
          {/* a serra do meio */}
          <path d="M0 318 L70 272 L120 296 L186 250 L240 290 L400 300 L468 246 L520 276 L580 236 L640 268 L640 400 L0 400 Z" className={p.serra} />
          {/* a montanha: a face de sombra, depois a iluminada por cima */}
          <path d={`M${PICO.x} ${PICO.y} L${PE_DIR} 400 L${PE_CRISTA} 400 Z`} className={p.faceSombra} />
          <path d={`M${PICO.x} ${PICO.y} L${PE_CRISTA} 400 L${PE_ESQ} 400 Z`} className={p.faceLuz} />
          {/* a neve do cume, nas duas faces */}
          <path d={`M${PICO.x} ${PICO.y} L${crista(142)} 142 L262 130 L270 146 L284 128 L292 140 L${PICO.x + 44} 114 Z`} className={p.neveSombra} />
          <path d={`M${PICO.x} ${PICO.y} L${faceEsq(122)} 122 L218 116 L212 136 L230 126 L240 144 L${crista(142)} 142 Z`} className={p.neve} />
          {/* os pinheiros do pé */}
          {[
            [18, 392, 38],
            [44, 398, 50],
            [70, 394, 32],
            [372, 396, 36],
            [398, 400, 48],
            [592, 396, 34],
            [616, 400, 44],
          ].map(([x, base, alto]) => (
            <path key={`${x}-${base}`} d={pinheiro(x, base, alto)} className={p.pinho} />
          ))}

          {/* o altímetro: a régua, uma marca por prêmio e o pontilhado até o acampamento */}
          <line x1={REGUA} y1={CHAO} x2={REGUA} y2={TOPO - 52} className={p.regua} />
          <line x1={REGUA - 6} y1={CHAO} x2={REGUA + 6} y2={CHAO} className={p.regua} />
          {acampamentos.map((a) => (
            <g key={`m-${a.d.nome}-${a.y}`} className={a.destravado ? p.campoFeito : a.proximo ? p.campoProximo : p.campoLonge}>
              <line x1={a.x + 8} y1={a.y} x2={REGUA} y2={a.y} className={p.guia} />
              <line x1={REGUA - 7} y1={a.y} x2={REGUA + 7} y2={a.y} className={p.marco} />
            </g>
          ))}

          {/* a trilha */}
          <path d={trilha} className={p.trilha} />
          {/* o melhor mês: uma pegada na trilha */}
          {melhor > doMes ? <circle cx={naTrilha(yMelhor)} cy={yMelhor} r="4.5" className={p.pegada} /> : null}
          {/* os acampamentos: uma bandeira em cada */}
          {acampamentos.map((a) => (
            <g key={`${a.d.nome}-${a.y}`} className={a.destravado ? p.campoFeito : a.proximo ? p.campoProximo : p.campoLonge}>
              <line x1={a.x} y1={a.y} x2={a.x} y2={a.y - 24} className={p.mastro} />
              <path d={`M${a.x} ${a.y - 24} L${a.x + 17} ${a.y - 19} L${a.x} ${a.y - 14} Z`} className={p.bandeira} />
              <circle cx={a.x} cy={a.y} r="4.5" className={p.base} />
            </g>
          ))}
          {/* o cume */}
          <line x1={PICO.x} y1={PICO.y} x2={PICO.x} y2={PICO.y - 30} className={p.mastroCume} />
          <path d={`M${PICO.x} ${PICO.y - 30} L${PICO.x + 24} ${PICO.y - 23} L${PICO.x} ${PICO.y - 16} Z`} className={p.cumeBandeira} />
          {/* você: na trilha e no altímetro */}
          <g className={p.voce} style={{ ["--sobe" as string]: `${CHAO - yVoce}px` }}>
            <line x1={xVoce} y1={yVoce} x2={REGUA} y2={yVoce} className={p.guiaVoce} />
            <circle cx={xVoce} cy={yVoce} r="9" className={p.voceHalo} />
            <circle cx={xVoce} cy={yVoce} r="5.5" className={p.voceBola} />
            <path d={`M${REGUA - 1} ${yVoce} L${REGUA - 10} ${yVoce - 6} L${REGUA - 10} ${yVoce + 6} Z`} className={p.voceBola} />
          </g>
        </svg>

        {/* os nomes do altímetro, em HTML: leem melhor e quebram linha */}
        {acampamentos.map((a) => (
          <div
            key={`r-${a.d.nome}-${a.y}`}
            className={`${p.marcoRotulo} ${a.destravado ? p.marcoFeito : a.proximo ? p.marcoProximo : ""}`}
            style={{ top: pct(a.y, 400), left: pct(REGUA + 12, 640) }}
          >
            <b>
              {a.destravado ? "✓ " : ""}
              {a.d.nome}
            </b>
            <span>
              {formatar(a.d.patamar, "R$")}
              {a.d.meses > 1 ? ` por ${a.d.meses} meses seguidos` : " num mês"}
              {a.destravado ? `, destravou em ${MESES_LONGOS[(a.quando ?? 1) - 1]}` : ""}
            </span>
          </div>
        ))}
        <div className={p.rotuloCume} style={{ left: pct(PICO.x, 640), top: pct(PICO.y - 34, 400) }} title={visao ?? undefined}>
          O cume{horizonte ? `, ${horizonte}` : ""}
        </div>
        <div className={p.rotuloVoce} style={{ left: pct(REGUA - 12, 640), top: pct(yVoce, 400) }}>
          você, {formatar(doMes, "R$")}
        </div>
      </div>

      {/* no celular os rótulos não cabem por cima do desenho: os acampamentos
          viram esta lista, de baixo para cima como na montanha */}
      {acampamentos.length ? (
        <ol className={p.camposLista}>
          {acampamentos.map((a) => (
            <li key={`l-${a.d.nome}-${a.y}`} className={a.destravado ? p.rotuloFeito : a.proximo ? p.rotuloProximo : ""}>
              <b>{a.d.nome}</b>
              <span>
                {formatar(a.d.patamar, "R$")}
                {a.d.meses > 1 ? ` por ${a.d.meses} meses seguidos` : " num mês"}
                {a.destravado ? ", destravado" : a.proximo ? ", o próximo" : ""}
              </span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

function minuscula(s: string) {
  return s ? s[0].toLowerCase() + s.slice(1) : s;
}


/* ============================================================
   O PRÓXIMO PASSO: a página diz o que fazer agora
   ============================================================ */
export type Passo = { texto: string; ancora: string; acao: string };

export function ProximoPasso({ passos }: { passos: Passo[] }) {
  if (!passos.length) {
    return (
      <div className={p.proximo}>
        <p className={p.proximoTitulo}>Seu próximo passo</p>
        <p className={p.proximoNada}>Nada pendente. O plano está em dia; volte no fim do mês para a RMR.</p>
      </div>
    );
  }
  return (
    <div className={p.proximo}>
      <p className={p.proximoTitulo}>Seu próximo passo</p>
      <ol>
        {passos.map((x) => (
          <li key={x.texto}>
            <span>{x.texto}</span>
            <a href={`#${x.ancora}`}>{x.acao}</a>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ============================================================
   COMO O PLANO FUNCIONA: o método em quatro passos, que são mesmo uma
   sequência (por isso numerados), cada um levando ao seu andar
   ============================================================ */
const COMO = [
  { n: 1, ancora: "rumo", titulo: "O rumo", texto: "Para onde o estúdio vai em 3 a 5 anos. É o que decide o que entra e o que fica de fora." },
  { n: 2, ancora: "projetos", titulo: "Os projetos", texto: "No que você põe energia este ano. P1 leva a maior parte; o resto espera a vez." },
  { n: 3, ancora: "metas", titulo: "As metas", texto: "Cada projeto vira números por mês. O peso diz quanto cada meta conta na nota." },
  { n: 4, ancora: "rmr", titulo: "A RMR", texto: "Todo mês você confere, anota o que desviou e fecha o mês. Mês fechado conta na sequência." },
];

export function ComoFunciona() {
  return (
    <nav className={p.como} aria-label="Como o plano funciona">
      <p className={p.comoTitulo}>Como o plano funciona</p>
      <ol>
        {COMO.map((c) => (
          <li key={c.n}>
            <a href={`#${c.ancora}`}>
              <i>{c.n}</i>
              <b>{c.titulo}</b>
              <span>{c.texto}</span>
            </a>
          </li>
        ))}
      </ol>
      <p className={p.comoPe}>E o prêmio vem do Caixa: quando um mês passa do patamar, ele destrava sozinho.</p>
    </nav>
  );
}
