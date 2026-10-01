"use client";

/* O time está acordado? Lê o batimento do worker e, enquanto houver pedido
   aberto, recarrega a tela sozinho a cada 5s para o resultado aparecer sem
   F5. Sem pedido aberto não recarrega nada: a tela fica quieta. */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AGENTES, WORKER_VIVO_MS, type Agente, type Pedido } from "@/lib/marketing/tipos";
import m from "@/app/(pt)/crm/marketing.module.css";

export function nomePedido(p: Pick<Pedido, "agente" | "etapa">) {
  if (p.agente === "pautas") return "Paula propondo pautas";
  const quem = (p.agente === "tudo" ? p.etapa : p.agente) as Agente | null;
  if (!quem) return "A linha inteira, na fila";
  return `${AGENTES[quem].nome} escrevendo ${AGENTES[quem].faz}`;
}

/* O botão que liga o time (01/10). O site está na Vercel e não abre programa
   no PC; o link rr-marketing:// é que o Windows entrega ao
   scripts/ligar-time-marketing.cmd (registrado uma vez pelo
   scripts/registrar-botao-time.cmd). Só funciona no PC do estúdio. Na
   primeira vez o Chrome pergunta se pode abrir: marcar "sempre permitir". */
export function LigarTime() {
  return (
    <a className={m.ligarTime} href="rr-marketing://ligar" title="Abre a janela do time no PC. Não funciona pelo celular.">
      Ligar o time
    </a>
  );
}

export function SinalTime({ vistoEm, abertos }: { vistoEm: string | null; abertos: Pedido[] }) {
  const router = useRouter();
  const [agora, setAgora] = useState(() => Date.now());
  const vivo = vistoEm ? agora - new Date(vistoEm).getTime() < WORKER_VIVO_MS : false;

  useEffect(() => {
    const t = setInterval(() => {
      setAgora(Date.now());
      if (abertos.length) router.refresh();
    }, 5000);
    return () => clearInterval(t);
  }, [abertos.length, router]);

  const rodando = abertos.find((p) => p.status === "rodando");
  const naFila = abertos.filter((p) => p.status === "na_fila").length;

  return (
    <div className={`${m.sinal} ${vivo ? m.sinalVivo : ""}`} role="status">
      <i aria-hidden />
      {vivo ? (
        <span>
          {rodando ? nomePedido(rodando) : "O time está acordado"}
          {naFila ? `, ${naFila} na fila` : ""}
        </span>
      ) : (
        <span>
          O time está desligado{abertos.length ? `, com ${abertos.length} pedido${abertos.length > 1 ? "s" : ""} esperando` : ""}.
        </span>
      )}
      {vivo ? null : <LigarTime />}
    </div>
  );
}
