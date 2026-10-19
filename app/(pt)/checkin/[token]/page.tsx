/* ============================================================
   O CHECK-IN DAS FOTOS (14/10/2026): /checkin/<token>

   A página que o estúdio manda ao dono da loja para ele subir as fotos
   já separadas pelas partes da vitrine. As lojas e as partes moram em
   lib/checkin.ts; o envio, em /api/checkin.

   O desenho é o da casa (docs/design-estudio.md), como o relatório: papel
   e tinta, Archivo na manchete, mono nos rótulos, uma ficha por parte. É
   feito para o celular, porque as fotos estão na galeria dele.

   Página por link: noindex aqui e /checkin no disallow do robots. O token
   é o que a protege.
   ============================================================ */

import type { Metadata } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { lerCheckin } from "@/lib/checkin";
import { lerRespostas, listarFotos } from "@/lib/checkin-servidor";
import { EnvioDeFotos } from "./EnvioDeFotos";
import { PerguntasDaLoja } from "./PerguntasDaLoja";
import s from "./checkin.module.css";

const display = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-display" });
const corpo = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Check-in das fotos",
  robots: { index: false, follow: false },
};

export default async function PaginaCheckin({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const c = lerCheckin(token);
  if (!c) notFound();
  const [fotos, respostas] = await Promise.all([listarFotos(c), lerRespostas(c)]);

  return (
    <main className={`${s.pagina} ${display.variable} ${corpo.variable} ${mono.variable}`}>
      <div className={s.folha}>
        <header className={s.topo}>
          <p className={s.kicker}>Check-in das fotos · {c.loja}</p>
          <h1 className={s.titulo}>
            Manda as fotos,
            <br />
            já separadas.
          </h1>
          {c.passos ? (
            <>
              <ol className={s.passos}>
                {c.passos.map((p, n) => (
                  <li key={p}>
                    <b>{n + 1}</b>
                    <span>{p}</span>
                  </li>
                ))}
              </ol>
              {c.instrucao && <p className={s.intro}>{c.instrucao}</p>}
            </>
          ) : c.instrucao ? (
            <p className={s.intro}>{c.instrucao}</p>
          ) : (
            <p className={s.intro}>
              {c.dono}, cada ficha abaixo é uma parte da vitrine. Toque em <b>Escolher fotos</b>, pegue da galeria e
              elas sobem sozinhas. Se souber, escreva embaixo de cada uma o modelo, a numeração e o valor: é isso que
              vai para o site.
            </p>
          )}
        </header>

        {/* as fotos primeiro, que são o trabalho; as perguntas da loja no fim (19/10) */}
        <EnvioDeFotos token={token} categorias={c.categorias} campos={c.campos} iniciais={fotos} />
        {c.perguntas ? (
          <div className={s.fichas}>
            <PerguntasDaLoja token={token} perguntas={c.perguntas} iniciais={respostas} />
          </div>
        ) : null}

        <footer className={s.pe}>
          <p>
            Tudo o que aparece aqui já chegou para o Rafael. Pode fechar a página e voltar quando tiver mais fotos: o
            link é o mesmo.
          </p>
          <p className={s.assinatura}>Rafael Razeira Estúdio</p>
        </footer>
      </div>
    </main>
  );
}
