"use client";

/* ============================================================
   A BANCADA — as fichas em cima da mesa

   A tela que responde "o que está em produção agora". Uma ficha por loja,
   e cada ficha responde três coisas na ordem em que se pergunta: que loja é
   (avatar e nome), em que pé está (a régua), e quanto material existe (os
   números).

   ---------- por que ficha e não linha de tabela ----------
   A primeira versão era uma linha por loja, e linha de tabela é o desenho
   de quem COMPARA valores: certo para o kanban do CRM, errado aqui. Numa
   bancada não se compara loja com loja, se escolhe qual pegar agora, e essa
   escolha é feita pelo estado (a régua) e pelo volume (os números), que
   numa linha ficavam espremidos no fim.

   O formulário de nova loja fica no topo e pede um campo só: abrir loja é a
   ação mais frequente desta tela, e modal para um campo é uma porta que se
   abre para dar um passo.
   ============================================================ */

import Link from "next/link";
import { useState, useTransition } from "react";
import { criarLoja } from "@/app/(pt)/crm/acoes-producao";
import s from "@/app/(pt)/crm/crm.module.css";
import p from "@/app/(pt)/crm/producao.module.css";
import { NOTA_STATUS, ROTULO_STATUS, type Status } from "@/lib/producao/tipos";
import type { LojaNaLista } from "@/lib/producao/dados";
import { Regua, etapasDe } from "./Regua";

type Lead = { id: string; nome: string; empresa: string | null; instagram: string | null };

/* "hoje" e "ontem" por extenso, o resto em dias, e a partir de duas
   semanas a frase muda de tom: material com essa idade quase sempre já
   perdeu postagem nova, e a palavra precisa dizer isso sem alarmar. */
function idade(dias: number): string {
  if (dias <= 0) return "colhida hoje";
  if (dias === 1) return "colhida ontem";
  if (dias < 14) return `colhida há ${dias} dias`;
  return `colhida há ${Math.floor(dias / 7)} semanas`;
}

export function Lojas({ lojas, leads }: { lojas: LojaNaLista[]; leads: Lead[] }) {
  const [erro, setErro] = useState("");
  const [enviando, comEnvio] = useTransition();

  function abrir(form: FormData) {
    setErro("");
    comEnvio(async () => {
      const r = await criarLoja(form);
      /* Quando dá certo a ação redireciona e nada volta. O retorno só existe
         no caminho do erro. */
      if (r && !r.ok) setErro(r.erro);
    });
  }

  return (
    <div className={s.wrap}>
      <div className={s.tituloLinha}>
        <h1>
          Produção<i className={s.ponto}>.</i>
        </h1>
      </div>
      <p className={s.subtitulo}>
        A bancada: colher o Instagram da loja, ler o catálogo das fotos e fechar a ficha da marca. O que sai
        daqui é material pronto para montar a prévia.
      </p>

      {/* ---------- a entrada da bancada ----------
          Esta faixa é um gesto só: escrever um arroba e mandar buscar. A
          primeira versão a desenhava como formulário de cadastro, com dois
          campos em caixa e rótulo em cima de cada um, e ela lia como
          burocracia de entrada em vez do começo do trabalho.

          O @ em corpo de manchete faz o campo virar OBJETO: ele é o rótulo,
          a marca do domínio (arroba é do Instagram, não de banco de dados)
          e o ponto de partida da linha, tudo ao mesmo tempo. E a linha
          embaixo do campo, no lugar da caixa, é o que separa "preencher um
          formulário" de "escrever numa ficha". */}
      <form action={abrir} className={p.entrada}>
        <p className={p.entradaRot}>Entra na bancada</p>

        <div className={p.campoArroba}>
          <i aria-hidden>@</i>
          <input
            name="arroba"
            aria-label="Arroba da loja no Instagram"
            placeholder="usekanton"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
            required
          />
        </div>

        {/* O vínculo com o lead é opcional e fica ao lado, não em cima: nem
            toda loja que você desenha veio do funil. */}
        <label className={p.campoLead}>
          <span>Lead</span>
          <select name="lead_id" defaultValue="">
            <option value="">sem vínculo</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.empresa || l.nome}
                {l.instagram ? ` · @${l.instagram.replace(/^@/, "")}` : ""}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" className={s.btn} disabled={enviando}>
          {enviando ? "ABRINDO…" : "ABRIR A FICHA"}
        </button>
      </form>
      {erro && (
        <p className={p.erro} role="alert">
          {erro}
        </p>
      )}

      {!lojas.length ? (
        <div className={p.vazio}>
          <b>Bancada limpa</b>
          <p>Escreva o arroba de uma loja aí em cima. A oficina busca as fotos, lê o catálogo e monta a ficha.</p>
        </div>
      ) : (
        <ul className={p.bancada}>
          {lojas.map((l) => (
            <li key={l.id}>
              <Link href={`/crm/producao/${l.id}`} className={`${p.ficha} ${p[`borda_${l.status}`] ?? ""}`}>
                <div className={p.fichaTopo}>
                  <span className={p.avatar} aria-hidden>
                    {l.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={l.avatar} alt="" />
                    ) : (
                      <i>{l.arroba.slice(0, 2).toUpperCase()}</i>
                    )}
                  </span>
                  <span className={p.fichaNome}>
                    <b>{l.nome || `@${l.arroba}`}</b>
                    <small>
                      @{l.arroba}
                      {/* A idade do material fica colada no arroba porque as
                          duas coisas respondem "o que eu tenho em mãos": de
                          quem é, e de quando é. */}
                      {l.colhidoHa !== null && <em>{idade(l.colhidoHa)}</em>}
                    </small>
                  </span>
                </div>

                <Regua etapas={etapasDe(l.status, l.produtos, l.revisados)} />

                {/* Os números vêm ANTES da nota, e a inversão não é gosto:
                    numa ficha, o corpo é o material (quantas fotos, quantas
                    peças) e a nota é rodapé. Com a nota no meio, uma frase
                    de erro de terceiro virava a maior coisa do cartão. */}
                <span className={p.numeros}>
                  <span className={`${p.num} ${l.imagens ? "" : p.numVazio}`}>
                    <b>{l.imagens}</b>
                    <span>fotos</span>
                  </span>
                  <span className={`${p.num} ${l.produtos ? "" : p.numVazio}`}>
                    <b>{l.produtos}</b>
                    <span>peças</span>
                  </span>
                  <span className={`${p.num} ${l.revisados ? "" : p.numVazio}`}>
                    <b>{l.revisados}</b>
                    <span>conferidas</span>
                  </span>
                </span>

                {/* A nota, e só a nota: o rótulo do status ("colhida") já
                    está dito pela régua, dois centímetros acima, e repetir
                    gastava a linha mais visível do rodapé com uma palavra
                    que o olho acabou de ler. Quando a colheita falhou, a
                    marca de margem vira rosa e a frase é o erro. */}
                {l.nota && (
                  <span className={`${p.recado} ${l.status === "erro" ? p.recadoErro : ""}`}>{l.nota}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* O estado com duas alturas de voz: o rótulo diz onde a loja está, a linha
   de baixo diz o que fazer em seguida. Quando a colheita falhou, a nota é o
   erro de verdade, e ela vale mais que a frase genérica do status. */
export function Estado({ status, nota }: { status: Status; nota: string | null }) {
  return (
    <span className={p.estado}>
      <b>{ROTULO_STATUS[status]}</b>
      <small>{nota || NOTA_STATUS[status]}</small>
    </span>
  );
}
