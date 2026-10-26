"use client";

import { useState } from "react";
import { CampoIsca, useGuardaDeFormulario } from "@/components/form-guarda";
import { salvarLead } from "@/components/lead";
import { mascararWhatsapp, whatsappValido } from "@/components/telefone";
import { contextoDaSessao } from "@/components/ecommerce/tracking";
import { linkWhatsApp } from "@/lib/contato";
import s from "@/app/(pt)/site-imersivo/imersivo.module.css";

/* ============================================================
   O pedido de orçamento do site imersivo (15/10/2026)

   Mesmo caminho das outras páginas: grava em /api/lead primeiro, com
   `pagina: "site-imersivo"` (que a rota converte em tipo "site" no CRM), e o
   WhatsApp só abre no fallback, quando a gravação falha. Gravou: a tela vira
   confirmação, com o WhatsApp como atalho opcional.

   Sem campo de @: quem compra aqui é marca, e o que importa é o site ou o
   perfil de onde a conversa começa. Vai em `canal`, texto livre, que a rota
   não confere na Meta (só a /vitrine-digital confere).
   ============================================================ */

type Dados = { nome: string; whatsapp: string; empresa: string; canal: string; vende: string };
const VAZIO: Dados = { nome: "", whatsapp: "", empresa: "", canal: "", vende: "" };

function mensagem(d: Dados) {
  return [
    "Oi, Rafael! Quero um site imersivo para a minha marca.",
    d.empresa && `Marca: ${d.empresa}`,
    d.vende && `O que vendemos: ${d.vende}`,
    d.canal && `Site ou Instagram: ${d.canal}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function FormImersivo() {
  const [d, setD] = useState<Dados>(VAZIO);
  const [telInvalido, setTelInvalido] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [estado, setEstado] = useState<"form" | "ok" | "pendente">("form");
  const envioSuspeito = useGuardaDeFormulario();

  const set = (k: keyof Dados, v: string) => {
    if (k === "whatsapp" && telInvalido) setTelInvalido(false);
    setD((x) => ({ ...x, [k]: k === "whatsapp" ? mascararWhatsapp(v) : v }));
  };

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (enviando) return; // toque duplo não grava duas linhas
    if (envioSuspeito(e.currentTarget)) {
      setEstado("ok"); // o robô vê sucesso; nada é gravado
      return;
    }
    if (!whatsappValido(d.whatsapp)) {
      setTelInvalido(true);
      return;
    }
    setEnviando(true);
    const salvo = await salvarLead({
      pagina: "site-imersivo",
      lang: "pt",
      nome: d.nome,
      whatsapp: d.whatsapp,
      empresa: d.empresa,
      canal: d.canal,
      vende: d.vende,
      necessidade: "Site imersivo para marca",
      ...contextoDaSessao(),
    });
    setEnviando(false);
    if (salvo) {
      setEstado("ok");
    } else {
      // não gravou: a conversa não pode se perder, então o WhatsApp abre com tudo escrito
      setEstado("pendente");
      window.location.href = linkWhatsApp(mensagem(d));
    }
  }

  if (estado !== "form") {
    return (
      <div className={s.confirmacao} role="status">
        <p className={s.confTitulo}>{estado === "ok" ? "Recebi o pedido da sua marca." : "Falta um toque."}</p>
        <p>
          {estado === "ok"
            ? "Eu te chamo no WhatsApp para entender o produto e a história."
            : "Abri o WhatsApp com a sua mensagem pronta. Toque em enviar lá para ela chegar."}
        </p>
        <a className={s.botaoContorno} href={linkWhatsApp(mensagem(d))} target="_blank" rel="noreferrer">
          {estado === "ok" ? "Quer adiantar? Me chama agora" : "Abrir o WhatsApp"}
        </a>
      </div>
    );
  }

  return (
    <form className={s.form} onSubmit={enviar} noValidate>
      <CampoIsca />
      <label className={s.campo}>
        <span>Seu nome</span>
        <input required autoComplete="name" value={d.nome} onChange={(e) => set("nome", e.target.value)} />
      </label>
      <label className={s.campo}>
        <span>WhatsApp</span>
        <input
          required
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(44) 99999-0000"
          value={d.whatsapp}
          aria-invalid={telInvalido || undefined}
          aria-describedby={telInvalido ? "erro-tel" : undefined}
          onChange={(e) => set("whatsapp", e.target.value)}
        />
        {telInvalido && (
          <small id="erro-tel" className={s.erro}>
            Confere o número: é por ele que eu te chamo. Ex.: (44) 99999-0000.
          </small>
        )}
      </label>
      <label className={s.campo}>
        <span>Nome da marca</span>
        <input required value={d.empresa} onChange={(e) => set("empresa", e.target.value)} />
      </label>
      <label className={s.campo}>
        <span>Site ou Instagram da marca</span>
        <input placeholder="@suamarca ou suamarca.com.br" value={d.canal} onChange={(e) => set("canal", e.target.value)} />
      </label>
      <label className={`${s.campo} ${s.campoLargo}`}>
        <span>O que a marca vende</span>
        <input
          placeholder="Ex.: café especial, suplemento, tênis"
          value={d.vende}
          onChange={(e) => set("vende", e.target.value)}
        />
      </label>
      <button className={`${s.botao} ${s.campoLargo}`} type="submit" disabled={enviando}>
        {enviando ? "Enviando…" : "Pedir o meu site imersivo"}
      </button>
    </form>
  );
}
