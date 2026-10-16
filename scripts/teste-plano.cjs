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
const { situacaoDoDegrau, percentual, formatar } = carregar("lib/plano/tipos.ts");
const { anoDoPlano, ultimoMesConcluido, leituraMeta, notaDoMes, fonteDaMeta } = carregar("lib/plano/resumo.ts");
const hoje = "2026-10-16";
const metaBase = { id: "meta", owner_id: "dono", projeto_id: "projeto", ano: 2026, titulo: "Resultado", fonte: "manual", unidade: "un", alvo: 100, periodo: "mes", direcao: "aumentar", peso: 100, ordem: 1, created_at: "2026-01-01T12:00:00Z" };
const testes = [], testar = (nome, executar) => testes.push({ nome, executar });
function cenario({ meta = metaBase, dados, erro = null, projetos = [{ id: "projeto", owner_id: "dono" }] } = {}) {
  const escritas = [], consultas = [];
  const tabelas = { plano_metas: meta ? [meta] : [], plano_projetos: projetos };
  const banco = { from(tabela) {
    let op = "select", valores, unidade = false, filtros = [];
    const q = { select() { return q; }, eq(k, v) { filtros.push([k, v]); return q; }, limit() { return q; }, single() { unidade = true; return q; }, maybeSingle() { unidade = true; return q; }, upsert(v) { op = "upsert"; valores = v; return q; }, update(v) { op = "update"; valores = v; return q; }, insert(v) { op = "insert"; valores = v; return q; }, delete() { op = "delete"; return q; }, then(resolve, reject) { return Promise.resolve().then(() => {
      consultas.push({ tabela, filtros });
      if (op !== "select") escritas.push({ tabela, op, valores });
      const linhas = (tabelas[tabela] ?? []).filter((r) => filtros.every(([k, v]) => r[k] === v));
      return { data: unidade ? linhas[0] ?? (op === "insert" ? { id: "nova" } : null) : linhas, error: op === "select" ? null : erro };
    }).then(resolve, reject); } };
    return q;
  } };
  const acoes = carregar("app/(pt)/crm/acoes-plano.ts", {
    "@/lib/crm/supabase": { usuarioAtual: async () => ({ id: "dono" }), clienteServidor: async () => banco },
    "@/lib/crm/regras": { hojeSP: () => hoje },
    "@/lib/plano/dados": { plano: async () => dados ?? { semTabela: false, metas: [metaBase], valores: { meta: { 9: 25 } } } },
    "next/cache": { revalidatePath() {} },
  });
  return { acoes, escritas, consultas };
}
testar("Montanha não confirma um patamar atingido só no mês em andamento", () => {
  const s = situacaoDoDegrau({ nome: "Notebook", patamar: 10000, meses: 1 }, { 9: 5000, 10: 15000 }, 10, 9);
  assert.equal(s.destravado, false); assert.equal(s.provisorio, true); assert.ok(s.progresso < 1);
});
testar("Montanha confirma a conquista quando o mês está concluído", () => {
  const s = situacaoDoDegrau({ nome: "Notebook", patamar: 10000, meses: 1 }, { 9: 15000 }, 9, 9);
  assert.equal(s.destravado, true); assert.equal(s.quando, 9); assert.equal(s.progresso, 1);
});
testar("Meses consecutivos exigem continuidade e usam a sequência atual", () => {
  const s = situacaoDoDegrau({ nome: "Equipe", patamar: 10000, meses: 3 }, { 6: 15000, 7: 12000, 8: 3000, 9: 2000, 10: 5000 }, 10, 9);
  assert.equal(s.seguidos, 2); assert.equal(s.atuais, 0); assert.equal(s.destravado, false); assert.ok(s.progresso < 1 / 3);
});
testar("Montanha não soma meses separados para liberar equipe", () => {
  assert.equal(situacaoDoDegrau({ nome: "Equipe", patamar: 10000, meses: 3 }, { 1: 12000, 3: 12000, 5: 12000 }, 10, 9).destravado, false);
});
testar("Recebido negativo não produz progresso negativo ou infinito", () => {
  const s = situacaoDoDegrau({ nome: "Notebook", patamar: 10000, meses: 1 }, { 10: -6500 }, 10, 9);
  assert.equal(s.progresso, 0); assert.equal(s.provisorio, false);
  assert.equal(situacaoDoDegrau({ nome: "Marco", patamar: 100, meses: 1 }, { 10: NaN }, 10, 9).progresso, 0);
});
testar("Valores fracionários preservam os centavos no objetivo", () => {
  assert.equal(formatar(.5, "R$"), "R$ 0,50"); assert.equal(formatar(10000, "R$"), "R$ 10.000");
});
testar("Meta anual compara acumulado com alvo e ritmo, sem usar só o mês", () => {
  const m = { ...metaBase, periodo: "ano", alvo: 1200 };
  const l = leituraMeta(m, { 1: 50, 2: 150, 3: 200 }, 3);
  assert.equal(l.realizado, 400); assert.equal(l.alvo, 300); assert.equal(l.percentual, 400 / 300);
});
testar("Lacuna anual é a apurar, enquanto zero medido é um valor válido", () => {
  const m = { ...metaBase, periodo: "ano", alvo: 1200 };
  assert.equal(percentual(m, { 1: 100, 3: 100 }, 3), null);
  assert.equal(leituraMeta(m, { 1: 100, 2: 0, 3: 100 }, 3).realizado, 200);
});
testar("Vigência de outubro mantém o alvo anual civil e não cobra meses anteriores", () => {
  const m = { ...metaBase, periodo: "ano", alvo: 12000, created_at: "2026-10-01T12:00:00Z" };
  assert.equal(percentual(m, { 10: 1000 }, 10), .1);
  assert.equal(percentual(m, { 10: 1000 }, 9), null);
});
testar("Ano futuro e valores não finitos não produzem porcentagem", () => {
  assert.equal(percentual(metaBase, { 1: 10 }, 0), null);
  assert.equal(percentual(metaBase, { 1: Infinity }, 1), null);
  assert.equal(percentual({ ...metaBase, alvo: Infinity }, { 1: 10 }, 1), null);
});
testar("Nota mensal usa o mês escolhido em vez da média histórica", () => {
  assert.equal(notaDoMes([metaBase], { meta: { 1: 100, 2: 100, 9: 25 } }, 9), .25);
});
testar("Meta de redução mostra quanto precisa cortar e não quanto aumentar", () => {
  const l = leituraMeta({ ...metaBase, direcao: "reduzir", alvo: 100 }, { 10: 150 }, 10);
  assert.equal(l.falta, 50); assert.equal(l.percentual, 100 / 150);
});
testar("Ano inválido volta ao atual e mês concluído respeita o calendário", () => {
  for (const n of ["0000", "2101", "2026.5", "xx"]) assert.equal(anoDoPlano(n, hoje), 2026);
  assert.equal(anoDoPlano("2027", hoje), 2027);
  assert.equal(ultimoMesConcluido(2026, hoje), 9); assert.equal(ultimoMesConcluido(2025, hoje), 12); assert.equal(ultimoMesConcluido(2027, hoje), 0);
});
testar("Links das metas usam as áreas e filtros atuais", () => {
  assert.match(fonteDaMeta("despesas", 2026, 10).href, /aba=extrato&filtro=saidas/);
  assert.equal(fonteDaMeta("toques", 2026, 10).href, "/crm/atendimento");
  assert.match(fonteDaMeta("recebido", 2026, 10).href, /mes=2026-10/);
  assert.deepEqual(fonteDaMeta("recebido", 2027, 0), { href: "#metas", acao: "Preparar meta" });
});
testar("Prêmio incompleto é recusado sem apagar os marcos anteriores", async () => {
  const c = cenario(); const r = await c.acoes.salvarCiclo(2026, { premios: [{ nome: "", patamar: 10000, meses: 1 }] });
  assert.equal(r.ok, false); assert.deepEqual(c.escritas, []);
});
testar("Meses fracionários e mais de 12 marcos não são truncados silenciosamente", async () => {
  const c = cenario();
  assert.equal((await c.acoes.salvarCiclo(2026, { premios: [{ nome: "Equipe", patamar: 10000, meses: 1.5 }] })).ok, false);
  assert.equal((await c.acoes.salvarCiclo(2026, { premios: Array.from({ length: 13 }, () => ({ nome: "Marco", patamar: 1, meses: 1 })) })).ok, false);
  assert.deepEqual(c.escritas, []);
});
testar("Lista válida de marcos é salva inteira", async () => {
  const c = cenario(), premios = [{ nome: "Equipe", patamar: 10000, meses: 3 }];
  assert.equal((await c.acoes.salvarCiclo(2026, { premios })).ok, true); assert.deepEqual(c.escritas[0].valores.premios, premios);
});
testar("Projeções inválidas não viram vazios ou linhas perdidas", async () => {
  const c = cenario();
  assert.equal((await c.acoes.salvarCiclo(2026, { projecoes: [{ ano: 2026, faturamento: -1, caixa: 2 }] })).ok, false);
  assert.equal((await c.acoes.salvarCiclo(2026.2, { missao: "Teste" })).ok, false); assert.deepEqual(c.escritas, []);
});
testar("Fonte e peso inválidos não são ignorados ao salvar a meta", async () => {
  const c = cenario();
  assert.equal((await c.acoes.salvarMeta("meta", { peso: 5.5 })).ok, false);
  assert.equal((await c.acoes.salvarMeta("meta", { fonte: "__proto__" })).ok, false); assert.deepEqual(c.escritas, []);
});
testar("Meta não pode ser criada numa iniciativa de outro dono", async () => {
  const c = cenario({ projetos: [{ id: "projeto", owner_id: "outro" }] });
  assert.equal((await c.acoes.criarMeta("projeto", 2026, { titulo: "Teste", alvo: 10 })).ok, false); assert.deepEqual(c.escritas, []);
});
testar("Medição automática e ano errado não aceitam lançamento manual", async () => {
  let c = cenario({ meta: { ...metaBase, fonte: "recebido" } }); assert.equal((await c.acoes.lancar("meta", "2026-09-01", 100)).ok, false); assert.deepEqual(c.escritas, []);
  c = cenario(); assert.equal((await c.acoes.lancar("meta", "2025-09-01", 100)).ok, false); assert.deepEqual(c.escritas, []);
});
testar("Lançamento manual válido salva; futuro e NaN não salvam", async () => {
  const c = cenario(); assert.equal((await c.acoes.lancar("meta", "2026-09-01", 12)).ok, true); assert.equal(c.escritas[0].valores.valor, 12);
  assert.equal((await c.acoes.lancar("meta", "2027-01-01", 12)).ok, false); assert.equal((await c.acoes.lancar("meta", "2026-09-01", NaN)).ok, false); assert.equal(c.escritas.length, 1);
});
testar("Revisão do mês em andamento não é concluída", async () => {
  const c = cenario(); assert.equal((await c.acoes.fecharRmr("2026-10-01", 1, "", "")).ok, false); assert.deepEqual(c.escritas, []);
});
testar("Nota da revisão é calculada no servidor, ignorando a enviada pelo navegador", async () => {
  const c = cenario(); assert.equal((await c.acoes.fecharRmr("2026-09-01", 99, "Aprendizado", "Atender contatos")).ok, true); assert.equal(c.escritas[0].valores.nota, .25);
});
testar("Medição pendente impede fechar revisão sem gravar uma nota enganosa", async () => {
  const c = cenario({ dados: { semTabela: false, metas: [metaBase], valores: {} } }); assert.equal((await c.acoes.fecharRmr("2026-09-01", 1, "", "")).ok, false); assert.deepEqual(c.escritas, []);
});
testar("Apagar iniciativa com metas não apaga o histórico em cascata", async () => {
  const c = cenario(); assert.equal((await c.acoes.apagarProjeto("projeto")).ok, false); assert.deepEqual(c.escritas, []);
});
testar("Erro de validação não é confundido com tabela ausente", async () => {
  const c = cenario({ erro: { code: "23514", message: "plano_metas constraint" } }); const r = await c.acoes.salvarMeta("meta", { alvo: 10 }); assert.equal(r.ok, false); assert.ok(!r.erro.includes("tabelas"));
});
testar("Instalação incompleta das tabelas do Plano mostra estado de configuração", async () => {
  const dados = carregar("lib/plano/dados.ts", {
    "@/lib/crm/supabase": { clienteServidor: async () => ({ from() { const q = { select() { return q; }, eq() { return q; }, maybeSingle: async () => ({ data: null, error: null }) }; return q; } }) },
    "@/lib/financeiro/dados": { financeiro: async () => { throw Error("Não deve carregar fontes antes de conferir tabelas"); } },
    "@/lib/projetos/dados": { projetos: async () => ({ projetos: [] }) },
    "@/lib/sistema/consultas": { tabelaAusente: (e) => e?.code === "42P01", lerTodos: async (_, tabela) => { if (tabela === "plano_medicoes") throw Object.assign(Error("ausente"), { code: "42P01" }); return []; } },
  });
  assert.deepEqual(await dados.plano(2026, 10), { semTabela: true });
});
(async () => { let falhas = 0; for (const t of testes) { try { await t.executar(); console.log("OK: " + t.nome); } catch (e) { falhas++; console.error("FALHOU: " + t.nome, e); } } console.log(`${testes.length - falhas}/${testes.length} cenários do Plano passaram.`); if (falhas) process.exitCode = 1; })();
