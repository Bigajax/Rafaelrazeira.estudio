"use client";

/* ============================================================
   A SAÍDA — três botões, três destinos

   O que sai daqui não é dado de produção: é material para o projeto do
   cliente, que continua com repo e Supabase próprios. Por isso a
   exportação copia e baixa, e nunca escreve em lugar nenhum.

   O aviso do topo não é enfeite: exportar com metade do catálogo por
   conferir é o jeito mais fácil de levar um preço de parcela para dentro
   da loja de alguém.
   ============================================================ */

import { useState } from "react";
import s from "@/app/(pt)/crm/crm.module.css";
import p from "@/app/(pt)/crm/producao.module.css";
import { paraCsv, paraJson, paraSql } from "@/lib/producao/exportar";
import type { Loja, Produto } from "@/lib/producao/tipos";

export function Exportar({
  loja,
  produtos,
  urls,
}: {
  loja: Loja;
  produtos: Produto[];
  urls: Record<string, string>;
}) {
  const [copiado, setCopiado] = useState("");

  /* A imagem viaja como URL pública do Storage, e isso é de propósito: no
     dia da montagem você baixa em lote ou aponta direto, mas a linha do CSV
     nunca fica sem a foto que a legenda descreve. */
  const urlDaImagem = (prod: Produto) => (prod.ativo_id ? urls[prod.ativo_id] ?? "" : "");


  const faltaConferir = produtos.filter((x) => !x.revisado).length;

  /* ---------- o que ainda falta, dito antes da entrega ----------
     Uma ordem de serviço não termina no último campo preenchido: ela
     termina na conferência do que saiu. Estas quatro linhas são o
     equivalente disso, e todas são derivadas (ninguém marca "pendente" à
     mão): peça sem conferir, peça sem preço, marca sem tinta, conceito sem
     voz. Nenhuma impede exportar; elas dizem o que o briefing vai deixar
     de prometer. */
  const semPreco = produtos.filter((x) => x.preco === null).length;
  const semTinta = !(loja.identidade?.paleta ?? [])[0];
  const semVoz = !(loja.conceito?.personalidade ?? []).length;
  const pendencias = [
    faltaConferir
      ? `${faltaConferir} ${faltaConferir === 1 ? "peça ainda não conferida" : "peças ainda não conferidas"}`
      : null,
    semPreco
      ? `${semPreco} ${semPreco === 1 ? "peça sem preço: vai sair como “consulte”" : "peças sem preço: vão sair como “consulte”"}`
      : null,
    semTinta ? "a marca ainda não tem tinta: o briefing manda escolher pelas fotos" : null,
    semVoz ? "o conceito não tem voz marcada: a página vai sair sem tom definido" : null,
  ].filter(Boolean) as string[];

  /* ---------- o destino de cada saída, na tela ----------
     Os quatro formatos existem porque são QUATRO DESTINOS diferentes, e
     isso estava escrito só no comentário do código. Na tela ficavam quatro
     siglas idênticas em peso, e escolher entre CSV e SQL virava adivinhar.
     O destino é a única coisa que decide qual você quer. */
  const arquivos = [
    { chave: "csv", rotulo: "CSV", destino: "para o import do Supabase", nome: `${loja.arroba}-catalogo.csv`, tipo: "text/csv", texto: () => paraCsv(produtos, urlDaImagem) },
    { chave: "sql", rotulo: "SQL", destino: "para o SQL Editor, quando a tabela já tem forma", nome: `${loja.arroba}-catalogo.sql`, tipo: "text/plain", texto: () => paraSql(produtos, urlDaImagem) },
    { chave: "json", rotulo: "JSON da marca", destino: "o tema: paleta, fundo, tipografia", nome: `${loja.arroba}-marca.json`, tipo: "application/json", texto: () => paraJson(loja, loja.identidade ?? {}) },
    /* O PROMPT SAIU DAQUI (27/08). Ele virou bloco próprio no fim da ficha,
       com modo prévia, versões guardadas e a trava de condição comercial.
       Duas fontes do mesmo artefato divergem em uma semana, e a que fica é
       a que tem histórico. Aqui ficam só os DADOS. */
  ];

  async function copiar(chave: string, texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(chave);
      window.setTimeout(() => setCopiado(""), 2000);
    } catch {
      /* Clipboard bloqueado (acontece em aba sem foco). O download continua
         funcionando, e é o que a frase manda fazer. */
      setCopiado("erro");
    }
  }

  function baixar(nome: string, tipo: string, texto: string) {
    const url = URL.createObjectURL(new Blob([texto], { type: `${tipo};charset=utf-8` }));
    const a = document.createElement("a");
    a.href = url;
    a.download = nome;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    /* ---------- o fecho ----------
       Os sete blocos da ficha tinham exatamente o mesmo peso: filete,
       título, conteúdo, sete vezes. Ritmo uniforme em documento longo é o
       que faz ele não ter fim, e esta ficha TEM um fim: a entrega.

       É a única superfície escura da tela, e é de propósito. Ela não
       repete nenhuma outra: o grafite aqui significa "acabou, é isto que
       sai", do mesmo jeito que o carimbo lá em cima significa "pronta". */
    <section className={`${p.bloco} ${p.fecho}`}>
      <div className={p.blocoCab}>
        <h2>
          Entrega<i className={s.ponto}>.</i>
        </h2>
        <span className={p.blocoRot}>o que sai da bancada</span>
      </div>

      {pendencias.length > 0 && (
        <div className={p.pendencias}>
          <p>Sai assim mesmo, com estas ressalvas:</p>
          <ul>
            {pendencias.map((linha) => (
              <li key={linha}>{linha}</li>
            ))}
          </ul>
        </div>
      )}

      <ul className={p.saidas}>
        {arquivos.map((a) => (
          <li key={a.chave}>
            <span className={p.saidaNome}>
              {a.rotulo}
              <em>{a.destino}</em>
            </span>
            <button type="button" className={`${s.btnMini} ${p.btnGrafite}`} onClick={() => copiar(a.chave, a.texto())}>
              {copiado === a.chave ? "COPIADO" : "COPIAR"}
            </button>
            <button type="button" className={`${s.btnMini} ${p.btnGrafite}`} onClick={() => baixar(a.nome, a.tipo, a.texto())}>
              BAIXAR
            </button>
          </li>
        ))}
      </ul>

      {copiado === "erro" && <p className={p.aviso}>O navegador bloqueou a cópia. Use o botão de baixar.</p>}
    </section>
  );
}
