"use client";

/* ============================================================
   O TRILHO — a navegação de pé, na sala grafite

   Ele substituiu um cabeçalho horizontal, e a troca resolve três coisas de
   uma vez:

   1. O TOPO VOLTA A SER DA PÁGINA. Com a navegação em cima, toda tela
      começava com uma faixa que não falava dela: a manchete "Quem eu falo
      agora." nascia na segunda linha da tela. Agora a primeira coisa que
      se lê é o assunto.
   2. QUATRO ROTAS CABEM SEM APERTO. Na horizontal, "Métricas" caía fora da
      tela em 390px e ficava atrás de uma rolagem lateral que ninguém
      descobre. Na vertical, quatro itens sobram espaço em qualquer altura.
   3. ELE DÁ UMA BORDA À FERRAMENTA. O CRM tem colunas que rolam, listas que
      crescem e modais que abrem. Um trilho fixo e escuro na esquerda é a
      única coisa que não se move, e é dele que a tela ganha prumo.

   ---------- por que grafite ----------
   É o `--ink` da casa, a mesma "sala escura" que a /vitrine-digital e o
   /portfolio usam quando a seção é o lugar da prova. Aqui ele faz o
   trabalho oposto e complementar: o trilho é escuro para que TUDO à direita
   dele leia como papel. A ferramenta inteira passa a ser uma mesa clara com
   uma lombada preta, que é exatamente o objeto que ela imita.

   O item ativo é o `--green-live`, o único esmeralda que funciona sobre
   grafite (7,7:1). Os outros dois somem lá, e essa regra já estava escrita
   no portfolio.module.css.

   ---------- ele se chama trilho e agora TEM um trilho ----------
   Até aqui o nome era só uma metáfora do comentário: na tela eram quatro
   rótulos empilhados num retângulo escuro, com quatrocentos pixels de vão
   embaixo e um filete de 3px que só existia no item aceso. Agora o filete
   corre de ponta a ponta da altura, o tempo todo, e o item aceso é o trecho
   dele que fica verde.

   É o mesmo objeto da régua do dia, de pé: uma linha inteira, com uma marca
   viva dizendo onde você está. E é ele que resolve o vão de baixo, porque
   o vão deixa de ser espaço que sobrou e passa a ser trilho que continua.

   ---------- e as rotas passaram a saber de si ----------
   A navegação sabia os NOMES das telas e nada sobre elas: "Hoje" com sete
   pessoas esperando e "Hoje" com a fila zerada eram o mesmo rótulo, e a
   única forma de saber era abrir. Cada rota carrega o próprio número agora,
   e só o de Hoje tem cor: rosa quer dizer "tem gente esperando", esmeralda
   quer dizer "acabou". É a mesma escada da contagem da coluna do quadro.

   Métricas não conta nada de propósito: ela não acumula trabalho, e um
   número ali seria um número para ter número.

   ---------- no celular ele deita ----------
   Vira a barra fixa de baixo, que é onde o polegar chega. "Sair" não vem
   junto: cinco itens em 390px espremem os quatro que importam, e sair é a
   única ação da barra que custa uma senha para desfazer. Ele desce para o
   pé do conteúdo, onde ninguém encosta sem querer.
   ============================================================ */

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Contagens } from "@/lib/crm/dados";
import s from "@/app/crm/crm.module.css";

/* A ordem é a do dia de trabalho, não a alfabética: abre em Hoje, arrasta
   no Pipeline, escreve nos Templates, confere nas Métricas. */
const ROTAS = [
  { href: "/crm", rotulo: "Hoje", nota: "a fila", conta: "fila" },
  { href: "/crm/pipeline", rotulo: "Pipeline", nota: "o quadro", conta: "ativos" },
  /* "Caixa" e não "Financeiro" por duas razões que apontam para o mesmo
     lado: é a palavra exata do que a tela responde (quanto entrou, quem me
     deve), e cinco letras cabem na barra do celular, onde cada rota tem
     78px com cinco itens. "Financeiro" é o nome do departamento de uma
     empresa que este estúdio não é. */
  { href: "/crm/caixa", rotulo: "Caixa", nota: "o dinheiro", conta: "cobrar" },
  { href: "/crm/templates", rotulo: "Templates", nota: "as mensagens", conta: "templates" },
  { href: "/crm/metricas", rotulo: "Métricas", nota: "os números", conta: null },
] as const;

/* Quais números falam alto. A regra já estava escrita neste arquivo ("no
   trilho inteiro, quem fala é quem vai te cobrar") e até 20/08 só Hoje
   cabia nela. Parcela vencida é literalmente cobrança, então Caixa entra na
   mesma escada de três estados. Pipeline e Templates continuam em cinza:
   são inventário, não dívida. */
const COBRAM: readonly string[] = ["fila", "cobrar"];

export function Trilho({ sair, contagens }: { sair: () => void; contagens: Contagens }) {
  const caminho = usePathname() ?? "";

  return (
    <nav className={s.trilho} aria-label="Seções do CRM">
      {/* O ponto final rosa é a assinatura da casa, e ela vale em toda
          manchete. Esta é a única marca da ferramenta, e era a única voz de
          display do CRM sem ele. */}
      <Link href="/crm" className={s.trilhoMarca}>
        <b>
          RAFAEL RAZEIRA<i className={s.ponto}>.</i>
        </b>
        <span>PROSPECÇÃO</span>
      </Link>

      <ul className={s.trilhoLista}>
        {ROTAS.map(({ href, rotulo, nota, conta }) => {
          /* "/crm" só acende em si mesmo; as outras acendem também nas
             telas que nascem delas, como /crm/lead/[id], filha do pipeline. */
          const ativo = href === "/crm" ? caminho === "/crm" : caminho.startsWith(href);
          const n = conta ? contagens[conta] : null;

          return (
            <li key={href}>
              <Link
                href={href}
                className={`${s.trilhoLink} ${ativo ? s.trilhoAtivo : ""}`}
                aria-current={ativo ? "page" : undefined}
              >
                <b>
                  {rotulo}
                  {/* Só quem cobra tem cor, e a cor tem três estados como a
                      contagem da coluna do quadro: rosa é "tem gente
                      esperando", esmeralda é "acabou", cinza é o resto do
                      inventário. No trilho inteiro, quem fala é quem vai te
                      cobrar — e é essa mesma frase que decide, na barra do
                      celular, quais números sobrevivem ao aperto. */}
                  {n !== null ? (
                    <i
                      className={`${s.trilhoCont} ${
                        conta && COBRAM.includes(conta) ? (n ? s.trilhoCobra : s.trilhoEmDia) : ""
                      }`}
                    >
                      {n}
                    </i>
                  ) : null}
                </b>
                {/* A nota diz o que a tela É, em duas palavras. Ela existe
                    porque "Hoje" e "Pipeline" são nomes que só significam
                    alguma coisa para quem já usou. Some no celular, onde
                    não há espaço e onde a barra é sempre a mesma. */}
                <span>{nota}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Sair é um formulário e não um link: sair é uma escrita (encerra a
          sessão no servidor), e escrita atrás de GET é o que um
          pré-carregador de link dispara sozinho. */}
      <form action={sair} className={s.trilhoPe}>
        <button type="submit" className={s.trilhoSair}>
          Sair
        </button>
      </form>
    </nav>
  );
}
