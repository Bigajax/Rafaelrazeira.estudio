"use client";

/* A central do Suporte no CRM (23/10/2026): a fila à esquerda, a conversa à
   direita; embaixo, o que se repete e a FAQ. Ao responder, o painel da loja
   acende o ponto no Suporte, e o botão do WhatsApp avisa o dono com o link:
   não há API de WhatsApp, quem aperta enviar é o Rafael. */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Suporte, SupChamado, SupFaq } from "@/lib/suporte/dados";
import { linkWhatsapp } from "@/lib/crm/regras";
import { responderChamado, mudarChamado, salvarFaq, apagarFaq } from "@/app/(pt)/crm/acoes-suporte";
import s from "@/app/(pt)/crm/crm.module.css";
import u from "@/app/(pt)/crm/suporte.module.css";

const TIPO: Record<SupChamado["tipo"], string> = { duvida: "Dúvida", problema: "Algo deu errado", pedido: "Quer uma mudança" };
const ESTADO: Record<SupChamado["estado"], string> = { aberto: "Esperando o estúdio", respondido: "Respondido", resolvido: "Resolvido" };

/* "/painel/estoque" vira "Estoque": o nome que o dono vê no menu */
const TELAS: Record<string, string> = {
  "/painel": "Início", "/painel/pecas": "Peças", "/painel/banners": "Banners", "/painel/site": "Textos do site",
  "/painel/estoque": "Estoque", "/painel/pedidos": "Pedidos", "/painel/desempenho": "Desempenho",
  "/painel/clientes": "Clientes", "/painel/config": "Contato", "/painel/manual": "Manual", "/painel/suporte": "Suporte",
};
const nomeDaTela = (t: string | null) => (t ? (TELAS[t] ?? (t.startsWith("/painel/site") ? "Textos do site" : t.replace("/painel/", ""))) : null);

function haQuanto(iso: string): string {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `há ${h} h`;
  return `há ${Math.round(h / 24)} dias`;
}

function enderecoDoPainel(dominio: string | null): string | null {
  const d = String(dominio || "").trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return d ? `https://${d}/painel/suporte` : null;
}

export function CentralSuporte({ dados, aberto, temas }: { dados: Suporte; aberto: string | null; temas: string[] }) {
  const [filtro, setFiltro] = useState<"abertos" | "todos">("abertos");
  /* esperando primeiro, a mais antiga no topo: quem espera há mais tempo é a próxima */
  const fila = [...dados.chamados]
    .filter((c) => filtro === "todos" || c.estado !== "resolvido")
    .sort((a, b) => (a.estado === "aberto" ? 0 : 1) - (b.estado === "aberto" ? 0 : 1) || (a.estado === "aberto" ? a.movido_em.localeCompare(b.movido_em) : b.movido_em.localeCompare(a.movido_em)));
  const atual = dados.chamados.find((c) => c.id === aberto) ?? fila[0] ?? null;

  return (
    <>
      <section className={u.mesa}>
        <div className={u.fila}>
          <div className={u.filtro} role="group" aria-label="Quais conversas">
            <button type="button" aria-pressed={filtro === "abertos"} onClick={() => setFiltro("abertos")}>Em andamento</button>
            <button type="button" aria-pressed={filtro === "todos"} onClick={() => setFiltro("todos")}>Todas</button>
          </div>
          {fila.length === 0 ? (
            <p className={u.vazio}>{filtro === "abertos" ? "Nenhuma conversa em andamento." : "Nenhuma loja escreveu ainda."}</p>
          ) : (
            <ol className={u.lista}>
              {fila.map((c) => (
                <li key={c.id}>
                  <Link href={`/crm/suporte?c=${c.id}`} scroll={false} className={u.item} aria-current={atual?.id === c.id ? "true" : undefined}>
                    <span className={u.itemTopo}>
                      <b>{c.loja?.nome ?? "Loja"}</b>
                      <small>{haQuanto(c.movido_em)}</small>
                    </span>
                    <span className={u.itemTexto}>{c.mensagens[0]?.texto ?? ""}</span>
                    <span className={u.itemPe}>
                      <i className={u[`est_${c.estado}`]} /> {ESTADO[c.estado]} · {TIPO[c.tipo]}
                      {c.tela ? ` · ${nomeDaTela(c.tela)}` : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
        {atual ? <Conversa key={atual.id} c={atual} temas={temas} /> : <div className={u.conversa}><p className={u.vazio}>Escolha uma conversa.</p></div>}
      </section>

      <section className={u.leitura}>
        <h2>O que a galera pergunta</h2>
        <p className={u.nota}>Os últimos 90 dias. É daqui que sai a próxima pergunta da FAQ e a próxima melhoria do painel.</p>
        <div className={u.colunas}>
          <Ranking titulo="Os temas" vazio="Dê um tema às conversas para ver o que se repete." itens={dados.temas} />
          <Ranking titulo="As telas de onde escreveram" vazio="Nenhuma conversa com a tela de origem." itens={dados.telas.map((t) => ({ ...t, nome: nomeDaTela(t.nome) ?? t.nome }))} />
          <Ranking titulo="Procuraram e não acharam" vazio="Toda busca achou alguma resposta." itens={dados.semResposta} />
        </div>
      </section>

      <Faq faq={dados.faq} temas={temas} />
    </>
  );
}

function Ranking({ titulo, itens, vazio }: { titulo: string; itens: { nome: string; vezes: number }[]; vazio: string }) {
  const maior = Math.max(1, ...itens.map((i) => i.vezes));
  return (
    <div className={u.ranking}>
      <h3>{titulo}</h3>
      {itens.length === 0 ? (
        <p className={u.vazio}>{vazio}</p>
      ) : (
        <ol>
          {itens.map((i) => (
            <li key={i.nome}>
              <span>{i.nome}</span>
              <b>{i.vezes}</b>
              <i style={{ width: `${(i.vezes / maior) * 100}%` }} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Conversa({ c, temas }: { c: SupChamado; temas: string[] }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [virarFaq, setVirarFaq] = useState(false);
  const [ocupado, iniciar] = useTransition();

  const painel = enderecoDoPainel(c.loja?.dominio ?? null);
  const zap = linkWhatsapp(
    c.whatsapp,
    `Oi! Respondi a sua mensagem no painel da ${c.loja?.nome ?? "loja"}.${painel ? ` É só abrir: ${painel}` : " Abra o painel, na aba Suporte."}`,
  );

  function rodar(acao: () => Promise<{ ok: boolean; erro?: string }>, depois?: () => void) {
    setErro(null);
    iniciar(async () => {
      const r = await acao();
      if (!r.ok) setErro(r.erro ?? "Não foi possível salvar.");
      else {
        depois?.();
        router.refresh();
      }
    });
  }

  const ultimaDaLoja = [...c.mensagens].reverse().find((m) => m.autor === "loja");
  const ultimaDoEstudio = [...c.mensagens].reverse().find((m) => m.autor === "estudio");

  return (
    <article className={u.conversa}>
      <header className={u.conversaTopo}>
        <div>
          <h2>{c.loja?.nome ?? "Loja"}</h2>
          <p>
            {TIPO[c.tipo]}
            {c.tela ? `, escrito da tela ${nomeDaTela(c.tela)}` : ""} · aberto {haQuanto(c.criado_em)}
            {c.loja?.lead_id ? (
              <>
                {" · "}
                <Link href={`/crm/lead/${c.loja.lead_id}`}>ficha da loja</Link>
              </>
            ) : null}
          </p>
        </div>
        <span className={u.estado}>
          <i className={u[`est_${c.estado}`]} /> {ESTADO[c.estado]}
        </span>
      </header>

      <ol className={u.mensagens}>
        {c.mensagens.map((m) => (
          <li key={m.id} className={m.autor === "estudio" ? u.doEstudio : u.daLoja}>
            <p>{m.texto}</p>
            <small>{m.autor === "estudio" ? "Estúdio" : c.loja?.nome} · {haQuanto(m.criado_em)}</small>
          </li>
        ))}
      </ol>
      {c.respondido_em && c.lido_pela_loja_em && c.lido_pela_loja_em >= c.respondido_em ? (
        <p className={u.lido}>A loja já abriu a resposta.</p>
      ) : null}

      <div className={u.responder}>
        <label className={s.campo}>
          <span className={s.campoRot}>Responder</span>
          <textarea rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={2000} placeholder="Escreva como se fosse no WhatsApp: curto e com o passo a passo." />
        </label>
        <div className={u.botoes}>
          <button type="button" className={s.btnEscuro} disabled={ocupado || !texto.trim()} onClick={() => rodar(() => responderChamado(c.id, texto, false), () => { setTexto(""); setAviso("Resposta no painel da loja. Avise pelo WhatsApp."); })}>
            Responder
          </button>
          <button type="button" className={s.btn} disabled={ocupado || !texto.trim()} onClick={() => rodar(() => responderChamado(c.id, texto, true), () => { setTexto(""); setAviso("Respondido e resolvido. Avise pelo WhatsApp."); })}>
            Responder e resolver
          </button>
          {c.estado === "resolvido" ? (
            <button type="button" className={s.btnMini} disabled={ocupado} onClick={() => rodar(() => mudarChamado(c.id, { estado: "aberto" }))}>Reabrir</button>
          ) : (
            <button type="button" className={s.btnMini} disabled={ocupado} onClick={() => rodar(() => mudarChamado(c.id, { estado: "resolvido" }))}>Resolver sem responder</button>
          )}
        </div>
        {zap ? (
          <a className={u.zap} href={zap} target="_blank" rel="noreferrer">Avisar o dono no WhatsApp</a>
        ) : (
          <p className={u.nota}>A loja não tem card com WhatsApp ligado no Performance: avise por fora.</p>
        )}
        {aviso ? <p className={u.ok}>{aviso}</p> : null}
        {erro ? <p className={u.erro}>{erro}</p> : null}
      </div>

      <div className={u.rodape}>
        <label className={u.tema}>
          <span className={s.campoRot}>Tema</span>
          <input
            list="sup-temas"
            defaultValue={c.tema ?? ""}
            placeholder="Estoque, Fotos..."
            onBlur={(e) => {
              if ((e.target.value.trim() || null) !== c.tema) rodar(() => mudarChamado(c.id, { tema: e.target.value }));
            }}
          />
          <datalist id="sup-temas">{temas.map((t) => <option key={t} value={t} />)}</datalist>
        </label>
        {c.faq_id ? (
          <span className={u.nota}>Já virou pergunta da FAQ.</span>
        ) : (
          <button type="button" className={s.btnMini} onClick={() => setVirarFaq((v) => !v)}>
            {virarFaq ? "Fechar" : "Virar pergunta da FAQ"}
          </button>
        )}
      </div>
      {virarFaq ? (
        <EditorFaq
          inicial={{ pergunta: ultimaDaLoja?.texto.slice(0, 200) ?? "", resposta: ultimaDoEstudio?.texto ?? "", tema: c.tema }}
          chamado={c.id}
          temas={temas}
          aoSalvar={() => setVirarFaq(false)}
        />
      ) : null}
    </article>
  );
}

function Faq({ faq, temas }: { faq: SupFaq[]; temas: string[] }) {
  const [editando, setEditando] = useState<string | "nova" | null>(null);
  return (
    <section className={u.leitura}>
      <div className={u.faqTopo}>
        <div>
          <h2>A FAQ das lojas</h2>
          <p className={u.nota}>Aparece na aba Suporte de todo painel, na hora. Escreva a pergunta como o dono escreveria.</p>
        </div>
        <button type="button" className={s.btnAcao} onClick={() => setEditando(editando === "nova" ? null : "nova")}>Nova pergunta</button>
      </div>
      {editando === "nova" ? <EditorFaq inicial={{ pergunta: "", resposta: "", tema: null }} temas={temas} aoSalvar={() => setEditando(null)} /> : null}
      <ol className={u.faq}>
        {faq.map((f) => (
          <li key={f.id} className={f.publicada ? "" : u.faqOculta}>
            <div className={u.faqLinha}>
              <div>
                <b>{f.pergunta}</b>
                <small>
                  {f.tema ?? "sem tema"} · aberta {f.vezes_aberta} {f.vezes_aberta === 1 ? "vez" : "vezes"}
                  {f.publicada ? "" : " · escondida"}
                </small>
              </div>
              <button type="button" className={s.btnMini} onClick={() => setEditando(editando === f.id ? null : f.id)}>
                {editando === f.id ? "Fechar" : "Editar"}
              </button>
            </div>
            {editando === f.id ? <EditorFaq inicial={f} temas={temas} aoSalvar={() => setEditando(null)} /> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

function EditorFaq({
  inicial,
  chamado,
  temas,
  aoSalvar,
}: {
  inicial: Partial<SupFaq> & { pergunta: string; resposta: string; tema: string | null };
  chamado?: string;
  temas: string[];
  aoSalvar: () => void;
}) {
  const router = useRouter();
  const [f, setF] = useState({
    pergunta: inicial.pergunta,
    resposta: inicial.resposta,
    tema: inicial.tema ?? "",
    ancora_manual: inicial.ancora_manual ?? "",
    ordem: inicial.ordem ?? 100,
    publicada: inicial.publicada ?? true,
  });
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();

  function rodar(acao: () => Promise<{ ok: boolean; erro?: string }>) {
    setErro(null);
    iniciar(async () => {
      const r = await acao();
      if (!r.ok) setErro(r.erro ?? "Não foi possível salvar.");
      else {
        aoSalvar();
        router.refresh();
      }
    });
  }

  return (
    <div className={u.editor}>
      <label className={s.campo}>
        <span className={s.campoRot}>Pergunta</span>
        <input value={f.pergunta} maxLength={200} onChange={(e) => setF({ ...f, pergunta: e.target.value })} />
      </label>
      <label className={s.campo}>
        <span className={s.campoRot}>Resposta</span>
        <textarea rows={4} value={f.resposta} maxLength={4000} onChange={(e) => setF({ ...f, resposta: e.target.value })} />
      </label>
      <div className={u.editorLinha}>
        <label className={s.campo}>
          <span className={s.campoRot}>Tema</span>
          <input list="sup-temas-faq" value={f.tema} onChange={(e) => setF({ ...f, tema: e.target.value })} />
          <datalist id="sup-temas-faq">{temas.map((t) => <option key={t} value={t} />)}</datalist>
        </label>
        <label className={s.campo}>
          <span className={s.campoRot}>Seção do manual</span>
          <input value={f.ancora_manual} placeholder="#estoque" onChange={(e) => setF({ ...f, ancora_manual: e.target.value })} />
        </label>
        <label className={s.campo}>
          <span className={s.campoRot}>Ordem</span>
          <input type="number" value={f.ordem} onChange={(e) => setF({ ...f, ordem: Number(e.target.value) || 100 })} />
        </label>
        <label className={u.marcar}>
          <input type="checkbox" checked={f.publicada} onChange={(e) => setF({ ...f, publicada: e.target.checked })} /> Aparece no painel
        </label>
      </div>
      <div className={u.botoes}>
        <button type="button" className={s.btnEscuro} disabled={ocupado} onClick={() => rodar(() => salvarFaq({ ...f, id: inicial.id, chamado: chamado ?? null }))}>
          Salvar pergunta
        </button>
        {inicial.id ? (
          <button type="button" className={s.btnMini} disabled={ocupado} onClick={() => rodar(() => apagarFaq(inicial.id!))}>Apagar</button>
        ) : null}
      </div>
      {erro ? <p className={u.erro}>{erro}</p> : null}
    </div>
  );
}
