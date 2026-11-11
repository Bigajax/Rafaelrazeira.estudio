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
const { filaDaVez, cobrancaNaVez } = carregar("lib/crm/atendimento.ts");
const divida = { parcela_id: "p", rotulo: "Entrada", valor: 199, saldo: 199, vence_em: "2026-10-06", quando: "2026-10-06", metodo_previsto: null, contrato_titulo: "c" };
const grupoDe = (r, id) => r.itens.find((i) => i.lead.id === id)?.grupo ?? null;
testar("Cobrança nunca feita fica na fila, mesmo com retorno no futuro", () => {
  const l = lead("a", { estagio: "previa", cobranca: divida, toques: 1, saidas_seguidas: 1, ultimo_toque_em: "2026-10-01T12:00:00Z", proxima_acao_em: "2026-12-01" });
  assert.equal(cobrancaNaVez(l, hoje), true);
  assert.equal(grupoDe(filaDaVez([l], hoje), "a"), "responder");
});
testar("Cobrança feita sai da fila até o retorno marcado, e sem cair em 'encerrar'", () => {
  const l = lead("a", { estagio: "previa", cobranca: divida, preco_em: "2026-10-01T12:00:00Z", toques: 3, saidas_seguidas: 2, ultimo_toque_em: "2026-10-16T12:00:00Z", proxima_acao_em: "2026-10-18" });
  const r = filaDaVez([l], hoje);
  assert.equal(grupoDe(r, "a"), null);
  assert.equal(r.aguardando, 1);
  assert.equal(grupoDe(filaDaVez([l], "2026-10-18"), "a"), "responder");
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
(async () => { let falhas = 0; for (const t of testes) { try { await t.executar(); console.log("OK: " + t.nome); } catch (e) { falhas++; console.error("FALHOU: " + t.nome, e); } } console.log(`${testes.length - falhas}/${testes.length} cenários de atendimento passaram.`); if (falhas) process.exitCode = 1; })();
