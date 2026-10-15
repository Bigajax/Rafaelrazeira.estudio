const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const ts = require("typescript");

function carregar(arquivo, substitutos = {}) {
  const cache = new Map();
  function ler(nome, pai = path.resolve("entrada.js")) {
    if (Object.hasOwn(substitutos, nome)) return substitutos[nome];
    if (!nome.startsWith("@/") && !nome.startsWith(".")) return require(nome);
    const base = nome.startsWith("@/") ? path.resolve(nome.slice(2)) : path.resolve(path.dirname(pai), nome);
    const alvo = [base, base + ".ts", base + ".tsx"].find((p) => fs.existsSync(p));
    if (!alvo) throw Error("Módulo ausente: " + nome);
    if (cache.has(alvo)) return cache.get(alvo).exports;
    const modulo = { exports: {} }; cache.set(alvo, modulo);
    const codigo = ts.transpileModule(fs.readFileSync(alvo, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    new Function("require", "module", "exports", codigo)((nome) => ler(nome, alvo), modulo, modulo.exports);
    return modulo.exports;
  }
  return ler("@/" + arquivo);
}
const testes = [];
const testar = (nome, executar) => testes.push({ nome, executar });
const op = carregar("lib/financeiro/operacao.ts");
const hoje = "2026-10-15";
const despesa = { id: "d", ocorrencia_id: "c", nome: "Hospedagem", valor: 40, pago_em: hoje, moeda_original: "BRL", valor_original: 40 };
const conta = { id: "c", custo_id: "custo", descricao: "Hospedagem", vence_em: "2026-10-14", moeda: "BRL", valor: 100 };
testar("Pagamento parcial reduz a conta e preserva a prioridade do vencimento", () => {
  const [c] = op.contasAPagar([conta], [despesa], hoje);
  assert.equal(c.saldo, 60); assert.equal(c.situacao, "vencida");
  assert.equal(op.situacaoConta(100, 60, "2026-10-20", hoje), "parcial");
});
testar("Conta quitada sai das pendências e fica paga", () => {
  const contas = op.contasAPagar([conta], [{ ...despesa, valor: 100 }], hoje);
  assert.equal(contas[0].situacao, "paga");
  assert.equal(op.pendenciasFinanceiras([], contas, hoje).pagarVencido.length, 0);
});
testar("Pagamento em dólar reduz o saldo na moeda original", () => {
  const [c] = op.contasAPagar([{ ...conta, moeda: "USD" }], [{ ...despesa, valor: 200, valor_original: 40, moeda_original: "USD" }], hoje);
  assert.equal(c.saldo, 60);
});
testar("Semana inclui hoje e o sétimo dia, separando contas vencidas", () => {
  const contas = op.contasAPagar([conta, ...["2026-10-15", "2026-10-22", "2026-10-23"].map((vence_em) => ({ ...conta, id: vence_em, vence_em }))], [], hoje);
  const p = op.pendenciasFinanceiras([], contas, hoje);
  assert.equal(p.pagarVencido.length, 1); assert.equal(p.pagarSemana.length, 2);
});
testar("Líquido parcial confirmado nunca inclui pagamentos com taxa desconhecida", () => {
  assert.deepEqual(op.liquidoConfirmado([{ valor: 100, valor_liquido: 97 }, { valor: 200, valor_liquido: null }, { valor: 50, valor_liquido: 0 }]), { valor: 97, pendentes: 1 });
});
testar("Extrato usa a data local e inclui devolução posterior no mês correto", () => {
  const entradas = [{ id: "r", valor: 100, valor_liquido: 97, recebido_em: "2026-10-01T01:30:00Z", estornado_em: "2026-10-04" }];
  const extrato = op.extratoFinanceiro("2026-10", entradas, [despesa], []);
  assert.equal(extrato.filter((x) => x.tipo === "entrada").length, 0);
  assert.equal(extrato.find((x) => x.tipo === "devolucao").valor, 100);
  assert.equal(extrato[0].data, hoje);
});
testar("Extrato não duplica devolução parcial seguida de integral", () => {
  const entradas = [{ id: "r", valor: 100, valor_liquido: 97, recebido_em: "2026-09-01", estornado_em: "2026-10-04" }];
  const extrato = op.extratoFinanceiro("2026-10", entradas, [], [{ id: "dev", recebimento_id: "r", valor: 30, devolvido_em: "2026-10-02" }]);
  assert.equal(extrato.reduce((s, x) => s + x.valor, 0), 100);
  assert.equal(extrato.length, 2);
});
testar("Links e abas antigas continuam apontando para as áreas novas", () => {
  assert.equal(op.areaFinanceiro("custos"), "planejamento");
  assert.equal(op.areaFinanceiro("previsao"), "planejamento");
  assert.equal(op.areaFinanceiro("despesas"), "extrato");
  assert.equal(op.areaFinanceiro("contratos"), "receber");
  assert.equal(op.areaFinanceiro("desconhecida"), "visao");
  assert.equal(op.urlFinanceiro("2026-10", "receber", { filtro: "vencidas" }), "/crm/financeiro?mes=2026-10&aba=receber&filtro=vencidas");
});

const usuario = "11111111-1111-4111-8111-111111111111";
const request = "22222222-2222-4222-8222-222222222222";
function cenario({ falharAgenda = false, logado = true } = {}) {
  const tabelas = { fin_custos: [], fin_ocorrencias: [], crm_recebimentos: [], crm_parcelas: [{ id: "parcela", lead_id: "cliente" }] };
  const escritas = [];
  const banco = { from(tabela) {
    let operacao = "select", valores, opcoes, unidade = false;
    const filtros = [];
    const q = {
      select() { return q; }, eq(k, v) { filtros.push([k, v]); return q; }, single() { unidade = true; return q; }, maybeSingle() { unidade = true; return q; },
      upsert(v, o) { operacao = "upsert"; valores = v; opcoes = o; return q; },
      insert(v) { operacao = "insert"; valores = v; return q; },
      then(resolve, reject) { return Promise.resolve().then(() => {
        if (operacao === "select") {
          const rows = (tabelas[tabela] ?? []).filter((r) => filtros.every(([k, v]) => r[k] === v));
          return { data: unidade ? rows[0] ?? null : rows, error: null };
        }
        escritas.push({ tabela, valores });
        if (tabela === "fin_ocorrencias" && falharAgenda) { falharAgenda = false; return { error: { code: "503", message: "Falha simulada" } }; }
        for (const v of [valores].flat()) {
          const chaves = opcoes?.onConflict?.split(",") ?? [];
          const existente = chaves.length && tabelas[tabela].find((r) => chaves.every((k) => r[k] === v[k]));
          if (!existente) tabelas[tabela].push({ ...v });
        }
        return { data: null, error: null };
      }).then(resolve, reject); },
    };
    return q;
  } };
  const regras = carregar("lib/crm/regras.ts");
  const stubs = {
    "@/lib/crm/supabase": { usuarioAtual: async () => logado ? { id: usuario } : null, clienteServidor: async () => banco },
    "@/lib/crm/regras": { ...regras, hojeSP: () => hoje },
    "next/cache": { revalidatePath() {} }, "next/navigation": { redirect() { throw Error("Sem sessão"); } },
  };
  return { tabelas, escritas, financeiro: carregar("app/(pt)/crm/acoes-financeiro.ts", stubs), crm: carregar("app/(pt)/crm/acoes.ts", stubs) };
}
const cadastro = { request_id: request, nome: "Hospedagem", categoria: "ferramenta", moeda: "BRL", valor: 100, frequencia: "mensal", primeiro_vencimento: "2027-01-31", quantas: 3 };
testar("Um cadastro gera a conta e vencimentos sem pular fevereiro", async () => {
  const c = cenario(); assert.equal((await c.financeiro.criarCompromisso(cadastro)).ok, true);
  assert.equal(c.tabelas.fin_custos.length, 1);
  assert.deepEqual(c.tabelas.fin_ocorrencias.map((r) => r.vence_em), ["2027-01-31", "2027-02-28", "2027-03-31"]);
});
testar("Repetir o cadastro não duplica conta nem vencimentos", async () => {
  const c = cenario(); await c.financeiro.criarCompromisso(cadastro); await c.financeiro.criarCompromisso(cadastro);
  assert.equal(c.tabelas.fin_custos.length, 1); assert.equal(c.tabelas.fin_ocorrencias.length, 3);
});
testar("Falha da agenda permite retomar o mesmo cadastro", async () => {
  const c = cenario({ falharAgenda: true });
  assert.equal((await c.financeiro.criarCompromisso(cadastro)).ok, false);
  assert.equal(c.tabelas.fin_custos.length, 1); assert.equal(c.tabelas.fin_ocorrencias.length, 0);
  assert.equal((await c.financeiro.criarCompromisso(cadastro)).ok, true);
  assert.equal(c.tabelas.fin_custos.length, 1); assert.equal(c.tabelas.fin_ocorrencias.length, 3);
});
testar("Alterar valor ou datas de pedido já concluído preserva os registros", async () => {
  const c = cenario(); await c.financeiro.criarCompromisso(cadastro);
  assert.equal((await c.financeiro.criarCompromisso({ ...cadastro, valor: 200 })).ok, false);
  assert.equal((await c.financeiro.criarCompromisso({ ...cadastro, primeiro_vencimento: "2027-01-30" })).ok, false);
  assert.equal(c.tabelas.fin_custos[0].valor, 100); assert.equal(c.tabelas.fin_ocorrencias.length, 3);
});
for (const campos of [{ primeiro_vencimento: "2026-02-30" }, { quantas: 25 }, { frequencia: "inexistente" }, { valor: -1 }]) {
  testar("Cadastro inválido não deixa conta parcial: " + JSON.stringify(campos), async () => {
    const c = cenario(); assert.equal((await c.financeiro.criarCompromisso({ ...cadastro, ...campos })).ok, false);
    assert.equal(c.escritas.length, 0);
  });
}
testar("Cadastro de conta exige sessão", async () => {
  const c = cenario({ logado: false }); assert.equal((await c.financeiro.criarCompromisso(cadastro)).ok, false); assert.equal(c.escritas.length, 0);
});
testar("Reenviar recebimento com o mesmo identificador grava uma única entrada", async () => {
  const c = cenario(); const dados = { request_id: request, parcela_id: "parcela", valor: 100, recebido_em: hoje, valor_liquido: 100 };
  assert.equal((await c.crm.lancarRecebimento(dados)).ok, true); assert.equal((await c.crm.lancarRecebimento(dados)).ok, true);
  assert.equal(c.tabelas.crm_recebimentos.length, 1); assert.equal(c.tabelas.crm_recebimentos[0].lead_id, "cliente");
});
testar("Recebimento rejeita identificação, data e líquido inválidos", async () => {
  for (const mudanca of [{ request_id: "inválido" }, { recebido_em: "2026-02-30" }, { recebido_em: "2026-10-16" }, { valor_liquido: 101 }]) {
    const c = cenario(); assert.equal((await c.crm.lancarRecebimento({ request_id: request, valor: 100, recebido_em: hoje, ...mudanca })).ok, false); assert.equal(c.escritas.length, 0);
  }
});
testar("Dados alterados após confirmação perdida não sobrescrevem nem duplicam recebimento", async () => {
  const c = cenario();
  const dados = { request_id: request, parcela_id: "parcela", valor: 100, recebido_em: hoje, metodo: "pix", valor_liquido: 100 };
  await c.crm.lancarRecebimento(dados);
  assert.equal((await c.crm.lancarRecebimento({ ...dados, valor: 200 })).ok, false);
  assert.equal(c.tabelas.crm_recebimentos.length, 1);
  assert.equal(c.tabelas.crm_recebimentos[0].valor, 100);
});
(async () => {
  let falhas = 0;
  for (const { nome, executar } of testes) {
    try { await executar(); console.log("OK: " + nome); }
    catch (e) { falhas++; console.error("FALHOU: " + nome + "\n" + e.stack); }
  }
  console.log(`${testes.length - falhas}/${testes.length} cenários do financeiro passaram.`);
  if (falhas) process.exitCode = 1;
})();
