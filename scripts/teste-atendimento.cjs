const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict"), ts = require("typescript");
function carregar(arquivo, substitutos = {}) {
  const cache = new Map();
  function ler(nome, pai = path.join(process.cwd(), "entrada.js")) {
    if (Object.hasOwn(substitutos, nome)) return substitutos[nome];
    if (!nome.startsWith("@/") && !nome.startsWith(".")) return require(nome);
    const base = nome.startsWith("@/") ? path.resolve(nome.slice(2)) : path.resolve(path.dirname(pai), nome);
    const alvo = [base, base + ".ts", base + ".tsx"].find((p) => fs.existsSync(p));
    if (!alvo) throw Error("Módulo ausente: " + nome);
    if (cache.has(alvo)) return cache.get(alvo).exports;
    const modulo = { exports: {} }; cache.set(alvo, modulo);
    new Function("require", "module", "exports", ts.transpileModule(fs.readFileSync(alvo, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText)((nome) => ler(nome, alvo), modulo, modulo.exports);
    return modulo.exports;
  }
  return ler("@/" + arquivo);
}
const { filasAtendimento, novoContato, precisaResponder, tempoDeEspera } = carregar("lib/crm/atendimento.ts");
const hoje = "2026-10-16";
const lead = (id, extra = {}) => ({ id, estagio: "lista", origem: "inbound", toques: 0, toques_entrada: 0, saidas_seguidas: 0, created_at: "2026-10-10T12:00:00Z", ultimo_toque_em: null, proxima_acao_em: null, ...extra });
const testes = [], testar = (nome, executar) => testes.push({ nome, executar });
testar("Novo não depende de agenda, idade ou etapa do negócio", () => {
  const l = lead("a", { created_at: "2025-01-01", estagio: "conversa", proxima_acao_em: "2027-01-01", toques: 2, toques_entrada: 2 });
  assert.equal(novoContato(l), true);
  assert.deepEqual(filasAtendimento([l], hoje).novos.map((x) => x.id), ["a"]);
});
testar("Primeira saída registrada encerra Novos; uma entrada não encerra", () => {
  assert.equal(novoContato(lead("a", { toques: 1, toques_entrada: 1 })), true);
  assert.equal(novoContato(lead("a", { toques: 2, toques_entrada: 1, saidas_seguidas: 1 })), false);
});
testar("Quem procurou o estúdio vem antes do lote importado, e o que acabou de chegar no topo", () => {
  const dados = [lead("importado", { origem: "prospeccao", created_at: "2020-01-01" }), lead("indicado", { origem: "indicacao" }), lead("recente", { created_at: "2026-10-16" }), lead("esperando", { created_at: "2026-10-15" })];
  assert.deepEqual(filasAtendimento(dados, hoje).novos.map((l) => l.id), ["recente", "esperando", "indicado", "importado"]);
});
testar("Resposta pendente reaparece independente da agenda futura e da origem", () => {
  const l = lead("a", { origem: "prospeccao", toques: 4, toques_entrada: 2, saidas_seguidas: 0, proxima_acao_em: "2027-01-01" });
  assert.equal(precisaResponder(l), true);
  assert.equal(filasAtendimento([l], hoje).responder.length, 1);
});
testar("Uma nova saída retira da fila Preciso responder", () => {
  assert.equal(precisaResponder(lead("a", { toques: 4, toques_entrada: 2, saidas_seguidas: 1 })), false);
});
testar("Retornos distingue contatos em espera, atrasados e futuros", () => {
  const dados = [lead("novo"), lead("resposta", { toques: 3, toques_entrada: 1 }), lead("atrasado", { toques: 1, saidas_seguidas: 1, proxima_acao_em: "2026-10-15" }), lead("futuro", { toques: 1, saidas_seguidas: 1, proxima_acao_em: "2027-01-01" })];
  assert.deepEqual(filasAtendimento(dados, hoje).retornos.map((l) => l.id), ["atrasado"]);
});
testar("Geladeira reaparece na data e cobrança de ganho continua disponível", () => {
  const dados = [lead("dormindo", { estagio: "geladeira", proxima_acao_em: "2027-01-01" }), lead("reativar", { estagio: "geladeira", proxima_acao_em: hoje }), lead("cobrar", { estagio: "ganho", cobranca: { quando: hoje } })];
  const r = filasAtendimento(dados, hoje);
  assert.deepEqual(r.retornos.map((l) => l.id), ["cobrar", "reativar"]);
  assert.equal(r.novos.length, 0);
});
testar("Ganho e perdido não entram como novos ou respostas pendentes", () => {
  const r = filasAtendimento([lead("a", { estagio: "ganho" }), lead("b", { estagio: "perdido", toques: 3, toques_entrada: 1 })], hoje);
  assert.equal(r.novos.length + r.responder.length, 0);
});
testar("Uma ficha repetida não duplica contagens; negociação inclui datas futuras", () => {
  const l = lead("a", { estagio: "proposta", toques: 1, saidas_seguidas: 1, proxima_acao_em: "2027-01-01" });
  assert.equal(filasAtendimento([l, l], hoje).negociacao.length, 1);
});
testar("Tempo de espera não depende do fuso local nem produz valores negativos", () => {
  assert.equal(tempoDeEspera("2026-10-16T10:00:00-03:00", Date.parse("2026-10-16T14:30:00Z")), "1 h de espera");
  assert.equal(tempoDeEspera("2027-01-01", Date.parse(hoje)), "Agora");
  assert.equal(tempoDeEspera("inválido", Date.parse(hoje)), "Horário indisponível");
});
testar("Histórico exige sessão e não consulta banco sem autenticação", async () => {
  const a = carregar("app/(pt)/crm/acoes-atendimento.ts", { "@/lib/crm/supabase": { usuarioAtual: async () => null, clienteServidor: async () => { throw Error("Não deve consultar"); } } });
  assert.equal((await a.lerHistoricoAtendimento("00000000-0000-4000-8000-000000000010")).ok, false);
});
testar("Histórico verifica dono antes de consultar interações e não disfarça falhas", async () => {
  let tabelas = [], filtros = [];
  const a = carregar("app/(pt)/crm/acoes-atendimento.ts", { "@/lib/crm/supabase": {
    usuarioAtual: async () => ({ id: "dono" }), clienteServidor: async () => ({ from(tabela) { tabelas.push(tabela); const q = { select() { return q; }, eq(k, v) { filtros.push([k, v]); return q; }, maybeSingle: async () => ({ data: null, error: { message: "Falhou" } }) }; return q; } }),
  } });
  assert.equal((await a.lerHistoricoAtendimento("00000000-0000-4000-8000-000000000010")).ok, false);
  assert.deepEqual(tabelas, ["crm_leads"]);
  assert.ok(filtros.some(([k, v]) => k === "owner_id" && v === "dono"));
});
/* 11/11/2026: a cobrança que se repetia e a prospecção do dia. */
const { filaDaVez, cobrancaNaVez, blackPorMandar } = carregar("lib/crm/atendimento.ts");
const divida = { parcela_id: "p", rotulo: "Entrada", valor: 199, saldo: 199, vence_em: "2026-10-06", quando: "2026-10-06", metodo_previsto: null, contrato_titulo: "c" };
const grupoDe = (r, id) => r.itens.find((i) => i.lead.id === id)?.grupo ?? null;
testar("Cobrança nunca feita fica na fila, mesmo com retorno no futuro", () => {
  const l = lead("a", { estagio: "previa", cobranca: divida, toques: 1, saidas_seguidas: 1, ultimo_toque_em: "2026-10-01T12:00:00Z", proxima_acao_em: "2026-12-01" });
  assert.equal(cobrancaNaVez(l, hoje), true);
  assert.equal(grupoDe(filaDaVez([l], hoje), "a"), "receber");
});
testar("Cobrança feita sai da fila até o retorno marcado, e sem cair em 'encerrar'", () => {
  const l = lead("a", { estagio: "previa", cobranca: divida, preco_em: "2026-10-01T12:00:00Z", toques: 3, saidas_seguidas: 2, ultimo_toque_em: "2026-10-16T12:00:00Z", proxima_acao_em: "2026-10-18" });
  const r = filaDaVez([l], hoje);
  assert.equal(grupoDe(r, "a"), null);
  assert.equal(r.aguardando, 1);
  assert.equal(grupoDe(filaDaVez([l], "2026-10-18"), "a"), "receber");
});
testar("Cobrança feita sem data volta em 3 dias; se a pessoa responde, volta na hora", () => {
  const l = lead("a", { estagio: "ganho", cobranca: divida, toques: 2, saidas_seguidas: 1, ultimo_toque_em: "2026-10-15T12:00:00Z" });
  assert.equal(cobrancaNaVez(l, hoje), false);
  assert.equal(cobrancaNaVez(l, "2026-10-18"), true);
  assert.equal(cobrancaNaVez({ ...l, saidas_seguidas: 0, toques_entrada: 1 }, hoje), true);
});
testar("Prospecção do dia: só quem nunca ouviu, um segmento, dez por dia", () => {
  const p = (id, extra = {}) => lead(id, { origem: "prospeccao", nicho: "Roupas femininas", whatsapp: "44999990000", ...extra });
  const dados = [...Array.from({ length: 14 }, (_, i) => p("r" + String(i).padStart(2, "0"))), p("pet", { nicho: "pet shop" }), p("falado", { toques: 1, saidas_seguidas: 1, ultimo_toque_em: "2026-10-01T12:00:00Z" })];
  const r = filaDaVez(dados, hoje);
  assert.equal(r.itens.filter((i) => i.grupo === "prospeccao").length, 10);
  assert.equal(r.prospeccao.nicho, "roupas femininas");
  assert.equal(r.prospeccao.noNicho, 14);
  assert.equal(grupoDe(r, "pet"), null);
  assert.equal(grupoDe(r, "falado"), null);
  assert.equal(grupoDe(filaDaVez(dados, hoje, "pet shop"), "pet"), "prospeccao");
});
testar("Prospecção do dia desconta os que já saíram hoje e fica depois dos outros grupos", () => {
  const p = (id, extra = {}) => lead(id, { origem: "prospeccao", nicho: "roupas femininas", ...extra });
  const feitos = Array.from({ length: 4 }, (_, i) => p("f" + i, { toques: 1, saidas_seguidas: 1, ultimo_toque_em: hoje + "T15:00:00Z" }));
  const r = filaDaVez([...Array.from({ length: 12 }, (_, i) => p("r" + String(i).padStart(2, "0"))), ...feitos, lead("novo", { created_at: hoje + "T12:00:00Z" })], hoje);
  assert.equal(r.prospeccao.feitosHoje, 4);
  assert.equal(r.itens.filter((i) => i.grupo === "prospeccao").length, 6);
  assert.equal(r.itens[0].lead.id, "novo");
});
/* 25/11/2026: a cobrança tem o grupo dela, no fim da fila. */
testar("Quem deve e escreveu por último fica em Responder agora, não em A receber", () => {
  const l = lead("a", { estagio: "previa", cobranca: divida, toques: 3, toques_entrada: 1, saidas_seguidas: 0, ultimo_toque_em: "2026-10-16T12:00:00Z" });
  assert.equal(grupoDe(filaDaVez([l], hoje), "a"), "responder");
});
testar("A cobrança não passa na frente de quem escreveu, e A receber é o último grupo da tela", () => {
  const deve = lead("deve", { estagio: "ganho", cobranca: divida, toques: 1, saidas_seguidas: 1, ultimo_toque_em: "2026-10-01T12:00:00Z" });
  const escreveu = lead("escreveu", { estagio: "conversa", toques: 3, toques_entrada: 1, saidas_seguidas: 0, ultimo_toque_em: "2026-10-16T12:00:00Z" });
  const novo = lead("novo", { created_at: hoje + "T12:00:00Z" });
  const garimpo = lead("garimpo", { origem: "prospeccao", nicho: "roupas femininas" });
  const r = filaDaVez([deve, escreveu, novo, garimpo], hoje);
  assert.equal(grupoDe(r, "deve"), "receber");
  assert.equal(grupoDe(r, "escreveu"), "responder");
  assert.equal(r.itens.filter((i) => i.grupo === "responder").length, 1);
  assert.equal(r.itens[r.itens.length - 1].lead.id, "deve");
});
testar("Em A receber, a parcela mais antiga vem primeiro", () => {
  const nova = lead("nova", { estagio: "ganho", cobranca: { ...divida, vence_em: "2026-10-10", quando: "2026-10-10" }, toques: 1, saidas_seguidas: 1, ultimo_toque_em: "2026-10-01T12:00:00Z" });
  const velha = lead("velha", { estagio: "ganho", cobranca: { ...divida, vence_em: "2026-09-26", quando: "2026-09-26" }, toques: 1, saidas_seguidas: 1, ultimo_toque_em: "2026-09-20T12:00:00Z" });
  const r = filaDaVez([nova, velha], hoje);
  assert.deepEqual(r.itens.map((i) => i.lead.id), ["velha", "nova"]);
});
/* 26/11/2026: a qualidade de quem vem depois dos novos. */
const H = "2026-11-26";
const escreveu = (id, dia, extra = {}) => lead(id, { estagio: "conversa", origem: "trafego_pago", toques: 3, toques_entrada: 2, saidas_seguidas: 0, ultimo_toque_em: dia + "T12:00:00Z", ...extra });
testar("Responder agora: o mais quente primeiro, e quem esfriou ou recusou no fim", () => {
  const dados = [escreveu("velho", "2026-10-24"), escreveu("ontem", "2026-11-25"), escreveu("hoje", "2026-11-26"), escreveu("semana", "2026-11-20"), escreveu("recusou", "2026-11-25", { ultima_entrada: "Não tenho interesse, obrigado" })];
  const r = filaDaVez(dados, H);
  const resp = r.itens.filter((i) => i.grupo === "responder");
  assert.deepEqual(resp.map((i) => i.lead.id), ["hoje", "ontem", "semana", "recusou", "velho"]);
  assert.equal(resp.find((i) => i.lead.id === "velho").esfriou, "tempo");
  assert.equal(resp.find((i) => i.lead.id === "recusou").esfriou, "recusou");
  assert.equal(resp.find((i) => i.lead.id === "ontem").encerrar, false);
  assert.equal(r.paraEncerrar.length, 0);
});
testar("Quer colocar no ar abre a fila, mesmo antigo", () => {
  const r = filaDaVez([escreveu("hoje", "2026-11-26"), escreveu("noar", "2026-10-01", { quer_no_ar: true })], H);
  assert.equal(r.itens[0].lead.id, "noar");
  assert.equal(r.itens[0].esfriou, undefined);
});
const recebeuBlack = (id, extra = {}) => lead(id, { estagio: "previa", origem: "trafego_pago", toques: 3, toques_entrada: 1, saidas_seguidas: 2, preco_em: "2026-11-04T12:00:00Z", black_em: "2026-11-04T12:00:00Z", ultimo_toque_em: "2026-11-04T12:00:00Z", proximo_passo: "Black: cobrar a resposta", proxima_acao_em: "2026-11-06", ...extra });
testar("A Black sem retorno é a última chamada até 30/11, não encerrar", () => {
  const r = filaDaVez([recebeuBlack("b")], H);
  assert.equal(grupoDe(r, "b"), "black");
  assert.equal(r.paraEncerrar.length, 0);
});
testar("Depois do retorno da Black, aguardando; em 01/12, para encerrar", () => {
  const voltei = recebeuBlack("v", { ultimo_toque_em: "2026-11-26T15:00:00Z", saidas_seguidas: 3 });
  const r = filaDaVez([voltei], H);
  assert.equal(grupoDe(r, "v"), null);
  assert.equal(r.aguardando, 1);
  const dez = filaDaVez([recebeuBlack("b")], "2026-12-01");
  assert.equal(grupoDe(dez, "b"), null);
  assert.deepEqual(dez.paraEncerrar.map((i) => i.lead.id), ["b"]);
  assert.equal(dez.fora.length, 0);
});
testar("Encerrar sai da lista e da conta, e vai para paraEncerrar", () => {
  const preco = lead("p", { estagio: "previa", origem: "trafego_pago", toques: 2, toques_entrada: 1, saidas_seguidas: 1, preco_em: "2026-11-01T12:00:00Z", ultimo_toque_em: "2026-11-01T12:00:00Z" });
  const r = filaDaVez([preco], H);
  assert.equal(r.itens.length, 0);
  assert.deepEqual(r.paraEncerrar.map((i) => [i.lead.id, i.grupo]), [["p", "preco"]]);
});
testar("Garimpo na lista da Black sem nenhum toque é prospecção, não amostra; depois de 30/11 ninguém é 'Mandar a Black'", () => {
  const frio = lead("frio", { estagio: "previa", origem: "prospeccao", nicho: "roupas femininas", previa_url: "https://x", proximo_passo: "Black: mandar a oferta de R$ 799" });
  const falado = lead("falado", { estagio: "previa", origem: "trafego_pago", toques: 2, toques_entrada: 1, saidas_seguidas: 1, previa_url: "https://x", ultimo_toque_em: "2026-11-25T12:00:00Z", proximo_passo: "Black: mandar a oferta de R$ 799" });
  const r = filaDaVez([frio, falado], H);
  assert.equal(grupoDe(r, "frio"), "prospeccao");
  assert.equal(grupoDe(r, "falado"), "amostra");
  assert.equal(blackPorMandar(falado, H), true);
  assert.equal(blackPorMandar(falado, "2026-12-01"), false);
});
(async () => { let falhas = 0; for (const t of testes) { try { await t.executar(); console.log("OK: " + t.nome); } catch (e) { falhas++; console.error("FALHOU: " + t.nome, e); } } console.log(`${testes.length - falhas}/${testes.length} cenários de atendimento passaram.`); if (falhas) process.exitCode = 1; })();
