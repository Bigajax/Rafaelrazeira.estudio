"use client";

/* ============================================================
   A LISTA DAS LOJAS DO PERFORMANCE

   Uma linha por loja: nome e lead, os números dos últimos 7 dias, a
   situação da trava e os botões. A chave aparece UMA vez, logo depois
   de gerada, num bloco para copiar: o banco só guarda o hash, então
   fechar a página sem copiar significa gerar outra.
   ============================================================ */

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  apagarLojaPerformance,
  criarLojaPerformance,
  liberarPerformance,
  ligarLojaPerformance,
  novaChavePerformance,
} from "@/app/(pt)/crm/acoes-performance";
import type { LojaPerformance } from "@/lib/performance/dados";
import s from "@/app/(pt)/crm/crm.module.css";
import p from "@/app/(pt)/crm/performance.module.css";

type LeadCurto = { id: string; nome: string };

const DATA = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "2-digit" });

function haQuanto(iso: string | null): string {
  if (!iso) return "nenhum evento ainda";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `há ${h} h`;
  return `há ${Math.round(h / 24)} dias`;
}

const SITUACAO: Record<LojaPerformance["situacao"], { rotulo: string; classe: string }> = {
  para_sempre: { rotulo: "Liberada para sempre", classe: p.sitSempre },
  liberada: { rotulo: "Liberada", classe: p.sitLiberada },
  travada: { rotulo: "Só o básico", classe: p.sitTravada },
  sem_chave: { rotulo: "Sem chave", classe: p.sitSemChave },
};

export function ListaLojas({ lojas, leads, semTabela }: { lojas: LojaPerformance[]; leads: LeadCurto[]; semTabela: boolean }) {
  return (
    <>
      {lojas.length === 0 && !semTabela ? (
        <p className={p.vazio}>
          Crie a loja aqui, copie a chave para a Vercel dela (<code>PERF_CHAVE</code>, junto de <code>PERF_URL</code> e{" "}
          <code>PERF_ANON</code>) e a vitrine começa a contar no próximo deploy. Vale já na prévia.
        </p>
      ) : null}

      <ol className={p.lista}>
        {lojas.map((l) => (
          <Loja key={l.id} loja={l} />
        ))}
      </ol>

      {!semTabela ? <NovaLoja leads={leads} /> : null}
    </>
  );
}

function Loja({ loja }: { loja: LojaPerformance }) {
  const [chave, setChave] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, comecar] = useTransition();
  const sit = SITUACAO[loja.situacao];

  const rodar = (acao: () => Promise<{ ok: boolean; erro?: string }>) => {
    setErro(null);
    comecar(async () => {
      const r = await acao();
      if (!r.ok) setErro(r.erro ?? "Não deu certo.");
    });
  };

  return (
    <li className={`${p.linha} ${loja.ativa ? "" : p.linhaInativa}`}>
      <div className={p.linhaTopo}>
        <div className={p.linhaNome}>
          <h2>{loja.nome}</h2>
          <span>
            {loja.slug}
            {loja.chave_prefixo ? ` · chave ${loja.chave_prefixo}…` : ""}
            {loja.lead_id ? (
              <>
                {" · "}
                <Link href={`/crm/lead/${loja.lead_id}`}>{loja.lead_nome ?? "ver o lead"}</Link>
              </>
            ) : null}
            {loja.dominio ? ` · ${loja.dominio}` : ""}
            {!loja.ativa ? " · DESLIGADA" : ""}
          </span>
        </div>

        <div className={p.numeros}>
          <div className={p.numero}>
            <b className={loja.resumo?.ultimo_evento_em ? "" : p.semEvento}>{haQuanto(loja.resumo?.ultimo_evento_em ?? null)}</b>
            <span>último evento</span>
          </div>
          <div className={p.numero}>
            <b>{loja.resumo?.pessoas_7d ?? 0}</b>
            <span>pessoas 7 d</span>
          </div>
          <div className={p.numero}>
            <b>{loja.resumo?.chamaram_7d ?? 0}</b>
            <span>chamaram 7 d</span>
          </div>
          {/* o gancho da venda: o número que só os dados da loja dizem, para a mensagem de WhatsApp */}
          <div className={p.numero} title="Pessoas que procuraram algo que a loja não tem, nos últimos 30 dias">
            <b>{loja.resumo?.buscas_30d ?? 0}</b>
            <span>não acharam 30 d</span>
          </div>
          <div className={p.numero} title="Pessoas que tocaram num número que acabou, nos últimos 30 dias">
            <b>{loja.resumo?.esgotados_30d ?? 0}</b>
            <span>número acabou 30 d</span>
          </div>
        </div>

        <span className={`${p.situacao} ${sit.classe}`}>
          <i aria-hidden />
          {sit.rotulo}
          {loja.situacao === "liberada" && loja.liberado_ate ? ` até ${DATA.format(new Date(loja.liberado_ate))}` : ""}
        </span>
      </div>

      <div className={p.acoes}>
        <button type="button" className={s.btnMini} disabled={ocupado} onClick={() => rodar(() => liberarPerformance(loja.id, { dias: 7 }))}>
          +7 dias de teste
        </button>
        <button type="button" className={s.btnMini} disabled={ocupado} onClick={() => rodar(() => liberarPerformance(loja.id, { dias: 30 }))}>
          +1 mês
        </button>
        {!loja.para_sempre ? (
          <button
            type="button"
            className={s.btnMini}
            disabled={ocupado}
            onClick={() => {
              if (!confirm(`Liberar ${loja.nome} para sempre? É o caso de quem comprou a aba de uma vez.`)) return;
              rodar(() => liberarPerformance(loja.id, { paraSempre: true }));
            }}
          >
            Para sempre
          </button>
        ) : null}
        {loja.situacao === "liberada" || loja.situacao === "para_sempre" ? (
          <button type="button" className={s.btnMini} disabled={ocupado} onClick={() => rodar(() => liberarPerformance(loja.id, { travar: true }))}>
            Travar
          </button>
        ) : null}
        <button
          type="button"
          className={s.btnMini}
          disabled={ocupado}
          onClick={() => {
            if (loja.chave_prefixo && !confirm(`Gerar uma chave nova para ${loja.nome}? A atual (${loja.chave_prefixo}…) para de valer na hora, e a Vercel precisa da nova.`)) return;
            setErro(null);
            comecar(async () => {
              const r = await novaChavePerformance(loja.id);
              if (r.ok) setChave(r.chave);
              else setErro(r.erro);
            });
          }}
        >
          {loja.chave_prefixo ? "Gerar chave nova" : "Gerar a chave"}
        </button>
        <button type="button" className={s.btnMini} disabled={ocupado} onClick={() => rodar(() => ligarLojaPerformance(loja.id, !loja.ativa))}>
          {loja.ativa ? "Desligar" : "Religar"}
        </button>
        {!loja.resumo?.eventos_total ? (
          <button
            type="button"
            className={s.btnMini}
            disabled={ocupado}
            onClick={() => {
              if (!confirm(`Apagar a loja ${loja.nome}? Ela ainda não tem contagem nenhuma.`)) return;
              rodar(() => apagarLojaPerformance(loja.id));
            }}
          >
            Apagar
          </button>
        ) : null}
      </div>

      {chave ? (
        <div className={p.chaveNova} role="status">
          <p>
            <b>Copie agora.</b> Esta chave não aparece de novo: o banco guarda só a assinatura dela. Na Vercel da loja, crie{" "}
            <code>PERF_CHAVE</code> com este valor (e <code>PERF_URL</code> e <code>PERF_ANON</code>, os do Supabase do estúdio), e
            redeploye.
          </p>
          <code className={p.chaveTexto}>{chave}</code>
          <div className={p.acoes}>
            <button type="button" className={s.btnMini} onClick={() => navigator.clipboard?.writeText(chave)}>
              Copiar
            </button>
            <button type="button" className={s.btnMini} onClick={() => setChave(null)}>
              Já copiei
            </button>
          </div>
        </div>
      ) : null}

      {erro ? (
        <p role="alert" className={p.erro}>
          {erro}
        </p>
      ) : null}
    </li>
  );
}

function slugar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function NovaLoja({ leads }: { leads: LeadCurto[] }) {
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [slugMexido, setSlugMexido] = useState(false);
  const [leadId, setLeadId] = useState("");
  const [dominio, setDominio] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, comecar] = useTransition();

  const enviar = (ev: React.FormEvent) => {
    ev.preventDefault();
    setErro(null);
    comecar(async () => {
      const r = await criarLojaPerformance({ nome, slug, lead_id: leadId || null, dominio: dominio || null });
      if (r.ok) {
        setNome("");
        setSlug("");
        setSlugMexido(false);
        setLeadId("");
        setDominio("");
      } else setErro(r.erro);
    });
  };

  return (
    <form className={p.nova} onSubmit={enviar}>
      <h2>Criar loja</h2>
      <div className={p.novaCampos}>
        <label className={s.campo}>
          <span className={s.campoRot}>Nome da loja</span>
          <input
            type="text"
            value={nome}
            onChange={(e) => {
              setNome(e.target.value);
              if (!slugMexido) setSlug(slugar(e.target.value));
            }}
            placeholder="Japa Modas"
            required
          />
        </label>
        <label className={s.campo}>
          <span className={s.campoRot}>Nome curto (a pasta)</span>
          <input
            type="text"
            value={slug}
            onChange={(e) => {
              setSlugMexido(true);
              setSlug(e.target.value);
            }}
            placeholder="japa-modas"
            pattern="[a-z0-9-]{1,40}"
            required
          />
        </label>
        <label className={s.campo}>
          <span className={s.campoRot}>Lead</span>
          <select value={leadId} onChange={(e) => setLeadId(e.target.value)}>
            <option value="">Sem lead (prévia solta)</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </select>
        </label>
        <label className={s.campo}>
          <span className={s.campoRot}>Domínio (opcional)</span>
          <input type="text" value={dominio} onChange={(e) => setDominio(e.target.value)} placeholder="japamodasurf.com.br" />
        </label>
      </div>
      <p className={p.novaNota}>
        Depois de criar, gere a chave na linha da loja e cole na Vercel dela. A chave vale na prévia e continua a mesma quando a loja
        contratar: o histórico não começa do zero.
      </p>
      {erro ? (
        <p role="alert" className={p.erro}>
          {erro}
        </p>
      ) : null}
      <div>
        <button type="submit" className={s.btnAcao} disabled={ocupado || !nome || !slug}>
          {ocupado ? "Criando…" : "Criar loja"}
        </button>
      </div>
    </form>
  );
}
