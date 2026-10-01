/* ============================================================
   RESULTADOS: o que deu certo e o que não deu (01/10/2026)

   "A gente não está tendo referência de criação de conteúdo." Esta aba é
   a referência que mais vale, porque é do próprio público: os números de
   cada post, anotados do Insights 7 dias depois, e a leitura deles. A
   mesma leitura vai para a Paula antes de ela propor pautas
   (lib/marketing/resultados.ts).

   A ordem da tela é a ordem da ação: primeiro o que falta anotar (sem
   número não há leitura), depois o que deu certo e o que não deu, com a
   capa (é mais fácil lembrar de um post pela capa do que pelo gancho), e
   por fim os eixos: categoria, pilar, formato, direção e tipografia.
   ============================================================ */
import type { Metadata } from "next";
import Link from "next/link";
import { clienteServidor } from "@/lib/crm/supabase";
import { hojeSP } from "@/lib/crm/regras";
import { CATEGORIAS, MEDIDA_DA_CATEGORIA, MEDIDAS, urlFundo, type Peca } from "@/lib/marketing/tipos";
import { POUCOS, encaminhamento, leitura } from "@/lib/marketing/resultados";
import { AbasMarketing } from "@/components/marketing/AbasMarketing";
import { Miniatura } from "@/components/marketing/Miniatura";
import s from "@/app/(pt)/crm/crm.module.css";
import m from "@/app/(pt)/crm/marketing.module.css";

export const metadata: Metadata = { title: "Resultados" };

const num = (x: number | null | undefined, casas = 1) => (x == null ? "sem número" : x.toLocaleString("pt-BR", { maximumFractionDigits: casas }));
const data = (iso: string | null) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "");

function Post({ p, largura }: { p: Peca; largura: number }) {
  const cat = p.categoria && p.categoria in CATEGORIAS ? p.categoria : null;
  return (
    <li className={m.resPost}>
      <Link href={`/crm/marketing/${p.id}`} className={m.resCapa} aria-label={`Abrir: ${p.gancho}`}>
        <Miniatura peca={p} largura={largura} fundo={urlFundo(p.fundo)} />
      </Link>
      <div className={m.resTexto}>
        <Link href={`/crm/marketing/${p.id}`} className={m.bandejaGancho}>
          {p.gancho || "Post sem gancho"}
        </Link>
        <span className={m.esperandoTipo}>
          {data(p.posta_em)}
          {cat ? `, ${CATEGORIAS[cat].nome}` : ""}
        </span>
        <dl className={m.resNumeros}>
          <div>
            <dt>Encaminhamentos por mil</dt>
            <dd>{num(encaminhamento(p))}</dd>
          </div>
          <div>
            <dt>Salvamentos</dt>
            <dd>{num(p.metricas?.salvamentos, 0)}</dd>
          </div>
          {cat ? (
            <div>
              <dt>{MEDIDAS[MEDIDA_DA_CATEGORIA[cat]].nome}, a medida de {CATEGORIAS[cat].nome}</dt>
              <dd>{num(p.metricas?.[MEDIDA_DA_CATEGORIA[cat]], 0)}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </li>
  );
}

export default async function PaginaResultados() {
  const hoje = hojeSP();
  const supabase = await clienteServidor();
  const { data: postadas } = await supabase
    .from("mkt_pecas")
    .select("*")
    .eq("status", "postada")
    .order("posta_em", { ascending: false })
    .returns<Peca[]>();
  const lista = postadas ?? [];
  const { medidos, faltam, certos, errados, eixos, ranking } = leitura(lista, hoje);
  const pouco = medidos.length < POUCOS;

  return (
    <div className={m.tela}>
      <AbasMarketing ativa="resultados" />
      <header className={m.portaCab}>
        <h1 className={m.resTitulo}>
          O que deu certo<i className={s.ponto}>.</i>
        </h1>
        <p className={m.placar}>
          {lista.length === 0
            ? "Nenhum post marcado como postado ainda."
            : `${medidos.length} de ${lista.length} ${lista.length === 1 ? "post postado tem" : "posts postados têm"} os números. A régua é o encaminhamento por mil contas alcançadas.`}
        </p>
      </header>

      {faltam.length ? (
        <section className={m.resFaltam} aria-labelledby="faltam">
          <h2 id="faltam">
            Faltam os números de {faltam.length} {faltam.length === 1 ? "post" : "posts"}
          </h2>
          <p>Já passaram 7 dias. No Instagram: abra o post, Ver insights, e anote no post aqui.</p>
          <ul>
            {faltam.map((p) => (
              <li key={p.id}>
                <Link href={`/crm/marketing/${p.id}`} className={m.resCapa} aria-hidden tabIndex={-1}>
                  <Miniatura peca={p} largura={44} fundo={urlFundo(p.fundo)} />
                </Link>
                <Link href={`/crm/marketing/${p.id}`} className={m.bandejaGancho}>
                  {p.gancho || "Post sem gancho"}
                </Link>
                <span className={m.esperandoTipo}>postado {data(p.posta_em)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {pouco ? (
        <p className={m.esperandoVazio}>
          {medidos.length === 0
            ? "Ainda não há post com número. "
            : `Só ${medidos.length} ${medidos.length === 1 ? "post tem" : "posts têm"} número. `}
          A leitura começa com {POUCOS}: antes disso, o melhor post é sorte, não padrão. A Paula também só passa a usar a
          leitura a partir daí.
        </p>
      ) : (
        <div className={m.resDuas}>
          <section aria-labelledby="certo">
            <h2 id="certo" className={m.resCerto}>
              Mais encaminhados
            </h2>
            <ul className={m.resLista}>
              {certos.map((p) => (
                <Post key={p.id} p={p} largura={104} />
              ))}
            </ul>
          </section>
          <section aria-labelledby="errado">
            <h2 id="errado" className={m.resErrado}>
              Menos encaminhados
            </h2>
            <ul className={m.resLista}>
              {errados.map((p) => (
                <Post key={p.id} p={p} largura={104} />
              ))}
            </ul>
          </section>
        </div>
      )}

      {medidos.length ? (
        <section className={m.resEixos} aria-labelledby="eixos">
          <h2 id="eixos">Por onde o post foi feito</h2>
          <p>
            A média de encaminhamentos por mil de cada grupo. Grupo com menos de {POUCOS} posts vem apagado: é pista, ainda não é
            regra.
          </p>
          <div className={m.resEixosGrade}>
            {eixos
              .filter((e) => e.grupos.length)
              .map((e) => {
                const maior = Math.max(...e.grupos.map((g) => g.enc ?? 0), 0.0001);
                return (
                  <div key={e.id} className={m.resEixo}>
                    <h3>{e.nome}</h3>
                    <ul>
                      {e.grupos.map((g) => (
                        <li key={g.chave} className={g.n < POUCOS ? m.resPouco : ""}>
                          <span>
                            {g.nome} <small>{g.n} {g.n === 1 ? "post" : "posts"}</small>
                          </span>
                          <b>{num(g.enc)}</b>
                          <i className={m.regua}>
                            <i className={m.reguaCheia} style={{ width: `${((g.enc ?? 0) / maior) * 100}%` }} />
                          </i>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
          </div>
        </section>
      ) : null}

      {ranking.length ? (
        <section className={m.resTabela} aria-labelledby="todos">
          <h2 id="todos">Todos os posts medidos</h2>
          <div className={m.resRolar}>
            <table>
              <thead>
                <tr>
                  <th scope="col">Post</th>
                  <th scope="col">Por mil</th>
                  {Object.values(MEDIDAS).map((x) => (
                    <th key={x.nome} scope="col">
                      {x.nome}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ranking.map((p) => (
                  <tr key={p.id}>
                    <th scope="row">
                      <Link href={`/crm/marketing/${p.id}`}>{p.gancho || "Post sem gancho"}</Link>
                    </th>
                    <td>{num(encaminhamento(p))}</td>
                    {(Object.keys(MEDIDAS) as (keyof typeof MEDIDAS)[]).map((k) => (
                      <td key={k}>{p.metricas?.[k] ?? ""}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
