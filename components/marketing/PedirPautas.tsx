"use client";

/* ============================================================
   PEDIR PAUTAS À PAULA, E VER O PEDIDO ANDAR (01/10/2026)

   "Eu cliquei em pedir à Paula e não sei se está rodando ou não." O botão
   só fazia o pedido e recarregava a tela; o pedido entrava na fila atrás de
   quatro da Dora, e nada perto do botão dizia isso. Agora o último pedido de
   pautas aparece aqui com o estado dele, em palavras:

     na fila ....... quantos pedidos estão na frente, e quem está rodando
     time parado ... o pedido não vai andar, e o botão de ligar
     rodando ....... a Paula está escrevendo, desde que horas
     pronto ........ as pautas novas chegaram (por 30 minutos)
     falhou ........ o erro, inteiro

   Enquanto houver pedido aberto a tela se atualiza sozinha a cada 5s, e o
   botão fica travado: dois pedidos de pautas seguidos fariam a Paula
   propor duas vezes sobre a mesma lista.
   ============================================================ */
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { pedir } from "@/app/(pt)/crm/acoes-marketing";
import { CATEGORIAS, TIPOS, WORKER_VIVO_MS, type Categoria, type Pedido, type TipoPeca } from "@/lib/marketing/tipos";
import { LigarTime, nomePedido } from "./SinalTime";
import m from "@/app/(pt)/crm/marketing.module.css";
import s from "@/app/(pt)/crm/crm.module.css";

const PRONTO_POR_MS = 30 * 60_000;

function hora(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function PedirPautas({ ultimo, fila, vistoEm }: { ultimo: Pedido | null; fila: Pedido[]; vistoEm: string | null }) {
  const router = useRouter();
  const [pendente, comecar] = useTransition();
  const [erro, setErro] = useState("");
  const [n, setN] = useState(5);
  const [tipo, setTipo] = useState<"" | TipoPeca>("");
  const [categoria, setCategoria] = useState<"" | Categoria>("");
  const [agora, setAgora] = useState(() => Date.now());

  const aberto = ultimo && (ultimo.status === "na_fila" || ultimo.status === "rodando") ? ultimo : null;
  const vivo = vistoEm ? agora - new Date(vistoEm).getTime() < WORKER_VIVO_MS : false;

  useEffect(() => {
    const t = setInterval(() => {
      setAgora(Date.now());
      if (aberto) router.refresh();
    }, 5000);
    return () => clearInterval(t);
  }, [aberto, router]);

  function pedirPautas() {
    setErro("");
    comecar(async () => {
      const r = await pedir(null, "pautas", { n, tipo: tipo || null, categoria: categoria || null });
      if (!r.ok) setErro(r.erro);
      router.refresh();
    });
  }

  /* o que dizer sobre o último pedido */
  let estado: { tom: "anda" | "parado" | "pronto" | "falhou"; texto: React.ReactNode } | null = null;
  if (aberto?.status === "rodando") {
    estado = { tom: "anda", texto: <>A Paula está escrevendo as pautas. Começou às {hora(aberto.iniciado_em)}; leva perto de um minuto.</> };
  } else if (aberto && !vivo) {
    estado = {
      tom: "parado",
      texto: (
        <>
          O pedido está na fila desde as {hora(aberto.criado_em)}, mas o time está desligado. <LigarTime />
        </>
      ),
    };
  } else if (aberto) {
    const frente = fila.filter((p) => p.id !== aberto.id && p.criado_em < aberto.criado_em);
    const rodando = fila.find((p) => p.status === "rodando");
    estado = {
      tom: "anda",
      texto: frente.length ? (
        <>
          Na fila. A Paula começa depois de {frente.length} {frente.length === 1 ? "pedido" : "pedidos"}
          {rodando ? <>; agora: {nomePedido(rodando)}</> : null}.
        </>
      ) : (
        <>Na fila. A Paula começa em instantes.</>
      ),
    };
  } else if (ultimo?.status === "feito" && ultimo.terminado_em && agora - new Date(ultimo.terminado_em).getTime() < PRONTO_POR_MS) {
    estado = { tom: "pronto", texto: <>A Paula entregou às {hora(ultimo.terminado_em)}. As pautas novas são as primeiras da lista.</> };
  } else if (ultimo?.status === "erro") {
    estado = { tom: "falhou", texto: <>O último pedido de pautas falhou às {hora(ultimo.terminado_em)}: {ultimo.erro}</> };
  }

  return (
    <div className={m.paula}>
      <div className={m.pautasLinha}>
        <span>Pedir</span>
        <select value={n} onChange={(e) => setN(Number(e.target.value))} aria-label="Quantas pautas">
          {[3, 5, 7, 10].map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
        <span>pautas de</span>
        <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoPeca | "")} aria-label="Formato">
          <option value="">qualquer formato</option>
          {(["carrossel", "post_feed", "story"] as TipoPeca[]).map((t) => (
            <option key={t} value={t}>
              {TIPOS[t].nome.toLowerCase()}
            </option>
          ))}
        </select>
        <span>sobre</span>
        {/* 01/10: "na hora da criação, eu escolher qual categoria a gente
            quer fazer". Vazio = a Paula espalha pelas fatias do mês. */}
        <select value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria | "")} aria-label="Categoria">
          <option value="">todas as categorias</option>
          {(Object.keys(CATEGORIAS) as Categoria[]).map((c) => (
            <option key={c} value={c}>
              {CATEGORIAS[c].nome.toLowerCase()}
            </option>
          ))}
        </select>
        <button type="button" className={s.btnAcao} onClick={pedirPautas} disabled={pendente || Boolean(aberto)}>
          {pendente ? "Pedindo" : aberto ? "Pedido em andamento" : "Pedir à Paula"}
        </button>
      </div>

      {estado ? (
        <p className={`${m.paulaEstado} ${m[`paula_${estado.tom}`]}`} role="status" aria-live="polite">
          <i aria-hidden />
          <span>{estado.texto}</span>
        </p>
      ) : null}
      {erro ? <p className={s.erro}>{erro}</p> : null}
    </div>
  );
}
