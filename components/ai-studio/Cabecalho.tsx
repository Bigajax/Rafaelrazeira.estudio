"use client";

/* O topo das três áreas: o título, as abas e o "Consumo de IA". O consumo
   abre a lista do mês e as duas travas do app (limite mensal e confirmar
   antes de gerar). */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { salvarConfig } from "@/app/(pt)/crm/acoes-ai-studio";
import { modeloPorId, modeloVideo } from "@/lib/ai-studio/modelos";
import { usd } from "@/lib/ai-studio/precos";
import type { Contexto } from "@/lib/ai-studio/tipos";
import s from "@/app/(pt)/crm/crm.module.css";
import a from "@/app/(pt)/crm/ai-studio.module.css";

const ABAS = [
  { href: "/crm/ai-studio", n: "01", nome: "Vídeo" },
  { href: "/crm/ai-studio/imagem", n: "02", nome: "Imagem" },
  { href: "/crm/ai-studio/editar", n: "03", nome: "Editar" },
  { href: "/crm/ai-studio/projetos", n: "04", nome: "Projetos" },
];

export function Cabecalho({ ctx }: { ctx: Contexto }) {
  const caminho = usePathname() ?? "";
  const [aberto, setAberto] = useState(false);
  /* a raiz é o Vídeo: acende quando nenhuma das outras abas casa */
  const ativa = ABAS.slice(1).find((x) => caminho.startsWith(x.href))?.href ?? "/crm/ai-studio";
  const { consumo, config } = ctx;

  return (
    <>
      <header className={a.cab}>
        <div>
          <h1>
            <i className={a.estrela} aria-hidden="true">
              ✦
            </i>
            AI Studio<i className={s.ponto}>.</i>
          </h1>
          <p className={a.sub}>Vídeo e imagem com inteligência artificial · pelo OpenRouter</p>
        </div>
        <button type="button" className={a.consumoBtn} onClick={() => setAberto(true)} disabled={ctx.semTabela}>
          <small>Consumo de IA · mês</small>
          <b>{usd(consumo.totalMes, 2)}</b>
          <span>
            {consumo.geracoes} {consumo.geracoes === 1 ? "item" : "itens"}
            {config.limite_mensal_usd !== null ? ` · limite ${usd(config.limite_mensal_usd, 2)}` : " · sem limite"}
          </span>
        </button>
      </header>

      <nav className={a.abas} aria-label="AI Studio">
        {ABAS.map((x) => (
          <Link key={x.href} href={x.href} className={ativa === x.href ? a.abaAtiva : ""} aria-current={ativa === x.href ? "page" : undefined}>
            <i>{x.n}</i>
            {x.nome}
          </Link>
        ))}
      </nav>

      {ctx.semTabela && (
        <div className={a.recado}>
          <b>Falta criar o banco do AI Studio</b>
          <p>
            Cole o arquivo <code>supabase/ai-studio.sql</code> inteiro em Supabase → SQL Editor → Run. Ele cria as tabelas, o
            bucket privado e as permissões. Até lá nada pode ser gravado.
          </p>
        </div>
      )}
      {!ctx.temChave && (
        <div className={a.recado}>
          <b>Configure a chave do OpenRouter para começar a gerar.</b>
          <ol>
            <li>
              A chave sai de <code>openrouter.ai/settings/keys</code>. É a mesma <code>OPENROUTER_API_KEY</code> que a pesquisa do CRM
              já usa.
            </li>
            <li>
              Em casa: ela vai no <code>.env.local</code>, e o servidor precisa ser reiniciado.
            </li>
            <li>
              No ar: Vercel → Settings → Environment Variables → <code>OPENROUTER_API_KEY</code>, e um novo deploy.
            </li>
          </ol>
          <p>A chave fica só no servidor: o navegador nunca a vê.</p>
        </div>
      )}

      {aberto && <Consumo ctx={ctx} onFechar={() => setAberto(false)} />}
    </>
  );
}

function Consumo({ ctx, onFechar }: { ctx: Contexto; onFechar: () => void }) {
  const router = useRouter();
  const { consumo, config } = ctx;
  const [limite, setLimite] = useState(config.limite_mensal_usd === null ? "" : String(config.limite_mensal_usd));
  const [confirmar, setConfirmar] = useState(config.confirmar_antes);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [onFechar]);

  function salvar() {
    const bruto = limite.trim().replace(",", ".");
    const valor = bruto === "" ? null : Number(bruto);
    if (valor !== null && (!Number.isFinite(valor) || valor < 0)) {
      setAviso({ ok: false, texto: "Escreva um valor em dólar, como 20 ou 12.50." });
      return;
    }
    iniciar(async () => {
      const r = await salvarConfig(valor, confirmar);
      setAviso(r.ok ? { ok: true, texto: "Salvo." } : { ok: false, texto: r.erro });
      if (r.ok) router.refresh();
    });
  }

  const linhas = consumo.linhas;

  return (
    <div className={s.fundo} role="dialog" aria-modal="true" aria-labelledby="consumo-titulo" onClick={onFechar}>
      <div className={a.consumo} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={a.fecharVisor} onClick={onFechar} aria-label="Fechar">
          ×
        </button>
        <p className={s.modalRot}>Consumo de IA</p>
        <h2 id="consumo-titulo">O mês até aqui</h2>
        <p className={a.nota}>
          O custo de cada item é o que o OpenRouter devolve na própria resposta (<code>usage.cost</code>), em dólar. Vídeo em
          andamento ainda não entra. O extrato completo está em openrouter.ai/activity.
        </p>
        <div className={a.totais}>
          <div>
            <small>Total do mês</small>
            <b>{usd(consumo.totalMes, 3)}</b>
          </div>
          <div>
            <small>Itens</small>
            <b>{consumo.geracoes}</b>
          </div>
          <div>
            <small>Sem custo informado</small>
            <b>{consumo.semDado}</b>
          </div>
        </div>
        {linhas.length ? (
          <div className={a.rolarTabela}>
            <table className={a.tabela}>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Modelo</th>
                  <th>Detalhe</th>
                  <th>Custo</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => (
                  <tr key={l.id}>
                    <td>
                      {new Date(l.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td>{l.tipo === "video" ? "vídeo" : "imagem"}</td>
                    <td>{modeloVideo(l.modelo ?? "")?.curto ?? modeloPorId(l.modelo ?? "")?.curto ?? l.modelo}</td>
                    <td>{l.detalhe}</td>
                    <td>{usd(l.custo_usd, 4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={a.nota}>Nada gerado neste mês.</p>
        )}

        <div className={a.config}>
          <span className={a.rot}>Limite mensal de uso</span>
          <label>
            US$
            <input
              type="number"
              min={0}
              step="0.5"
              inputMode="decimal"
              placeholder="sem limite"
              value={limite}
              onChange={(e) => setLimite(e.target.value)}
            />
          </label>
          <p className={a.nota}>
            Atingido o limite, o estúdio recusa novos pedidos até o mês virar. É um controle deste app: ele não substitui o limite
            de crédito da sua chave no OpenRouter (openrouter.ai/settings/keys). Em branco, sem limite.
          </p>
          <label>
            <input type="checkbox" checked={confirmar} onChange={(e) => setConfirmar(e.target.checked)} />
            Confirmar antes de gerar (mostra a ficha e a estimativa, quando existe)
          </label>
          <div className={a.linhaBotoes}>
            <button type="button" className={s.btn} onClick={salvar} disabled={pendente}>
              {pendente ? "Salvando…" : "Salvar"}
            </button>
            {aviso && <span className={aviso.ok ? a.avisoOkPapel : a.avisoErroPapel}>{aviso.texto}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
