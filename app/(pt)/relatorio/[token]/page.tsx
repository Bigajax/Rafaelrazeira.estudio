/* ============================================================
   O RELATÓRIO DO MÊS (06/10/2026, redesenhado em 07/10): /relatorio/<token>

   A página que o estúdio manda ao dono da loja todo mês, por link, no
   WhatsApp. Ele não precisa entrar no painel: aqui estão os números do
   mês contra o anterior, a leitura do Rafael, o que fazer agora (por
   regra), o que foi feito, as peças, de onde vieram e o movimento.
   Imprime em A4 e salva em PDF pelo botão.

   O desenho é o da casa (docs/design-estudio.md): papel e tinta, Archivo
   condensada na manchete e nos números, Inter no corpo, mono em caixa
   alta nos rótulos, filete de 1,5px, o filete duplo nos títulos de
   seção, e UMA sombra dura: a ficha da leitura do estúdio, que é o que
   o lojista está pagando para ler. Nada de cartão branco com sombra
   desfocada: isso é painel, e esta página é um documento assinado.

   É página por link: noindex aqui e disallow no robots. Isso não a torna
   privada; o token de 32 caracteres é o que a protege.
   ============================================================ */

import type { Metadata } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { Selo } from "@/components/performance/Selo";
import { BotaoImprimir } from "./BotaoImprimir";
import { ORIGENS, decisoes, lerRelatorio, nomeDaPeca, textoHorario, type DadosRelatorio } from "@/lib/performance/relatorio";
import s from "./relatorio.module.css";

const display = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-display" });
const corpo = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Relatório do mês",
  robots: { index: false, follow: false },
};

const MES_ANO = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
const SO_MES = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" });
const DIA = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", timeZone: "America/Sao_Paulo" });
const br = (v: number) => v.toLocaleString("pt-BR");

/* o mês do relatório, o anterior (a comparação) e o seguinte (o que fazer) */
function meses(iso: string) {
  const [a, m] = iso.split("-").map(Number);
  const d = (k: number) => new Date(Date.UTC(a, m - 1 + k, 15));
  return { este: MES_ANO.format(d(0)), nome: SO_MES.format(d(0)), antes: SO_MES.format(d(-1)), depois: SO_MES.format(d(1)) };
}

function variacao(agora: number, antes: number, mesAntes: string) {
  if (!antes) return null;
  const c = Math.round((agora / antes - 1) * 100);
  if (c === 0) return { t: `igual a ${mesAntes}`, sobe: null as boolean | null };
  return { t: `${Math.abs(c)}% ${c > 0 ? "a mais" : "a menos"} que em ${mesAntes}`, sobe: c > 0 };
}

export default async function PaginaRelatorio({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const R = await lerRelatorio(token);
  if (!R) notFound();

  const M = meses(R.mes);
  const T = R.total;
  const A = R.antes;
  const taxa = T.pessoas ? Math.round((T.chamaram / T.pessoas) * 100) : 0;
  const taxaAntes = A.pessoas ? Math.round((A.chamaram / A.pessoas) * 100) : null;
  const numeros = [
    { rot: "Pessoas na vitrine", val: br(T.pessoas), dif: variacao(T.pessoas, A.pessoas, M.antes) },
    { rot: "Abriram uma peça", val: br(T.olharam), dif: variacao(T.olharam, A.olharam, M.antes) },
    { rot: "Chamaram no WhatsApp", val: br(T.chamaram), dif: variacao(T.chamaram, A.chamaram, M.antes) },
    {
      rot: "De cada 100, chamaram",
      val: `${taxa}%`,
      dif:
        taxaAntes === null
          ? null
          : taxa === taxaAntes
            ? { t: `igual a ${M.antes}`, sobe: null as boolean | null }
            : {
                t: `${Math.abs(taxa - taxaAntes)} ${Math.abs(taxa - taxaAntes) === 1 ? "ponto" : "pontos"} ${taxa > taxaAntes ? "a mais" : "a menos"} que em ${M.antes}`,
                sobe: taxa > taxaAntes,
              },
    },
  ];
  const fazer = decisoes(R);
  /* o que fazer se divide (07/10): o que é da loja (repor, cadastrar, rever
     preço e foto) e o que é do estúdio (destaque, banner, divulgação). No
     mês seguinte o do estúdio volta em "o que foi feito", com o tique. */
  const DO_ESTUDIO = new Set(["Destaque", "Divulgação"]);
  const fazerVoce = fazer.filter((d) => !DO_ESTUDIO.has(d.tipo));
  const fazerEstudio = fazer.filter((d) => DO_ESTUDIO.has(d.tipo));
  const pecas = R.pecas.filter((p) => p.chamaram > 0).slice(0, 6);
  const somaOrigem = R.origem.reduce((a, o) => a + o.pessoas, 0);
  const horario = textoHorario(R.horario);
  const feitos = (R.feito ?? "")
    .split("\n")
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);

  return (
    <main className={`${s.pagina} ${display.variable} ${corpo.variable} ${mono.variable}`}>
      <div className={s.folha}>
        {/* ── o cabeçalho: a manchete do mês e a ação de imprimir ── */}
        <header className={s.topo}>
          <div className={s.topo__texto}>
            <p className={s.kicker}>
              <Selo tamanho={15} /> Relatório do mês · Performance
            </p>
            <h1 className={s.titulo}>{M.este}</h1>
            <p className={s.lead}>
              <b>{R.loja}.</b>{" "}
              {R.parcial ? `Mês em andamento, com os números até ${DIA.format(new Date(R.ate))}.` : `O mês inteiro, comparado a ${M.antes}.`} A vitrine conta pessoas, sem nome nem telefone.
            </p>
          </div>
          <BotaoImprimir />
        </header>

        {/* ── os quatro números, como um placar impresso ── */}
        <section className={s.numeros} aria-label="Os números do mês">
          {numeros.map((k) => (
            <div key={k.rot} className={s.numero}>
              <span className={s.rot}>{k.rot}</span>
              <span className={s.val}>{k.val}</span>
              {k.dif ? (
                <span className={`${s.dif} ${k.dif.sobe === true ? s.sobe : k.dif.sobe === false ? s.desce : ""}`}>
                  {k.dif.sobe === true ? "↑ " : k.dif.sobe === false ? "↓ " : ""}
                  {k.dif.t}
                </span>
              ) : (
                <span className={s.dif}>primeiro mês medido</span>
              )}
            </div>
          ))}
        </section>

        {/* ── a leitura do estúdio: a ficha, o único objeto com sombra ── */}
        {R.leitura ? (
          <section className={s.leitura} aria-labelledby="leitura">
            <p id="leitura" className={s.leitura__rotulo}>
              A leitura do estúdio
            </p>
            <div className={s.leitura__texto}>
              {R.leitura.split(/\n{2,}/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <p className={s.assina}>
              <b>Rafael Razeira</b>
              <span>Rafael Razeira Estúdio · Maringá, PR</span>
            </p>
          </section>
        ) : null}

        {/* ── as seções, em duas colunas separadas por um filete ── */}
        <div className={s.duas}>
          <section className={s.secao} aria-labelledby="fazer">
            <h2 id="fazer">O que fazer em {M.depois}</h2>
            {fazer.length ? (
              <>
                {fazerVoce.length ? (
                  <>
                    <h3 className={s.sub}>Na loja, por você</h3>
                    <ol className={s.fazer}>
                      {fazerVoce.map((d, i) => (
                        <li key={i}>
                          <span className={s.tipo}>{d.tipo}</span>
                          <b>{d.frase}</b>
                          <span className={s.porque}>{d.porque}</span>
                        </li>
                      ))}
                    </ol>
                  </>
                ) : null}
                <h3 className={s.sub}>Na vitrine, pelo estúdio</h3>
                <ol className={s.fazer}>
                  {fazerEstudio.map((d, i) => (
                    <li key={i}>
                      <span className={s.tipo}>{d.tipo}</span>
                      <b>{d.frase}</b>
                      <span className={s.porque}>{d.porque}</span>
                    </li>
                  ))}
                  <li>
                    <span className={s.tipo}>Banner</span>
                    <b>Refazer os banners da página inicial com o que mais chamou</b>
                    <span className={s.porque}>Os três banners do mês saem destes números. No próximo relatório, aparecem em “o que foi feito”.</span>
                  </li>
                </ol>
              </>
            ) : (
              <p className={s.vazio}>Ainda são poucos dados para apontar uma decisão.</p>
            )}
          </section>

          <section className={s.secao} aria-labelledby="feito">
            <h2 id="feito">O que foi feito em {M.nome}</h2>
            {feitos.length ? (
              <ul className={s.feito}>
                {feitos.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            ) : (
              <p className={s.vazio}>É o primeiro relatório. No próximo, aqui entra o que foi feito e o que mudou depois.</p>
            )}
          </section>
        </div>

        <div className={s.duas}>
          <section className={s.secao} aria-labelledby="pecas">
            <h2 id="pecas">As peças que mais chamaram</h2>
            {pecas.length ? (
              <table className={s.tabela}>
                <thead>
                  <tr>
                    <th>Peça</th>
                    <th>Abriram</th>
                    <th>Chamaram</th>
                    <th>De 100</th>
                  </tr>
                </thead>
                <tbody>
                  {pecas.map((p) => (
                    <tr key={p.produto}>
                      <th scope="row">{nomeDaPeca(p.produto)}</th>
                      <td>{br(p.viram)}</td>
                      <td>{br(p.chamaram)}</td>
                      <td className={s.forte}>{p.viram ? Math.round((p.chamaram / p.viram) * 100) : 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className={s.vazio}>Ninguém chamou pelo WhatsApp a partir de uma peça neste mês.</p>
            )}
          </section>

          <section className={s.secao} aria-labelledby="origem">
            <h2 id="origem">De onde vieram</h2>
            {somaOrigem ? (
              <ul className={s.origem}>
                {R.origem.map((o) => {
                  const parte = Math.round((o.pessoas / somaOrigem) * 100);
                  return (
                    <li key={o.origem}>
                      <b>{ORIGENS[o.origem] ?? o.origem}</b>
                      <span className={s.origem__num}>{parte}%</span>
                      <small>
                        {br(o.pessoas)} pessoas · {o.pessoas ? Math.round((o.chamaram / o.pessoas) * 100) : 0} de cada 100 chamaram
                      </small>
                      <i>
                        <i style={{ width: `${Math.max(2, parte)}%` }} />
                      </i>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={s.vazio}>Ainda sem visitas neste mês.</p>
            )}
          </section>
        </div>

        <div className={s.duas}>
          <section className={s.secao} aria-labelledby="movimento">
            <h2 id="movimento">O movimento de {M.nome}</h2>
            <Movimento dias={R.dias} mes={R.mes} parcial={R.parcial} />
            <p className={s.nota}>
              {horario ? `O horário mais forte foi ${horario}. ` : ""}
              {R.voltaram ? `${br(R.voltaram)} ${R.voltaram === 1 ? "pessoa voltou" : "pessoas voltaram"} à vitrine em outro dia.` : ""}
            </p>
          </section>

          <section className={s.secao} aria-labelledby="procuraram">
            <h2 id="procuraram">O que procuraram e os números que acabaram</h2>
            {R.buscas.length || R.esgotados.length ? (
              <ul className={s.lista}>
                {R.buscas.slice(0, 4).map((b) => (
                  <li key={"b" + b.termo}>
                    <span>Procuraram “{b.termo}”</span>
                    <b>{br(b.pessoas)}</b>
                  </li>
                ))}
                {R.esgotados.slice(0, 3).map((e) => (
                  <li key={"e" + e.produto + e.tamanho}>
                    <span>
                      Queriam o {e.tamanho} do {nomeDaPeca(e.produto)}
                    </span>
                    <b>{br(e.pessoas)}</b>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={s.vazio}>Ninguém procurou algo que a loja não tem, e nenhum número esgotado foi tocado.</p>
            )}
            {R.links.length ? (
              <>
                <h3 className={s.sub}>Os posts</h3>
                <ul className={s.lista}>
                  {R.links.slice(0, 4).map((l) => (
                    <li key={l.nome}>
                      <span>{l.nome}</span>
                      <b>
                        {br(l.pessoas)} <small>pessoas · {br(l.chamaram)} chamaram</small>
                      </b>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>
        </div>

        {/* ── o rodapé: a assinatura e a única ação da página ── */}
        <footer className={s.rodape}>
          <p className={s.rodape__texto}>
            <Selo tamanho={14} /> Performance, por Rafael Razeira Estúdio
            <span>Maringá, PR · rafaelrazeira.com.br</span>
          </p>
          <a className={s.responder} href="https://wa.me/5544991246187" target="_blank" rel="noreferrer">
            Responder ao estúdio no WhatsApp
          </a>
        </footer>
      </div>
    </main>
  );
}

/* o movimento: uma coluna por dia do mês, a média de 7 dias por cima e o
   dia de hoje tracejado quando o mês ainda corre (a mesma régua do
   detalhe da aba Desempenho: nunca desenhar o dia de hoje como fechado) */
function Movimento({ dias, mes, parcial }: { dias: DadosRelatorio["dias"]; mes: string; parcial: boolean }) {
  const [a, m] = mes.split("-").map(Number);
  const total = new Date(Date.UTC(a, m, 0)).getUTCDate();
  const porDia = new Map(dias.map((d) => [d.d, d.pessoas]));
  const serie: { d: string; v: number }[] = [];
  const ultimo = dias.length ? dias[dias.length - 1].d : null;
  for (let i = 1; i <= total; i++) {
    const d = `${a}-${String(m).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    if (parcial && ultimo && d > ultimo) break;
    serie.push({ d, v: porDia.get(d) ?? 0 });
  }
  if (!serie.length) return <p className={s.vazio}>Ainda sem visitas neste mês.</p>;
  const W = 600,
    H = 160,
    ml = 4,
    mt = 10,
    mb = 20;
  const max = Math.max(...serie.map((x) => x.v), 1) * 1.15;
  const passo = (W - ml * 2) / total;
  const y = (v: number) => mt + (1 - v / max) * (H - mt - mb);
  const media = serie.map((_, i) => (i >= 6 && !(parcial && i === serie.length - 1) ? serie.slice(i - 6, i + 1).reduce((s2, x) => s2 + x.v, 0) / 7 : null));
  const pts = media.map((v, i) => (v === null ? null : `${(ml + passo * (i + 0.5)).toFixed(1)},${y(v).toFixed(1)}`)).filter(Boolean);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={s.grafico} role="img" aria-label="Pessoas por dia no mês, com a média de 7 dias">
      <line x1={ml} x2={W - ml} y1={y(0)} y2={y(0)} className={s.eixoLinha} />
      {serie.map((x, i) => {
        const hoje = parcial && i === serie.length - 1;
        return (
          <rect
            key={x.d}
            x={ml + passo * i + passo * 0.18}
            y={y(x.v)}
            width={passo * 0.64}
            height={Math.max(0, y(0) - y(x.v))}
            className={hoje ? s.colHoje : s.col}
          />
        );
      })}
      {pts.length > 1 ? <polyline points={pts.join(" ")} fill="none" className={s.mediaLinha} strokeWidth={1.75} strokeLinejoin="round" /> : null}
      <text x={ml} y={H - 5} className={s.eixo}>
        1
      </text>
      <text x={W / 2} y={H - 5} textAnchor="middle" className={s.eixo}>
        {Math.round(total / 2)}
      </text>
      <text x={W - ml} y={H - 5} textAnchor="end" className={s.eixo}>
        {total}
      </text>
    </svg>
  );
}
