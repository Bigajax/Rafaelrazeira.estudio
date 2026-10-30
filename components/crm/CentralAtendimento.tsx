"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { definirPasso } from "@/app/(pt)/crm/acoes";
import { lerHistoricoAtendimento } from "@/app/(pt)/crm/acoes-atendimento";
import { ABAS_ATENDIMENTO, filasAtendimento, novoContato, precisaResponder, tempoDeEspera, type AbaAtendimento, type HistoricoAtendimento } from "@/lib/crm/atendimento";
import { arrobaDe, dataCurta, dinheiro, linkWhatsapp, momentoDoContato, somarDias } from "@/lib/crm/regras";
import { ehAtivo, NOME_CANAL, NOME_ESTAGIO, NOME_ORIGEM, NOME_TIPO, ORIGENS, type Direcao, type LeadPainel, type Origem } from "@/lib/crm/tipos";
import { Hoje } from "./Hoje";
import { ModalNovoLead } from "./ModalNovoLead";
import { ModalToque } from "./ModalToque";
import c from "./atendimento.module.css";

type Props = React.ComponentProps<typeof Hoje>;
const normalizar = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
const hora = (s: string) => {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "Horário indisponível" : d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};

export function CentralAtendimento({ painel, templates, posts = [] }: Props) {
  const router = useRouter();
  const [aba, setAba] = useState<AbaAtendimento>("novos");
  const [busca, setBusca] = useState("");
  const [origem, setOrigem] = useState<Origem | "">("");
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [novo, setNovo] = useState(false);
  const [registro, setRegistro] = useState<{ lead: LeadPainel; direcao: Direcao } | null>(null);
  const [agora, setAgora] = useState<number | null>(null);
  const detalheRef = useRef<HTMLElement>(null);
  const filaRef = useRef<HTMLElement>(null);
  const contatos = painel.contatos;
  const filas = useMemo(() => filasAtendimento(contatos, painel.hoje), [contatos, painel.hoje]);
  const descricao = ABAS_ATENDIMENTO.find((a) => a.id === aba)!;
  const lista = useMemo(() => filas[aba].filter((l) => {
    if (origem && l.origem !== origem) return false;
    const texto = normalizar([l.nome, l.empresa, l.nicho, l.cidade, l.email, l.instagram, l.whatsapp].filter(Boolean).join(" "));
    return !busca.trim() || texto.includes(normalizar(busca.trim())) || (busca.replace(/\D/g, "").length >= 5 && (l.whatsapp ?? "").replace(/\D/g, "").includes(busca.replace(/\D/g, "")));
  }), [filas, aba, origem, busca]);
  const atual = lista.find((l) => l.id === selecionado) ?? lista[0] ?? null;
  const prospeccao = useMemo(() => {
    const filtrar = (ls: LeadPainel[]) => ls.filter((l) => l.origem === "prospeccao");
    return { ...painel, atrasados: filtrar(painel.atrasados), paraHoje: filtrar(painel.paraHoje), semPasso: filtrar(painel.semPasso), riscados: filtrar(painel.riscados), amostras: filtrar(painel.amostras) };
  }, [painel]);

  useEffect(() => {
    const atualizar = () => { setAgora(Date.now()); if (document.visibilityState === "visible") router.refresh(); };
    setAgora(Date.now());
    const timer = window.setInterval(atualizar, 60000);
    document.addEventListener("visibilitychange", atualizar);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", atualizar); };
  }, [router]);

  function trocarAba(id: AbaAtendimento) { setAba(id); setBusca(""); setOrigem(""); setSelecionado(null); }
  function escolher(id: string) {
    setSelecionado(id);
    if (window.matchMedia("(max-width: 860px)").matches) {
      requestAnimationFrame(() => { detalheRef.current?.scrollIntoView({ block: "start", behavior: "instant" }); detalheRef.current?.focus({ preventScroll: true }); });
    }
  }
  return (
    <div className={c.central} data-atendimento>
      <header className={c.cabecalho}>
        <div><span className={c.sobretitulo}>Relacionamento e vendas</span><h1>Atendimento<span>.</span></h1><p>Quem chegou, quem espera sua resposta e qual é o próximo passo.</p></div>
        <div className={c.acoes}><Link className={c.botao} href="/crm/pipeline">Ver funil</Link><button className={`${c.botao} ${c.primario}`} type="button" onClick={() => setNovo(true)}>+ Novo contato</button></div>
      </header>
      <nav className={c.abas} aria-label="Filas de atendimento">
        {ABAS_ATENDIMENTO.map((a) => <button key={a.id} type="button" aria-pressed={aba === a.id} data-aba={a.id} onClick={() => trocarAba(a.id)}><span>{a.nome}</span><b>{filas[a.id].length}</b></button>)}
      </nav>
      <div className={c.contexto}>
        <div><h2>{descricao.nome}</h2><p>{descricao.descricao}</p></div>
        {aba === "novos" && <span className={c.prioridade}>Quem procurou o estúdio aparece primeiro, o mais recente no topo</span>}
      </div>
      {aba === "prospeccao" ? <div className={c.prospeccao}><Hoje painel={prospeccao} templates={templates} posts={posts} /></div> : <>
        <div className={c.filtros}>
          <label className={c.busca}><span className={c.srOnly}>Buscar contato nesta aba</span><input type="search" placeholder="Buscar nome, empresa, segmento ou telefone" value={busca} onChange={(e) => setBusca(e.target.value)} /></label>
          <label className={c.origem}><span>Origem</span><select value={origem} onChange={(e) => setOrigem(e.target.value as Origem | "")}><option value="">Todas as origens</option>{ORIGENS.map((o) => <option key={o} value={o}>{NOME_ORIGEM[o]}</option>)}</select></label>
          {(busca || origem) && <button type="button" className={c.botao} onClick={() => { setBusca(""); setOrigem(""); }}>Limpar filtros</button>}
        </div>
        <div className={c.mesa}>
          <section ref={filaRef} className={c.fila} aria-label={`Contatos: ${descricao.nome}`}>
            <div className={c.filaCabecalho}><b>{lista.length} {lista.length === 1 ? "contato" : "contatos"}</b><span>Selecione para atender</span></div>
            <ul>{lista.map((l) => <li key={l.id}><button type="button" className={c.contato} data-contato={l.id} aria-pressed={atual?.id === l.id} onClick={() => escolher(l.id)}>
              <span className={c.contatoTopo}><b>{l.nome}</b><span className={c.etapa}>{NOME_ESTAGIO[l.estagio]}</span></span>
              <span className={c.contatoEmpresa}>{[l.empresa !== l.nome ? l.empresa : null, l.nicho].filter(Boolean).join(" · ") || "Segmento ainda não informado"}</span>
              <span className={c.contatoOrigem}>{NOME_ORIGEM[l.origem]}</span>
              <span className={c.contatoRodape}><span className={novoContato(l) || precisaResponder(l) ? c.espera : ""}>{novoContato(l) || precisaResponder(l) ? agora ? tempoDeEspera(novoContato(l) ? l.created_at : momentoDoContato(l), agora) : `Desde ${hora(l.created_at)}` : l.proxima_acao_em ? `Retorno ${dataCurta(l.proxima_acao_em)}` : "Definir próximo passo"}</span><span aria-hidden="true">→</span></span>
            </button></li>)}</ul>
            {!lista.length && <div className={c.vazio}><b>{busca || origem ? "Nenhum contato neste filtro" : "Nenhum contato pendente nesta aba"}</b><p>{busca || origem ? "Ajuste a busca ou limpe os filtros." : "Confira as outras filas. Novas entradas aparecerão aqui automaticamente."}</p></div>}
          </section>
          <section ref={detalheRef} className={c.detalhe} tabIndex={-1} aria-label="Atendimento selecionado">
            <button type="button" className={`${c.linkBotao} ${c.voltarLista}`} onClick={() => { filaRef.current?.scrollIntoView({ block: "start", behavior: "instant" }); filaRef.current?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')?.focus({ preventScroll: true }); }}>← Voltar para a lista de contatos</button>
            {atual ? <Atendimento key={atual.id} lead={atual} hoje={painel.hoje} aoRegistrar={(direcao) => setRegistro({ lead: atual, direcao })} /> : <div className={c.semSelecao}><span aria-hidden="true">✓</span><h3>Fila conferida</h3><p>Escolha outra aba para continuar o atendimento.</p><button type="button" className={c.botao} onClick={() => trocarAba(aba === "novos" ? "responder" : "novos")}>{aba === "novos" ? "Ver quem espera resposta" : "Ver novos contatos"}</button></div>}
          </section>
        </div>
      </>}
      {novo && <ModalNovoLead origemInicial="inbound" pesquisarAoCriar={false} aoCriar={(id) => { trocarAba("novos"); setSelecionado(id); router.refresh(); }} aoFechar={() => setNovo(false)} />}
      {registro && <ModalToque lead={registro.lead} direcaoInicial={registro.direcao} exigirProximoPasso aoFechar={() => { setRegistro(null); router.refresh(); }} />}
    </div>
  );
}

function Atendimento({ lead, hoje, aoRegistrar }: { lead: LeadPainel; hoje: string; aoRegistrar: (direcao: Direcao) => void }) {
  const [historico, setHistorico] = useState<HistoricoAtendimento[] | null>(null);
  const [falha, setFalha] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const [passo, setPasso] = useState(lead.proximo_passo ?? "");
  const [data, setData] = useState(lead.proxima_acao_em && lead.proxima_acao_em >= hoje ? lead.proxima_acao_em : somarDias(hoje, 3));
  const [editando, setEditando] = useState(false);
  const [erroPasso, setErroPasso] = useState<string | null>(null);
  const [salvando, comecar] = useTransition();
  const router = useRouter();
  useEffect(() => {
    let ativo = true;
    setHistorico(null); setFalha(null);
    lerHistoricoAtendimento(lead.id).then((r) => { if (ativo) { if (r.ok) setHistorico(r.interacoes); else setFalha(r.erro); } }).catch(() => { if (ativo) setFalha("Não foi possível carregar o histórico."); });
    return () => { ativo = false; };
  }, [lead.id, lead.toques, tentativa]);
  const whatsapp = linkWhatsapp(lead.whatsapp);
  const instagram = arrobaDe(lead.instagram);
  const ultimaEntrada = historico?.find((i) => i.direcao === "entrada");
  const ehNovo = novoContato(lead);
  return <>
    <div className={c.detalheCabecalho}>
      <div className={c.identificacao}><span className={c.avatar} aria-hidden="true">{lead.nome.trim().split(/\s+/).slice(0, 2).map((s) => s[0]).join("")}</span><div><span className={c.etapa}>{ehNovo ? "Primeiro atendimento pendente" : precisaResponder(lead) ? "Sua vez de responder" : NOME_ESTAGIO[lead.estagio]}</span><h2>{lead.nome}</h2><p>{[lead.empresa !== lead.nome ? lead.empresa : null, lead.nicho, lead.cidade].filter(Boolean).join(" · ") || "Complete os dados conforme conversar"}</p></div></div>
      <Link className={c.link} href={`/crm/lead/${lead.id}`}>Abrir ficha completa ↗</Link>
    </div>
    <dl className={c.dados}><div><dt>Chegou por</dt><dd>{NOME_ORIGEM[lead.origem]}</dd></div><div><dt>Entrou no CRM</dt><dd>{hora(lead.created_at)}</dd></div><div><dt>Interesse</dt><dd>{lead.tipo_projeto ? NOME_TIPO[lead.tipo_projeto] : "Entender na conversa"}</dd></div><div><dt>Valor estimado</dt><dd>{lead.ticket_estimado == null ? "Ainda não definido" : dinheiro(lead.ticket_estimado) || "R$ 0"}</dd></div>{lead.campanha && <div><dt>Campanha</dt><dd>{lead.campanha}{lead.anuncio ? ` · ${lead.anuncio}` : ""}</dd></div>}</dl>
    <div className={c.acoesAtendimento}>
      <div className={c.acoes}>{whatsapp && <a className={`${c.botao} ${c.primario}`} href={whatsapp} target="_blank" rel="noopener noreferrer">Abrir WhatsApp ↗</a>}{instagram && <a className={c.botao} href={`https://www.instagram.com/${encodeURIComponent(instagram)}/`} target="_blank" rel="noopener noreferrer">Abrir Instagram ↗</a>}{!whatsapp && !instagram && <Link className={c.botao} href={`/crm/lead/${lead.id}`}>Completar canal de contato</Link>}<button type="button" className={c.botao} onClick={() => aoRegistrar("saida")}>Registrar atendimento</button></div>
      <p>Depois de enviar a mensagem, registre o atendimento e combine o próximo passo.</p>
    </div>
    {ultimaEntrada?.resumo && <section className={c.mensagem}><span>ÚLTIMA MENSAGEM RECEBIDA · {hora(ultimaEntrada.created_at)}</span><p>{ultimaEntrada.resumo}</p></section>}
    {lead.notas && <details className={c.notas}><summary>Informações do pedido e anotações</summary><p>{lead.notas}</p></details>}
    {lead.cobranca && <section className={c.mensagem}><span>COBRANÇA PENDENTE · {dataCurta(lead.cobranca.vence_em)}</span><p>{lead.cobranca.rotulo} · {dinheiro(lead.cobranca.saldo)} em aberto</p><Link className={c.link} href="/crm/caixa">Conferir recebimento no Caixa</Link></section>}
    {ehAtivo(lead.estagio) && <section className={c.proximoPasso}>
      <div className={c.tituloSecao}><h3>Próximo passo</h3><button type="button" className={c.linkBotao} onClick={() => { setPasso(lead.proximo_passo ?? ""); setErroPasso(null); setEditando(!editando); }}>{editando ? "Cancelar" : "Agendar ou editar"}</button></div>
      {editando ? <form className={c.formPasso} onSubmit={(e) => { e.preventDefault(); setErroPasso(null); comecar(async () => { const r = await definirPasso(lead.id, passo, data); if (r.ok) { setEditando(false); router.refresh(); } else setErroPasso("erro" in r ? r.erro : "Preencha o próximo passo e uma data válida."); }); }}>
        <label>O que fazer<input value={passo} onChange={(e) => setPasso(e.target.value)} placeholder="Entender a necessidade e apresentar a solução" required /></label><label>Quando<input type="date" value={data} min={hoje} onChange={(e) => setData(e.target.value)} required /></label>{erroPasso && <p role="alert">{erroPasso}</p>}<button type="submit" className={`${c.botao} ${c.primario}`} disabled={salvando}>{salvando ? "Salvando…" : "Salvar próximo passo"}</button>
      </form> : <><p>{lead.proximo_passo || "Ainda não combinado"}</p><span className={c.prazo} data-atrasado={Boolean(lead.proxima_acao_em && lead.proxima_acao_em < hoje)}>{lead.proxima_acao_em ? `${lead.proxima_acao_em < hoje ? "Atrasado · " : ""}${dataCurta(lead.proxima_acao_em)}` : "Defina uma ação e uma data"}</span></>}
      {ehNovo && <small>Agendar não marca como atendido. Este contato continua em Novos até você registrar o atendimento.</small>}
    </section>}
    <section className={c.historico}>
      <div className={c.tituloSecao}><h3>Últimas interações</h3><button type="button" className={c.linkBotao} onClick={() => aoRegistrar("entrada")}>Registrar resposta recebida</button></div>
      {falha ? <p role="alert">{falha} <button className={c.linkBotao} type="button" onClick={() => setTentativa((n) => n + 1)}>Tentar novamente</button></p> : historico === null ? <p role="status">Carregando histórico…</p> : historico.length ? <ol>{historico.map((i) => <li key={i.id}><div><b>{i.direcao === "entrada" ? "Cliente escreveu" : "Você entrou em contato"}</b><span>{NOME_CANAL[i.canal]} · {hora(i.created_at)}</span></div><p>{i.resumo || "Interação registrada sem resumo."}</p></li>)}</ol> : <p>Nenhuma interação registrada ainda.</p>}
      <Link className={c.link} href={`/crm/lead/${lead.id}`}>Ver histórico completo na ficha</Link>
    </section>
  </>;
}
