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
import { useEffect, useRef } from "react";
import type { Contagens } from "@/lib/crm/dados";
import s from "@/app/(pt)/crm/crm.module.css";

/* A ordem é a do dia de trabalho, não a alfabética: abre em Hoje, arrasta
   no Pipeline, escreve nos Templates, confere nas Métricas. */
const ROTAS = [
  { href: "/crm", rotulo: "Hoje", nota: "a fila", conta: "fila" },
  { href: "/crm/pipeline", rotulo: "Pipeline", nota: "o quadro", conta: "ativos" },
  /* A oficina fica entre o quadro e o caixa porque é isso que ela é no
     dia: o card sai do Pipeline, passa por aqui para virar prévia, e só
     depois vira dinheiro. Sem contagem: o número que importaria (lojas
     esperando revisão) só existe depois de você olhar, e um contador que
     pede atenção sem ter cobrança é ruído no trilho. */
  { href: "/crm/producao", rotulo: "Produção", nota: "a oficina", conta: null },
  /* Projetos vem logo depois da oficina porque é a continuação dela: a
     prévia vira contrato e o contrato vira loja entregue. Sem número pelo
     mesmo motivo da Produção: o que cobra dinheiro já conta no Caixa. */
  { href: "/crm/projetos", rotulo: "Projetos", nota: "as entregas", conta: null },
  /* "Caixa" e não "Financeiro" por duas razões que apontam para o mesmo
     lado: é a palavra exata do que a tela responde (quanto entrou, quem me
     deve), e cinco letras cabem na barra do celular, onde cada rota tem
     78px com cinco itens. "Financeiro" é o nome do departamento de uma
     empresa que este estúdio não é. */
  { href: "/crm/caixa", rotulo: "Caixa", nota: "o dinheiro", conta: "cobrar" },
  /* O Financeiro vem colado no Caixa porque é a outra metade da mesma
     pergunta (30/09): o Caixa diz quem deve e o que entrou; o Financeiro diz
     o que saiu e se sobrou. Sem número: o resultado do mês tem contexto só
     dentro da tela. */
  { href: "/crm/financeiro", rotulo: "Financeiro", nota: "o resultado", conta: null },
  { href: "/crm/templates", rotulo: "Templates", nota: "as mensagens", conta: "templates" },
  /* O marketing olha para fora do funil: é o que traz o próximo lead, não o
     que trabalha o atual. Por isso vem depois das mensagens, e sem número:
     peça sem data não é cobrança. */
  { href: "/crm/marketing", rotulo: "Marketing", nota: "os posts", conta: null },
  { href: "/crm/metricas", rotulo: "Métricas", nota: "os números", conta: null },
  /* O plano fecha o trilho porque é o que dá sentido ao resto: as métricas
     dizem como o mês foi, o plano diz para onde o ano vai (30/09). Sem
     número: a nota do painel mora na própria tela, onde ela tem contexto. */
  { href: "/crm/plano", rotulo: "Plano", nota: "o rumo", conta: null },
] as const;

/* Quais números falam alto. A regra já estava escrita neste arquivo ("no
   trilho inteiro, quem fala é quem vai te cobrar") e até 20/08 só Hoje
   cabia nela. Parcela vencida é literalmente cobrança, então Caixa entra na
   mesma escada de três estados. Pipeline e Templates continuam em cinza:
   são inventário, não dívida. */
const COBRAM: readonly string[] = ["fila", "cobrar"];

export function Trilho({ sair, contagens }: { sair: () => void; contagens: Contagens }) {
  const caminho = usePathname() ?? "";
  /* no celular a barra desliza (nove rotas não cabem em 390px): ao trocar de
     tela, a rota acesa vem para o meio, senão o Plano abria escondido na
     ponta direita. No computador a lista não rola e isto não faz nada. */
  const lista = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const ul = lista.current;
    const aceso = ul?.querySelector<HTMLElement>("[aria-current=page]");
    if (!ul || !aceso || ul.scrollWidth <= ul.clientWidth) return;
    ul.scrollLeft = aceso.offsetLeft - (ul.clientWidth - aceso.offsetWidth) / 2;
  }, [caminho]);

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

      <ul className={s.trilhoLista} ref={lista}>
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
