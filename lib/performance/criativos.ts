/* ============================================================
   AS CONTAS DA SUBABA CRIATIVOS (19/10/2026)

   Funções puras: recebem as linhas de ads_anuncios e ads_meta_dia e devolvem
   o que a tela mostra. O criativo é o utm_content (a chave que amarra Meta,
   página, lead e venda); anúncio antigo sem utm entra pelo nome.

   As réguas vêm da docs/matriz-anuncios-vitrine.md:
   - menos de 500 impressões não se julga;
   - o hook rate corta o pior terço do lote (relativo, nunca um corte fixo);
   - gastar 1,5 a 2x o custo por formulário alvo sem nenhum formulário mata.
   ============================================================ */

export type LinhaAnuncio = {
  ad_id: string;
  nome: string;
  status: string | null;
  conjunto: string | null;
  campanha: string | null;
  utm_content: string | null;
  destino: string | null;
};

export type LinhaDia = {
  ad_id: string;
  dia: string;
  gasto: number;
  impressoes: number;
  plays_3s: number;
  thruplay: number;
  cliques_link: number;
  lpv: number;
  formularios: number;
  checkouts: number;
  compras: number;
};

export type Conta = {
  nome: string | null;
  status: number | null;
  motivo: number | null;
  gasto_vida: number | null;
  ultimo_gasto_em: string | null;
  lido_em: string;
};

/* O custo por formulário que serve de régua. PROVISÓRIO: o Rafael ainda não
   decidiu o alvo (docs/plano-performance-criativos.md, "o que o Rafael decide").
   R$ 20 é o piso da expectativa combinada em 10/08 ("formulário deve sair entre
   R$ 20 e R$ 50"); o h27u fez R$ 10,36. */
export const CPL_ALVO = 20;
export const PISO_IMPRESSOES = 500;

export type Criativo = {
  chave: string;
  nome: string;
  anuncios: number;
  ligados: number;
  campanhas: string[];
  destino: string | null;
  gasto: number;
  impressoes: number;
  plays_3s: number;
  thruplay: number;
  cliques_link: number;
  lpv: number;
  formularios: number;
  checkouts: number;
  compras: number;
  hook: number | null; // plays de 3 s / impressões
  hold: number | null; // ThruPlay / impressões
  ctr: number | null; // cliques no link / impressões
  custoLpv: number | null;
  cpl: number | null; // gasto / formulários
  custoCheckout: number | null;
  conselho: { nivel: "vermelho" | "amarelo" | "verde" | "cinza"; texto: string };
  // fase 2: a página (Mixpanel) e o CRM
  visitantes: number;
  interagiram: number;
  enviaram: number;
  leads: number;
  clientes: number;
  receita: number;
  cac: number | null; // gasto / clientes
  retorno: number | null; // receita / gasto
};

/* ---------- FASE 2: a página e o CRM (19/10/2026) ---------- */

export type LinhaPagina = { utm_content: string; pagina: string; dia: string; visitantes: number; interagiram: number; comecaram: number; enviaram: number };
export type LinhaLead = { id: string; anuncio: string | null; estagio: string; created_at: string };
export type LinhaRecebimento = { lead_id: string | null; valor: number; valor_estornado: number | null; estornado_em: string | null; recebido_em: string; utm: string | null };

/* A utm de agosto era dinâmica ({{ad.id}}): o lead e o Mixpanel guardaram o
   número do anúncio. Ele vira a chave do criativo daquele anúncio. Utm que não
   é de anúncio nenhum (link_in_bio) devolve null: não é tráfego pago. */
export function chaveDaUtm(utm: string | null, anuncios: LinhaAnuncio[]) {
  if (!utm) return null;
  const porId = anuncios.find((a) => a.ad_id === utm);
  if (porId) return chaveDo(porId);
  if (anuncios.some((a) => a.utm_content === utm)) return utm;
  // os lp- de setembro levavam o nome do anúncio na utm e não tinham utm no link
  const porNome = anuncios.find((a) => a.nome === utm);
  return porNome ? chaveDo(porNome) : null;
}

/* Lead e venda por COORTE: os leads que chegaram no período e tudo o que eles
   pagaram, quando quer que tenham pago (a venda vem semanas depois do lead).
   O pagamento da compra direta sem lead (a v4) entra pela utm do metadata,
   pela data em que entrou. */
export function ligarCRM(
  criativos: Criativo[],
  anuncios: LinhaAnuncio[],
  paginas: LinhaPagina[],
  leads: LinhaLead[],
  recebimentos: LinhaRecebimento[],
  desde: string,
  ate: string,
) {
  const porChave = new Map(criativos.map((g) => [g.chave, g]));
  for (const p of paginas) {
    if (p.dia < desde || p.dia > ate) continue;
    const g = porChave.get(chaveDaUtm(p.utm_content, anuncios) ?? "");
    if (!g) continue;
    g.visitantes += p.visitantes;
    g.interagiram += p.interagiram;
    g.enviaram += p.enviaram;
  }

  const liquido = (r: LinhaRecebimento) => (r.estornado_em ? 0 : Math.max(0, Number(r.valor) - Number(r.valor_estornado || 0)));
  const chaveDoLead = new Map<string, string>();
  for (const l of leads) {
    const dia = l.created_at.slice(0, 10);
    if (dia < desde || dia > ate) continue;
    const chave = chaveDaUtm(l.anuncio, anuncios);
    const g = chave ? porChave.get(chave) : null;
    if (!g) continue;
    g.leads += 1;
    if (l.estagio === "ganho") g.clientes += 1;
    chaveDoLead.set(l.id, g.chave);
  }
  for (const r of recebimentos) {
    const chave = r.lead_id ? chaveDoLead.get(r.lead_id) : r.recebido_em >= desde && r.recebido_em <= ate ? chaveDaUtm(r.utm, anuncios) : null;
    const g = chave ? porChave.get(chave) : null;
    if (g) g.receita += liquido(r);
  }
  for (const g of criativos) {
    g.receita = Math.round(g.receita * 100) / 100;
    g.cac = g.clientes ? g.gasto / g.clientes : null;
    g.retorno = g.gasto > 0 ? g.receita / g.gasto : null;
  }
  return criativos;
}

/* o mês a mês, para comparar com o Financeiro: gasto real contra o que voltou */
export function mesAMes(anuncios: LinhaAnuncio[], dias: LinhaDia[], leads: LinhaLead[], recebimentos: LinhaRecebimento[]) {
  const meses = new Map<string, { mes: string; gasto: number; formularios: number; leads: number; clientes: number; receita: number }>();
  const m = (mes: string) => {
    if (!meses.has(mes)) meses.set(mes, { mes, gasto: 0, formularios: 0, leads: 0, clientes: 0, receita: 0 });
    return meses.get(mes)!;
  };
  for (const d of dias) {
    const x = m(d.dia.slice(0, 7));
    x.gasto += Number(d.gasto) || 0;
    x.formularios += d.formularios;
  }
  const mesDoLead = new Map<string, string>();
  for (const l of leads) {
    if (!chaveDaUtm(l.anuncio, anuncios)) continue;
    const mes = l.created_at.slice(0, 7);
    const x = m(mes);
    x.leads += 1;
    if (l.estagio === "ganho") x.clientes += 1;
    mesDoLead.set(l.id, mes);
  }
  for (const r of recebimentos) {
    const mes = r.lead_id ? mesDoLead.get(r.lead_id) : chaveDaUtm(r.utm, anuncios) ? r.recebido_em.slice(0, 7) : undefined;
    if (mes) m(mes).receita += r.estornado_em ? 0 : Math.max(0, Number(r.valor) - Number(r.valor_estornado || 0));
  }
  return [...meses.values()].filter((x) => x.gasto > 0 || x.receita > 0).sort((a, b) => a.mes.localeCompare(b.mes));
}

const div = (a: number, b: number) => (b > 0 ? a / b : null);

/* a chave do criativo: o utm_content; sem ele, o nome do anúncio */
export const chaveDo = (a: LinhaAnuncio) => a.utm_content || `nome:${a.nome}`;

export function agruparCriativos(anuncios: LinhaAnuncio[], dias: LinhaDia[]): Criativo[] {
  const porAd = new Map(anuncios.map((a) => [a.ad_id, a]));
  const grupos = new Map<string, Criativo>();

  for (const d of dias) {
    const a = porAd.get(d.ad_id) ?? { ad_id: d.ad_id, nome: `anúncio ${d.ad_id}`, status: null, conjunto: null, campanha: null, utm_content: null, destino: null };
    const chave = chaveDo(a);
    let g = grupos.get(chave);
    if (!g) {
      g = {
        chave,
        nome: a.utm_content ?? a.nome,
        anuncios: 0,
        ligados: 0,
        campanhas: [],
        destino: a.destino,
        gasto: 0,
        impressoes: 0,
        plays_3s: 0,
        thruplay: 0,
        cliques_link: 0,
        lpv: 0,
        formularios: 0,
        checkouts: 0,
        compras: 0,
        hook: null,
        hold: null,
        ctr: null,
        custoLpv: null,
        cpl: null,
        custoCheckout: null,
        conselho: { nivel: "cinza", texto: "" },
        visitantes: 0,
        interagiram: 0,
        enviaram: 0,
        leads: 0,
        clientes: 0,
        receita: 0,
        cac: null,
        retorno: null,
      };
      grupos.set(chave, g);
    }
    g.gasto += Number(d.gasto) || 0;
    g.impressoes += d.impressoes;
    g.plays_3s += d.plays_3s;
    g.thruplay += d.thruplay;
    g.cliques_link += d.cliques_link;
    g.lpv += d.lpv;
    g.formularios += d.formularios;
    g.checkouts += d.checkouts;
    g.compras += d.compras;
  }

  // quantos anúncios cada criativo tem, e quantos estão no ar
  for (const a of anuncios) {
    const g = grupos.get(chaveDo(a));
    if (!g) continue;
    g.anuncios += 1;
    if (a.status === "ACTIVE") g.ligados += 1;
    if (a.campanha && !g.campanhas.includes(a.campanha)) g.campanhas.push(a.campanha);
  }

  const lista = [...grupos.values()].map((g) => ({
    ...g,
    gasto: Math.round(g.gasto * 100) / 100,
    hook: g.plays_3s ? div(g.plays_3s, g.impressoes) : null, // imagem não tem play: sem hook
    hold: g.plays_3s ? div(g.thruplay, g.impressoes) : null,
    ctr: div(g.cliques_link, g.impressoes),
    custoLpv: div(g.gasto, g.lpv),
    cpl: div(g.gasto, g.formularios),
    custoCheckout: div(g.gasto, g.checkouts),
  }));

  // o pior terço do hook, só entre os vídeos que já passaram do piso
  const julgaveis = lista.filter((g) => g.impressoes >= PISO_IMPRESSOES && g.hook != null).sort((a, b) => (a.hook ?? 0) - (b.hook ?? 0));
  const piorTerco = new Set(julgaveis.length >= 3 ? julgaveis.slice(0, Math.floor(julgaveis.length / 3)).map((g) => g.chave) : []);

  for (const g of lista) g.conselho = aconselhar(g, piorTerco.has(g.chave));
  return lista.sort((a, b) => b.gasto - a.gasto);
}

const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/* O "InitiateCheckout" quer dizer coisas diferentes por página: na
   /vitrine-digital é o primeiro toque no formulário (não é resultado); na
   /vitrine-v4 é o toque em pagar, o resultado até o Purchase existir. */
export const compraDireta = (destino: string | null) => Boolean(destino && destino.includes("vitrine-v4"));

/* uma frase só, dizendo o que aconteceu; o juízo só quando a régua permite */
export function aconselhar(g: Pick<Criativo, "destino" | "checkouts" | "formularios" | "custoCheckout" | "cpl" | "impressoes" | "gasto" | "hook">, piorTercoNoHook: boolean): Criativo["conselho"] {
  const direta = compraDireta(g.destino);
  const resultado = direta ? g.checkouts : g.formularios;
  const custo = direta ? g.custoCheckout : g.cpl;
  const oQue = direta ? "toque em pagar" : "formulário";
  if (g.impressoes < PISO_IMPRESSOES) return { nivel: "cinza", texto: `Ainda cedo: ${g.impressoes} impressões, o piso é ${PISO_IMPRESSOES}.` };
  if (!resultado && g.gasto >= 2 * CPL_ALVO) return { nivel: "vermelho", texto: `Gastou ${reais(g.gasto)} sem nenhum ${oQue}: cortar.` };
  if (piorTercoNoHook) return { nivel: "vermelho", texto: `Pior terço do hook (${pct(g.hook)}): o começo não segura.` };
  if (custo != null && custo > 2 * CPL_ALVO) return { nivel: "amarelo", texto: `Cada ${oQue} custou ${reais(custo)}, mais que o dobro da régua (${reais(CPL_ALVO)}).` };
  if (custo != null) return { nivel: "verde", texto: `Cada ${oQue} custou ${reais(custo)}.` };
  return { nivel: "cinza", texto: `Sem ${oQue} ainda, abaixo da régua para cortar.` };
}

export const pct = (v: number | null) => (v == null ? "–" : `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);

/* os avisos do topo: só o que custa dinheiro ou esconde o número */
export function avisosDaConta(conta: Conta | null, anuncios: LinhaAnuncio[], hojeISO: string) {
  const avisos: { nivel: "vermelho" | "amarelo"; texto: string }[] = [];
  if (!conta) return avisos;
  const ligados = anuncios.filter((a) => a.status === "ACTIVE");
  const diasEntre = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
  const dataBR = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

  if (conta.status != null && conta.status !== 1)
    avisos.push({ nivel: "vermelho", texto: `A conta de anúncios não está ativa (status ${conta.status} na Meta). Nada entrega até resolver no Gerenciador.` });
  if (ligados.length && (!conta.ultimo_gasto_em || diasEntre(conta.ultimo_gasto_em, hojeISO) > 2))
    avisos.push({
      nivel: "vermelho",
      texto: `${ligados.length} ${ligados.length === 1 ? "anúncio está ligado" : "anúncios estão ligados"}, mas a conta não gasta nada desde ${conta.ultimo_gasto_em ? dataBR(conta.ultimo_gasto_em) : "há mais de 90 dias"}. Quase sempre é o pagamento: confira no Gerenciador.`,
    });
  if (diasEntre(conta.lido_em.slice(0, 10), hojeISO) > 7)
    avisos.push({ nivel: "amarelo", texto: `A última leitura da Meta é de ${dataBR(conta.lido_em)}. Os números abaixo podem estar velhos.` });
  const semUtm = ligados.filter((a) => !a.utm_content);
  if (semUtm.length)
    avisos.push({ nivel: "amarelo", texto: `${semUtm.length} ${semUtm.length === 1 ? "anúncio ligado está" : "anúncios ligados estão"} sem utm_content no link: o lead e a venda deles não vão se ligar ao criativo (${semUtm.map((a) => a.nome).slice(0, 3).join(", ")}).` });
  return avisos;
}

/* ---------- FASE 3: a curva de retenção (19/10/2026) ---------- */

/* O video_play_curve_actions da Meta: um ponto por segundo de 0 a 15, depois
   os baldes 15-20, 20-25, 25-30, 30-40, 40-50 e 50-60. Cada ponto vai para o
   FIM do seu balde, para a linha não prometer precisão que não tem. */
export const TEMPOS_CURVA = [...Array.from({ length: 16 }, (_, i) => i), 20, 25, 30, 40, 50, 60];

export function pontosDaCurva(curva: number[], duracao: number | null) {
  const fim = duracao ? Math.ceil(duracao) : 60;
  return curva
    .map((v, i) => ({ t: TEMPOS_CURVA[i], v: Number(v) || 0 }))
    .filter((p) => p.t != null && p.t <= fim);
}

/* onde mais gente sai, entre dois segundos vizinhos dos primeiros 15 */
export function maiorQueda(pontos: { t: number; v: number }[]) {
  let melhor: { de: number; ate: number; antes: number; depois: number } | null = null;
  for (let i = 1; i < pontos.length && pontos[i].t <= 15; i++) {
    const perda = pontos[i - 1].v - pontos[i].v;
    if (!melhor || perda > melhor.antes - melhor.depois)
      melhor = { de: pontos[i - 1].t, ate: pontos[i].t, antes: pontos[i - 1].v, depois: pontos[i].v };
  }
  return melhor;
}

/* ---------- FASE 4: a leitura (19/10/2026) ---------- */

/* A semana contra a anterior: os últimos 7 dias fechados (até ontem) e os 7
   de antes. Hoje fica fora porque ainda está gastando. */
export function semanaContraAnterior(dias: LinhaDia[], leads: LinhaLead[], anuncios: LinhaAnuncio[], hojeISO: string) {
  const dia = (desloc: number) => new Date(Date.parse(hojeISO) - desloc * 864e5).toISOString().slice(0, 10);
  const janelas = [
    { de: dia(7), ate: dia(1) },
    { de: dia(14), ate: dia(8) },
  ];
  const [esta, antes] = janelas.map(({ de, ate }) => {
    const d = dias.filter((x) => x.dia >= de && x.dia <= ate);
    const gasto = d.reduce((s, x) => s + (Number(x.gasto) || 0), 0);
    const formularios = d.reduce((s, x) => s + x.formularios, 0);
    const l = leads.filter((x) => x.created_at.slice(0, 10) >= de && x.created_at.slice(0, 10) <= ate && chaveDaUtm(x.anuncio, anuncios));
    return { de, ate, gasto, formularios, cpl: formularios ? gasto / formularios : null, leads: l.length, clientes: l.filter((x) => x.estagio === "ganho").length };
  });
  return { esta, antes };
}

/* Os lotes: o nome do L08 em diante carrega o desenho do teste
   (l08-01-longo-japa: lote, número, formato, loja). Os de antes seguem o
   prefixo do formato (pip-, punch-, lp-), sem loja. A soma por componente só
   vale com 3 a 4 lotes, como a matriz diz; até lá é a leitura do lote. */
export function componentesDo(nome: string) {
  const l = nome.toLowerCase().match(/^l(\d{2})-(\d{2})-([a-z0-9]+)-([a-z0-9]+)/);
  if (l) return { lote: `L${l[1]}`, formato: l[3], loja: l[4] };
  const f = nome.toLowerCase().match(/^(pip|punch|lp)\b/);
  return f ? { lote: null, formato: f[1], loja: null } : null;
}

export function porComponente(criativos: Criativo[], campo: "formato" | "loja", lote: string | null) {
  const grupos = new Map<string, { valor: string; criativos: number; gasto: number; impressoes: number; plays_3s: number; resultado: number; clientes: number; receita: number }>();
  for (const g of criativos) {
    const c = componentesDo(g.nome);
    if (!c || c.lote !== lote || !c[campo]) continue;
    const k = c[campo]!;
    const x = grupos.get(k) ?? { valor: k, criativos: 0, gasto: 0, impressoes: 0, plays_3s: 0, resultado: 0, clientes: 0, receita: 0 };
    x.criativos += 1;
    x.gasto += g.gasto;
    x.impressoes += g.impressoes;
    x.plays_3s += g.plays_3s;
    x.resultado += compraDireta(g.destino) ? g.checkouts : g.formularios;
    x.clientes += g.clientes;
    x.receita += g.receita;
    grupos.set(k, x);
  }
  return [...grupos.values()]
    .map((x) => ({ ...x, hook: x.impressoes && x.plays_3s ? x.plays_3s / x.impressoes : null, custo: x.resultado ? x.gasto / x.resultado : null }))
    .sort((a, b) => b.gasto - a.gasto);
}
