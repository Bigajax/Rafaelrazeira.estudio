/* ============================================================
   PROJETOS: as etapas de uma vitrine depois da entrada paga

   O projeto nasce quando a entrada entra no Caixa (ou, para os antigos,
   quando o card foi para `ganho`), e anda por seis etapas até a loja
   entregue. Cada etapa tem os itens que já custaram alguma coisa quando
   foram esquecidos; o porquê de cada um está no cofre
   (`1 Processos/cartilha-de-entrega.md` e `fazer-uma-vitrine.md`).

   Dois tipos de item:
   - os do CHECKLIST, que o Rafael marca e que moram em crm_projetos.checklist;
   - os AUTOMÁTICOS, que ninguém marca: o dinheiro vem do Caixa (dinheiro
     marcado à mão um dia diverge do Caixa) e "checklist criado" vem de o
     projeto ter a chave do checklist do cliente.
   ============================================================ */

export type Etapa = "entrou" | "material" | "painel" | "cadastro" | "dominio" | "entrega";

export const ETAPAS: { id: Etapa; nome: string; nota: string }[] = [
  { id: "entrou", nome: "Entrou", nota: "o contrato e a entrada" },
  { id: "material", nome: "Material", nota: "o que o cliente deve" },
  { id: "painel", nome: "Painel", nota: "o banco e o acesso dele" },
  { id: "cadastro", nome: "Cadastro", nota: "o material no site" },
  { id: "dominio", nome: "Domínio", nota: "o endereço dele" },
  { id: "entrega", nome: "Entrega", nota: "a loja ligada e o saldo" },
];

export type ItemChecklist = {
  id: string;
  etapa: Etapa;
  texto: string;
  feito: boolean;
  feito_em?: string | null;
  /* item acrescentado à mão, só deste projeto: pode ser tirado */
  extra?: boolean;
};

export type ItemAuto = "contrato" | "entrada" | "checklist" | "saldo";
export const ITENS_AUTO: { id: ItemAuto; etapa: Etapa; texto: string; fonte: "Caixa" | "projeto"; fim?: boolean }[] = [
  { id: "contrato", etapa: "entrou", texto: "Contrato no Caixa", fonte: "Caixa" },
  { id: "entrada", etapa: "entrou", texto: "Entrada recebida", fonte: "Caixa" },
  { id: "checklist", etapa: "material", texto: "Checklist do cliente criado", fonte: "projeto" },
  { id: "saldo", etapa: "entrega", texto: "Saldo recebido", fonte: "Caixa", fim: true },
];

const i = (etapa: Etapa, id: string, texto: string): ItemChecklist => ({ id, etapa, texto, feito: false });

/* O molde da vitrine. Os ids são fixos: é por eles que um projeto antigo
   continua batendo com o molde quando um texto muda. */
export const MOLDE_VITRINE: ItemChecklist[] = [
  i("material", "material-mandado", "Link do checklist mandado ao cliente"),
  i("material", "material-pecas", "Ele respondeu as peças (o que tem e o que saiu)"),
  i("material", "material-fotos", "Fotos e logos recebidas"),
  i("material", "material-baixado", "Material baixado no PC (scripts/material-cliente.mjs)"),

  i("painel", "painel-supabase", "Projeto no Supabase criado e o SQL rodado por arquivo"),
  i("painel", "painel-semear", "Catálogo semeado: peças, fotos, config e usuário"),
  i("painel", "painel-vercel", "Chaves NEXT_PUBLIC na Vercel (a anon com --type config)"),
  i("painel", "painel-imagens", "images.remotePatterns no next.config"),
  i("painel", "painel-teste", "Painel testado no ar: login, peça com foto, apagar a de teste"),
  i("painel", "painel-login", "Login com o e-mail dele e senha nova"),
  i("painel", "painel-performance", "Loja criada em Performance e PERF_CHAVE (com PERF_URL e PERF_ANON) na Vercel"),

  i("cadastro", "cadastro-saiu", "Peças que saíram, tiradas"),
  i("cadastro", "cadastro-novas", "Peças novas cadastradas"),
  i("cadastro", "cadastro-grade", "Preços, tamanhos e cores nas peças"),
  i("cadastro", "cadastro-fotos", "Fotos novas nas peças, em WebP"),
  i("cadastro", "cadastro-marcas", "Marcas e logos no site"),
  i("cadastro", "cadastro-banners", "Banners do jeito que ele aprovou"),

  i("dominio", "dominio-acesso", "Acesso ao registro ou à hospedagem do domínio"),
  i("dominio", "dominio-email", "Conferido se ele usa e-mail no domínio (se usa, só A e CNAME)"),
  i("dominio", "dominio-vercel", "Domínio no projeto da Vercel e apontado"),
  i("dominio", "dominio-curl", "Conferido com curl -sIL"),
  i("dominio", "dominio-url", "site.url, canonical, og e sitemap no domínio"),

  i("entrega", "entrega-whatsapp", "WhatsApp dos pedidos confirmado com ele"),
  i("entrega", "entrega-previa", "PREVIA = null no site.config"),
  i("entrega", "entrega-teste", "Teste no ar: um pedido chegando no WhatsApp dele"),
  i("entrega", "entrega-manual", "Manual do painel com o domínio e o login finais"),
  i("entrega", "entrega-bio", "Link novo na bio do Instagram"),
  i("entrega", "entrega-mensagem", "Mensagem de entrega mandada"),
];

/* O checklist de um projeto é o que está gravado; sem nada gravado, é o
   molde. Item do molde que ainda não existe no gravado (molde que cresceu
   depois) entra no fim da etapa dele, desmarcado; item gravado de uma
   etapa que não existe mais é descartado. */
export function checklistDe(gravado: ItemChecklist[] | null | undefined): ItemChecklist[] {
  const validas = new Set(ETAPAS.map((e) => e.id));
  const base = (Array.isArray(gravado) ? gravado : []).filter((x) => validas.has(x.etapa));
  if (!base.length) return MOLDE_VITRINE.map((x) => ({ ...x }));
  const tem = new Set(base.map((x) => x.id));
  const faltam = MOLDE_VITRINE.filter((x) => !tem.has(x.id)).map((x) => ({ ...x }));
  const ordem = (e: Etapa) => ETAPAS.findIndex((x) => x.id === e);
  return [...base, ...faltam]
    .map((x, n) => ({ x, n }))
    .sort((a, b) => ordem(a.x.etapa) - ordem(b.x.etapa) || a.n - b.n)
    .map(({ x }) => x);
}

export type Caixa = {
  contrato: boolean;
  entrada: boolean;
  saldo: boolean;
  total: number;
  pago: number;
  /* o próximo valor a receber e quando, para a linha do projeto */
  proxima: { rotulo: string; valor: number; vence_em: string } | null;
};

export type Projeto = {
  lead_id: string;
  /* nulo enquanto nada foi gravado: o projeto é só o molde */
  id: string | null;
  nome: string;
  instagram: string | null;
  whatsapp: string | null;
  fechado_em: string | null;
  valor: number | null;
  checklist: ItemChecklist[];
  site: string | null;
  dominio: string | null;
  repo: string | null;
  material: string | null;
  notas: string | null;
  entregue_em: string | null;
  caixa: Caixa;
  auto: Record<ItemAuto, boolean>;
  /* A loja no Performance (a contagem da vitrine), se já foi criada. */
  performance: { id: string; nome: string; slug: string; chave_prefixo: string | null; liberado_ate: string | null; para_sempre: boolean; ativa: boolean } | null;
};

export type SituacaoEtapa = { feitos: number; total: number; pronta: boolean };

/* Quantos itens de cada etapa estão feitos, contando os automáticos. */
export function situacaoDasEtapas(p: Pick<Projeto, "checklist" | "auto">): Record<Etapa, SituacaoEtapa> {
  const r = {} as Record<Etapa, SituacaoEtapa>;
  for (const e of ETAPAS) r[e.id] = { feitos: 0, total: 0, pronta: false };
  for (const x of p.checklist) {
    r[x.etapa].total++;
    if (x.feito) r[x.etapa].feitos++;
  }
  for (const x of ITENS_AUTO) {
    r[x.etapa].total++;
    if (p.auto[x.id]) r[x.etapa].feitos++;
  }
  for (const e of ETAPAS) r[e.id].pronta = r[e.id].total > 0 && r[e.id].feitos === r[e.id].total;
  return r;
}

/* A etapa da vez: a primeira que ainda tem item em aberto. Projeto
   entregue não tem etapa da vez. */
export function etapaAtual(p: Pick<Projeto, "checklist" | "auto" | "entregue_em">): Etapa | null {
  if (p.entregue_em) return null;
  const s = situacaoDasEtapas(p);
  return ETAPAS.find((e) => !s[e.id].pronta)?.id ?? null;
}

/* O próximo item a fazer, na ordem em que a etapa aparece na tela. */
export function proximoItem(p: Pick<Projeto, "checklist" | "auto" | "entregue_em">): string | null {
  const e = etapaAtual(p);
  if (!e) return null;
  const antes = ITENS_AUTO.filter((x) => x.etapa === e && !x.fim && !p.auto[x.id]);
  const meus = p.checklist.filter((x) => x.etapa === e && !x.feito);
  const depois = ITENS_AUTO.filter((x) => x.etapa === e && x.fim && !p.auto[x.id]);
  return antes[0]?.texto ?? meus[0]?.texto ?? depois[0]?.texto ?? null;
}
