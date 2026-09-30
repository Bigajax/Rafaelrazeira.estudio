"use client";

/* ============================================================
   O MATERIAL QUE O CLIENTE MANDOU

   Lê o mesmo endereço que o checklist do cliente usa (/api/material), e
   resume o que chegou: quantas peças ele respondeu, quantas fotos, e as
   respostas que decidem o resto do projeto (preço no site, HostGator,
   WhatsApp dos pedidos). As fotos em qualidade cheia não vêm para cá: elas
   descem para o PC pelo `scripts/material-cliente.mjs`, que é onde o
   cadastro acontece.
   ============================================================ */

import { useEffect, useState } from "react";
import p from "@/app/(pt)/crm/projetos.module.css";

type Respostas = {
  totalPecas?: number;
  precoNoSite?: string;
  pecas?: Record<string, { status?: string; preco?: string }>;
  novas?: unknown[];
  fotos?: Record<string, string[]>;
  marcas?: string;
  banners?: string;
  bannersObs?: string;
  hostgator?: string;
  emailDominio?: string;
  whatsapp?: string;
  email?: string;
  recado?: string;
  atualizado?: string;
};

export function Material({ loja }: { loja: string }) {
  const [r, setR] = useState<Respostas | null>(null);
  const [miniaturas, setMiniaturas] = useState<string[]>([]);
  const [estado, setEstado] = useState<"lendo" | "ok" | "erro">("lendo");

  useEffect(() => {
    let vivo = true;
    fetch(`/api/material?loja=${encodeURIComponent(loja)}`, { cache: "no-store" })
      .then((x) => x.json())
      .then((j) => {
        if (!vivo) return;
        if (!j.ok) return setEstado("erro");
        setR(j.respostas || {});
        setMiniaturas(Object.values((j.miniaturas || {}) as Record<string, string>).slice(0, 12));
        setEstado("ok");
      })
      .catch(() => vivo && setEstado("erro"));
    return () => {
      vivo = false;
    };
  }, [loja]);

  if (estado === "lendo") return <p className={p.materialVazio}>Lendo o que ele mandou…</p>;
  if (estado === "erro")
    return (
      <p className={p.materialVazio}>
        Não achei o checklist <b>{loja}</b> no cofre. Crie de novo pelo botão acima.
      </p>
    );

  if (!r || !r.atualizado)
    return (
      <p className={p.materialVazio}>Ele ainda não preencheu nada.</p>
    );

  const pecas = Object.values(r.pecas || {});
  const tem = pecas.filter((x) => x.status === "tem").length;
  const saiu = pecas.filter((x) => x.status === "saiu").length;
  const comPreco = pecas.filter((x) => x.preco).length;
  const fotos = Object.values(r.fotos || {}).reduce((t, a) => t + a.length, 0);
  const total = r.totalPecas;
  const quando = new Date(r.atualizado).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  const fatos: [string, string, boolean][] = [
    ["Peças", `${tem + saiu}${total ? ` de ${total}` : ""} respondidas: ${tem} tem, ${saiu} saíram`, !!total && tem + saiu === total],
    ["Novas", String((r.novas || []).length), false],
    ["Fotos", String(fotos), fotos > 0],
    ["Preço", r.precoNoSite === "sim" ? `mostrar (${comPreco} com preço)` : r.precoNoSite === "nao" ? "Valor no WhatsApp" : "não respondeu", !!r.precoNoSite],
    ["Marcas", (r.marcas || "").trim() ? `${r.marcas!.trim().split(/\n+/).length} na lista` : "não mandou", !!(r.marcas || "").trim()],
    ["Banners", r.banners === "aprovo" ? "aprovados" : r.banners === "trocar" ? `trocar: ${r.bannersObs || "?"}` : "não respondeu", r.banners === "aprovo"],
    ["HostGator", r.hostgator?.trim() || "não respondeu", !!r.hostgator?.trim()],
    ["E-mail no domínio", r.emailDominio === "sim" ? "USA: só A e CNAME" : r.emailDominio === "nao" ? "não usa" : "não respondeu", !!r.emailDominio],
    ["WhatsApp", r.whatsapp?.trim() || "não respondeu", !!r.whatsapp?.trim()],
    ["E-mail do painel", r.email?.trim() || "não respondeu", !!r.email?.trim()],
  ];

  return (
    <div>
      <p className={p.materialQuando}>Atualizado por ele em {quando}.</p>
      <dl className={p.fatos}>
        {fatos.map(([k, v, ok]) => (
          <div key={k} className={ok ? p.fatoOk : ""}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {r.recado?.trim() ? <blockquote className={p.recado}>{r.recado.trim()}</blockquote> : null}
      {miniaturas.length ? (
        <div className={p.miniaturas}>
          {miniaturas.map((u) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={u} src={u} alt="" loading="lazy" />
          ))}
        </div>
      ) : null}
      <p className={p.comando}>
        Para baixar tudo: <code>node scripts/material-cliente.mjs {loja}</code>
      </p>
    </div>
  );
}
