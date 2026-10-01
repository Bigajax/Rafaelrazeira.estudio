/* ============================================================
   O CABEÇALHO DO MÊS (01/10/2026)

   "Essa parte aqui, eu quero que você dê mais personalidade." Era um título,
   uma linha em mono e três botões soltos na ponta direita, igual ao de
   qualquer tela do CRM. O que só esta tela tem é o FEED: então a ousadia
   mora num lugar só, à direita, um pedaço do perfil do Instagram com as
   capas reais do mês, na ordem em que o perfil mostra (a mais nova em cima,
   à esquerda). É a pergunta que o Rafael faz ao planejar: como o perfil vai
   ficar.

   Em volta, tudo quieto e na gramática da casa:
   - o mês troca pelas duas setas quadradas coladas no título, e "hoje" só
     aparece fora do mês atual (botão que não leva a lugar nenhum é ruído);
   - as categorias (01/10) são réguas: a barra cheia é a fatia do mês, o
     dente é a meta. É o mesmo objeto da régua do dia e da meta da semana.
   ============================================================ */
import Link from "next/link";
import { CATEGORIAS, urlFundo, type Categoria, type Peca } from "@/lib/marketing/tipos";
import { Miniatura } from "./Miniatura";
import s from "@/app/(pt)/crm/crm.module.css";
import m from "@/app/(pt)/crm/marketing.module.css";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/* o perfil mostra 9 de cara no celular: é o que cabe sem rolar */
const NO_PERFIL = 9;
const LADO = 38;

function chaveMes(ano: number, mes: number) {
  const d = new Date(ano, mes - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function CabecaMes({
  ano,
  mes,
  mesDeHoje,
  noMes,
  rodape,
}: {
  ano: number;
  mes: number;
  mesDeHoje: boolean;
  noMes: Peca[];
  rodape: React.ReactNode;
}) {
  const nome = MESES[mes - 1];
  const prontas = noMes.filter((p) => p.status !== "rascunho").length;
  /* o perfil empilha do mais novo para o mais velho */
  const feed = [...noMes].sort((a, b) => (b.posta_em ?? "").localeCompare(a.posta_em ?? "")).slice(0, NO_PERFIL);
  const vazios = Math.max(0, (feed.length ? Math.ceil(feed.length / 3) * 3 : NO_PERFIL) - feed.length);
  const sobra = noMes.length - feed.length;

  const total = noMes.length;
  const conta = (c: Categoria) => noMes.filter((p) => p.categoria === c).length;
  const semCategoria = noMes.filter((p) => !p.categoria || !(p.categoria in CATEGORIAS)).length;

  return (
    <header className={m.mesCab}>
      <div className={m.mesTexto}>
        <div className={m.mesTitulo}>
          <Link href={`/crm/marketing?mes=${chaveMes(ano, mes - 1)}`} className={m.mesSeta} aria-label={`Ver ${MESES[(mes + 10) % 12]}`}>
            <svg viewBox="0 0 16 16" aria-hidden>
              <path d="M10 3 5 8l5 5" />
            </svg>
          </Link>
          <h1>
            {nome}
            <i className={s.ponto}>.</i>
          </h1>
          <Link href={`/crm/marketing?mes=${chaveMes(ano, mes + 1)}`} className={m.mesSeta} aria-label={`Ver ${MESES[mes % 12]}`}>
            <svg viewBox="0 0 16 16" aria-hidden>
              <path d="m6 3 5 5-5 5" />
            </svg>
          </Link>
          {mesDeHoje ? null : (
            <Link href="/crm/marketing" className={m.mesHoje}>
              voltar para hoje
            </Link>
          )}
        </div>

        <p className={m.placar}>
          {total === 0
            ? `Nada marcado para ${nome} ainda.`
            : `${total} ${total === 1 ? "post marcado" : "posts marcados"}, ${prontas} ${prontas === 1 ? "pronto" : "prontos"} para sair.`}
        </p>

        <ul className={m.mesCategorias} aria-label="Posts do mês por categoria">
          {(Object.keys(CATEGORIAS) as Categoria[]).map((c) => {
            const n = conta(c);
            const fatia = total ? Math.round((n / total) * 100) : 0;
            return (
              <li key={c}>
                <span>
                  {CATEGORIAS[c].nome} <b>{n}</b>
                </span>
                <i className={m.regua} title={`${fatia}% do mês, meta ${CATEGORIAS[c].meta}%`}>
                  <i className={m.reguaCheia} style={{ width: `${Math.min(100, fatia)}%` }} />
                  <i className={m.reguaMeta} style={{ left: `${CATEGORIAS[c].meta}%` }} />
                </i>
              </li>
            );
          })}
          {/* os posts de antes de 01/10 não têm categoria: sem esta linha, as
              cinco réguas zeradas pareciam defeito num mês com sete posts */}
          {semCategoria ? (
            <li className={m.semCategoria}>
              <span>
                Sem categoria <b>{semCategoria}</b>
              </span>
            </li>
          ) : null}
        </ul>

        {rodape}
      </div>

      <figure className={m.perfil}>
        <div className={m.perfilGrade} style={{ gridTemplateColumns: `repeat(3, ${LADO}px)` }}>
          {feed.map((p) => (
            <Link key={p.id} href={`/crm/marketing/${p.id}`} className={m.perfilCapa} title={p.gancho || "Abrir o post"}>
              <Miniatura peca={p} largura={LADO} fundo={urlFundo(p.fundo)} />
            </Link>
          ))}
          {Array.from({ length: vazios }, (_, k) => (
            <span key={`v${k}`} className={m.perfilVazio} style={{ width: LADO }} aria-hidden />
          ))}
        </div>
        <figcaption>
          {feed.length === 0
            ? `O perfil de ${nome} ainda está vazio. Arraste uma capa para um dia.`
            : `O perfil no fim de ${nome}${sobra > 0 ? `, e mais ${sobra} abaixo` : ""}.`}
        </figcaption>
      </figure>
    </header>
  );
}
