"use client";

/* Navegação do estúdio no padrão do painel da loja: trilho compacto no
   computador e quatro atalhos com o menu Mais no celular. */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { IconePainel, type IconePainelNome } from "./IconePainel";
import type { Contagens } from "@/lib/crm/dados";
import s from "@/app/(pt)/crm/crm.module.css";

/* ============================================================
   OS QUATRO MOMENTOS (01/10/2026)

   Eram dez rotas numa lista só, e "Prospecção" embaixo do nome. A
   plataforma cresceu para o estúdio inteiro e o Rafael pediu personalidade
   no trilho: as rotas passaram a morar no momento do trabalho a que servem.
   VENDER é falar com quem pode comprar; FAZER é a prévia e a entrega;
   DINHEIRO é o que entra e o que sobra; CRESCER é o que traz o próximo lead
   e diz para onde o ano vai. Dentro de cada momento vale a ordem do dia.

   Templates subiu para Vender: as mensagens são a voz da abordagem, e o
   lugar delas é colado no Pipeline, não depois do Financeiro.

   No celular os títulos dos momentos somem (a barra deita e cada rota tem
   a largura do nome); a ordem das rotas fica a mesma.
   ============================================================ */
type Rota = {
  href: string;
  rotulo: string;
  nota: string;
  conta: keyof Contagens | null;
};

const MOMENTOS: { nome: string; rotas: Rota[] }[] = [
  {
    nome: "Vendas",
    rotas: [
      { href: "/crm", rotulo: "Hoje", nota: "o estúdio", conta: "fila" },
      { href: "/crm/atendimento", rotulo: "Atendimento", nota: "novos e respostas", conta: null },
      {
        href: "/crm/clientes",
        rotulo: "Clientes",
        nota: "os vínculos",
        conta: null,
      },
      {
        href: "/crm/pipeline",
        /* "Funil" desde 06/10: pipeline é palavra de programador. A URL
           fica, por causa de links e favoritos. */
        rotulo: "Funil",
        nota: "o quadro",
        conta: "ativos",
      },
      {
        href: "/crm/templates",
        rotulo: "Templates",
        nota: "as mensagens",
        conta: "templates",
      },
    ],
  },
  {
    /* A oficina vem antes dos Projetos porque é isso que ela é no dia: o
       card sai do Pipeline, vira prévia aqui, e a prévia vira contrato e
       loja entregue. Sem número nas duas: o número que importaria (lojas
       esperando revisão) só existe depois de você olhar, e o que cobra
       dinheiro já conta no Caixa. */
    nome: "Entregas",
    rotas: [
      {
        href: "/crm/producao",
        rotulo: "Produção",
        nota: "a oficina",
        conta: null,
      },
      {
        href: "/crm/projetos",
        rotulo: "Projetos",
        nota: "as entregas",
        conta: null,
      },
      /* A contagem das vitrines (06/10): onde a chave de cada loja nasce e
         a trava da aba Desempenho se mexe. Sem número: o que importa aqui
         é "o último evento chegou?", e isso só se lê dentro da tela. */
      {
        href: "/crm/performance",
        rotulo: "Performance",
        nota: "a contagem",
        conta: null,
      },
      /* 23/10: o que as lojas entregues perguntam pela aba Suporte do
         painel. Conta as conversas esperando o estúdio, em vermelho: dono
         esperando resposta é cobrança. */
      {
        href: "/crm/suporte",
        rotulo: "Suporte",
        nota: "as lojas perguntam",
        conta: "suporte",
      },
    ],
  },
  {
    /* "Caixa" é a palavra exata do que a tela responde (quanto entrou, quem
       me deve) e cabe na barra do celular. O Financeiro é a outra metade da
       mesma pergunta (30/09): o que saiu e se sobrou. Sem número: o
       resultado do mês tem contexto só dentro da tela. */
    nome: "Financeiro",
    rotas: [
      { href: "/crm/caixa", rotulo: "Caixa", nota: "receber e cobrar", conta: "cobrar" },
      {
        href: "/crm/financeiro",
        rotulo: "Financeiro",
        nota: "resultado e despesas",
        conta: null,
      },
    ],
  },
  {
    /* O marketing olha para fora do funil: é o que traz o próximo lead. As
       métricas dizem como o mês foi, e o plano fecha o trilho porque dá
       sentido ao resto (30/09). Nenhum conta: peça sem data não é cobrança,
       e a nota do plano mora na tela dele. */
    nome: "Crescer",
    rotas: [
      {
        href: "/crm/marketing",
        rotulo: "Marketing",
        nota: "os posts",
        conta: null,
      },
      {
        href: "/crm/metricas",
        rotulo: "Indicadores",
        nota: "os números",
        conta: null,
      },
      { href: "/crm/plano", rotulo: "Plano", nota: "o rumo", conta: null },
    ],
  },
];

/* Quais números falam alto. A regra já estava escrita neste arquivo ("no
   trilho inteiro, quem fala é quem vai te cobrar") e até 20/08 só Hoje
   cabia nela. Parcela vencida é literalmente cobrança, então Caixa entra na
   mesma escada de três estados. Pipeline e Templates continuam em cinza:
   são inventário, não dívida. */
const COBRAM: readonly string[] = ["fila", "cobrar", "suporte"];

const ICONES: Record<string, IconePainelNome> = {
  "/crm/clientes": "clientes",
  "/crm/atendimento": "mensagens",
  "/crm": "hoje",
  "/crm/pipeline": "funil",
  "/crm/templates": "mensagens",
  "/crm/producao": "producao",
  "/crm/projetos": "projetos",
  "/crm/performance": "performance",
  "/crm/suporte": "suporte",
  "/crm/caixa": "caixa",
  "/crm/financeiro": "financeiro",
  "/crm/marketing": "marketing",
  "/crm/ai-studio": "ai",
  "/crm/metricas": "metricas",
  "/crm/plano": "plano",
};

const PRINCIPAIS = ["/crm", "/crm/pipeline", "/crm/producao", "/crm/caixa"];

export function Trilho({
  sair,
  contagens,
}: {
  sair: () => void;
  contagens: Contagens;
}) {
  const caminho = usePathname() ?? "";
  const [menuAberto, setMenuAberto] = useState(false);
  const [menuFixo, setMenuFixo] = useState(false);
  useEffect(() => {
    try {
      setMenuFixo(localStorage.getItem("crm-menu-fixo") === "1");
    } catch {}
  }, []);
  const botaoMais = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setMenuAberto(false);
  }, [caminho]);
  useEffect(() => {
    if (!menuAberto) return;
    menu.current?.querySelector<HTMLElement>("[aria-current=page], a")?.focus();
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuAberto(false);
        botaoMais.current?.focus();
      }
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [menuAberto]);
  const estaAtiva = (href: string) =>
    href === "/crm"
      ? caminho === "/crm"
      : caminho === href ||
        caminho.startsWith(`${href}/`) ||
        (href === "/crm/pipeline" && caminho.startsWith("/crm/lead/")) ||
        (href === "/crm/financeiro" && caminho === "/crm/conciliacao");
  return (
    <>
      <a href="#crm-principal" className={s.pularConteudo}>
        Pular para o conteúdo
      </a>
      <nav
        className={s.trilho + (menuFixo ? " " + s.trilhoFixo : "")}
        aria-label="Seções do estúdio"
      >
        <div className={s.trilhoPainel}>
          <Link
            href="/crm"
            className={s.trilhoMarca}
            aria-label="Rafael Razeira Estúdio, início"
          >
            <Image
              src="/marca/rr.webp"
              alt=""
              width={36}
              height={36}
              className={s.trilhoLogo}
              priority
            />
            <span className={s.trilhoMarcaTexto}>
              <b>Rafael Razeira</b>

              <small>Painel do estúdio</small>
            </span>
          </Link>
          <button
            type="button"
            className={s.fixarMenu}
            aria-pressed={menuFixo}
            aria-label={menuFixo ? "Recolher menu" : "Manter menu aberto"}
            title={menuFixo ? "Recolher menu" : "Manter menu aberto"}
            onClick={() => {
              const aberto = !menuFixo;
              setMenuFixo(aberto);
              try {
                localStorage.setItem("crm-menu-fixo", aberto ? "1" : "0");
              } catch {}
            }}
          >
            <span aria-hidden="true">☰</span>
            <span className={s.trilhoTexto}>
              {menuFixo ? "Recolher menu" : "Manter aberto"}
            </span>
          </button>

          <ul className={s.trilhoLista}>
            {MOMENTOS.flatMap(({ nome, rotas }) => [
              <li key={nome} className={s.trilhoMomento} aria-hidden>
                {nome}
              </li>,
              ...rotas.map(({ href, rotulo, nota, conta }) => {
                /* "/crm" só acende em si mesmo; as outras acendem também nas
             telas que nascem delas, como /crm/lead/[id], filha do pipeline. */
                const ativo = estaAtiva(href);
                const n = conta ? contagens[conta] : null;

                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={`${s.trilhoLink} ${ativo ? s.trilhoAtivo : ""}`}
                      aria-current={ativo ? "page" : undefined}
                      aria-label={`${rotulo}${n !== null ? `, ${n} ${nota}` : ""}`}
                      title={rotulo}
                    >
                      <IconePainel
                        nome={ICONES[href]}
                        className={s.trilhoIcone}
                      />
                      <div className={s.trilhoTexto}>
                        <b>
                          {rotulo}

                          {n !== null ? (
                            <i
                              className={`${s.trilhoCont} ${conta && COBRAM.includes(conta) ? (n ? s.trilhoCobra : s.trilhoEmDia) : ""}`}
                            >
                              {n}
                            </i>
                          ) : null}
                        </b>

                        <span>{nota}</span>
                      </div>
                    </Link>
                  </li>
                );
              }),
            ])}
          </ul>

          <form action={sair} className={s.trilhoPe}>
            <button type="submit" className={s.trilhoSair}>
              <IconePainel nome="sair" />
              <span>Sair do estúdio</span>
            </button>
          </form>
        </div>
      </nav>
      <nav
        className={s.barraCelular}
        aria-label="Navegação do estúdio no celular"
      >
        {MOMENTOS.flatMap(({ rotas }) => rotas)
          .filter(({ href }) => PRINCIPAIS.includes(href))
          .map(({ href, rotulo }) => (
            <Link
              key={href}
              href={href}
              aria-current={estaAtiva(href) ? "page" : undefined}
            >
              <IconePainel nome={ICONES[href]} />
              <span>{rotulo}</span>
            </Link>
          ))}
        <button
          type="button"
          ref={botaoMais}
          aria-expanded={menuAberto}
          aria-controls="crm-menu-celular"
          className={
            !PRINCIPAIS.some(estaAtiva) || menuAberto ? s.barraMaisAtivo : ""
          }
          onClick={() => setMenuAberto((aberto) => !aberto)}
        >
          <IconePainel nome="menu" />
          <span>Mais</span>
        </button>
      </nav>
      {menuAberto ? (
        <div
          ref={menu}
          id="crm-menu-celular"
          role="navigation"
          className={s.menuCelular}
          aria-label="Todas as seções do estúdio"
        >
          <div className={s.menuCelularCab}>
            <b>Seu estúdio</b>
            <button
              type="button"
              onClick={() => {
                setMenuAberto(false);
                botaoMais.current?.focus();
              }}
            >
              Fechar
            </button>
          </div>
          {MOMENTOS.map(({ nome, rotas }) => (
            <div key={nome} className={s.menuCelularGrupo}>
              <p>{nome}</p>
              {rotas.map(({ href, rotulo, nota, conta }) => (
                <Link
                  key={href}
                  href={href}
                  aria-current={estaAtiva(href) ? "page" : undefined}
                  onClick={() => setMenuAberto(false)}
                >
                  <IconePainel nome={ICONES[href]} />
                  <span>
                    {rotulo}
                    <small>{nota}</small>
                  </span>
                  {conta ? <b>{contagens[conta]}</b> : null}
                </Link>
              ))}
            </div>
          ))}
          <form action={sair}>
            <button type="submit" className={s.menuCelularSair}>
              <IconePainel nome="sair" />
              Sair do estúdio
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
