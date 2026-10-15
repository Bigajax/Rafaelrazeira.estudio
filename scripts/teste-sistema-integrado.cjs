const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const assert = require("node:assert/strict");
const ts = require("typescript");

// Compila somente as funções puras para uma pasta temporária; nenhum acesso ao banco.
const dir = path.resolve(".tmp/testes-sistema");
const arquivos = [
  "lib/sistema/metas.ts",
  "lib/sistema/atrasos.ts",
  "lib/sistema/historico.ts",
  "lib/financeiro/ocorrencias.ts",
  "lib/projetos/dados.ts",
  "lib/caixa/recebimentos.ts",
  "lib/projetos/tipos.ts",
  "lib/sistema/consultas.ts",
  "lib/sistema/calendario.ts",
  "lib/sistema/indicadores.ts",
  "lib/sistema/comercial.ts",
  "lib/sistema/contratos.ts",
  "lib/financeiro/tipos.ts",
  "lib/plano/tipos.ts",
  "lib/crm/financeiro.ts",
  "lib/crm/regras.ts",
  "lib/crm/tipos.ts",
];
for (const file of arquivos) {
  const dest = path.join(dir, file.replace(/\.ts$/, ".js"));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(
    dest,
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
  );
}
const resolver = Module._resolveFilename;
const carregar = Module._load;
Module._load = function (request, parent, ...args) {
  if (request === "@/lib/crm/supabase")
    return {
      clienteServidor: () => {
        throw new Error("Teste puro não acessa o banco.");
      },
    };
  return carregar.call(this, request, parent, ...args);
};
Module._resolveFilename = function (request, parent, ...args) {
  return resolver.call(
    this,
    request.startsWith("@/") ? path.join(dir, request.slice(2)) : request,
    parent,
    ...args,
  );
};
const { diaLocal, mesLocal, limitesAno, dataValida } = require(
  path.join(dir, "lib/sistema/calendario.js"),
);
const { apurarMes, valorRetido } = require(
  path.join(dir, "lib/sistema/indicadores.js"),
);
const { custoNoMes, resultadoDoMes } = require(
  path.join(dir, "lib/financeiro/tipos.js"),
);
const { percentual } = require(path.join(dir, "lib/plano/tipos.js"));
const { avancouLead } = require(path.join(dir, "lib/sistema/comercial.js"));
const { validarContrato } = require(path.join(dir, "lib/sistema/contratos.js"));
const { caixaDo } = require(path.join(dir, "lib/projetos/dados.js"));

assert.equal(diaLocal("2027-01-01T01:30:00Z"), "2026-12-31");
assert.equal(mesLocal("2026-10-01T01:30:00Z"), "2026-09");
assert.equal(diaLocal("2026-10-01"), "2026-10-01");
assert.equal(limitesAno(2026).fim, "2027-01-01");
assert.equal(dataValida("2026-02-30"), false);
const rs = [
  { id: "entrada", valor: 199, valor_liquido: 199, recebido_em: "2026-08-01" },
  { id: "saldo", valor: 800, valor_liquido: 780, recebido_em: "2026-09-01" },
];
const venda = [{ valor: 999, quando: "2026-08-01" }];
assert.equal(apurarMes("2026-08", rs, [], [], venda).bruto, 199);
assert.equal(apurarMes("2026-08", rs, [], [], venda).vendido, 999);
assert.equal(apurarMes("2026-09", rs, [], [], venda).vendido, 0);
assert.equal(apurarMes("2026-09", rs, [], [], venda).liquido, 780);
const desconhecido = [{ ...rs[0], valor_liquido: null }];
assert.equal(apurarMes("2026-08", desconhecido, [], []).saldo, null);
assert.equal(apurarMes("2026-08", desconhecido, [], []).taxasPendentes, 1);
const custo = {
  id: "usd",
  nome: "Ferramenta",
  categoria: "ferramenta",
  valor: 20,
  moeda: "USD",
  frequencia: "mensal",
  inicio: "2026-08-01",
  fim: null,
  estimado: false,
  nota: null,
};
assert.equal(custoNoMes(custo, "2026-08", null), null);
assert.equal(custoNoMes(custo, "2026-07", null), 0);
assert.equal(resultadoDoMes("2026-08", rs, [custo], null).resultado, null);
const estornado = [{ ...rs[0], estornado_em: "2026-09-03" }];
assert.equal(apurarMes("2026-08", estornado, [], []).bruto, 199);
assert.equal(apurarMes("2026-09", estornado, [], []).devolvido, 199);
const devolucoes = [
  {
    id: "dev",
    recebimento_id: "entrada",
    valor: 99,
    devolvido_em: "2026-09-03",
  },
];
assert.equal(apurarMes("2026-09", rs, [], devolucoes).devolvido, 99);
const parcialDepoisIntegral = [{ ...rs[0], estornado_em: "2026-10-05" }];
assert.equal(
  apurarMes("2026-09", parcialDepoisIntegral, [], devolucoes).devolvido,
  99,
);
assert.equal(
  apurarMes("2026-10", parcialDepoisIntegral, [], devolucoes).devolvido,
  100,
);
assert.equal(valorRetido({ ...rs[0], valor_estornado: 99 }), 100);
assert.equal(valorRetido({ ...rs[0], estornado_em: "2026-09-03" }), 0);
const despesa = [
  {
    id: "d",
    nome: "Ferramenta",
    categoria: "ferramenta",
    valor: 100,
    pago_em: "2026-09-15",
    custo_id: null,
    moeda_original: "USD",
    valor_original: 20,
    notas: null,
  },
];
assert.equal(apurarMes("2026-09", rs, despesa, devolucoes).saldo, 581);
assert.equal(
  percentual({ alvo: 100, periodo: "mes", direcao: "reduzir" }, { 9: 200 }, 9),
  0.5,
);
assert.equal(
  percentual({ alvo: 100, periodo: "mes", direcao: "reduzir" }, { 9: 0 }, 9),
  1.2,
);
assert.equal(percentual({ alvo: 100, periodo: "mes" }, {}, 9), null);
const eventos = [
  {
    id: "h",
    lead_id: "l",
    etapa: "perdido",
    anterior: "proposta",
    motivo: "preco",
    ocorrido_em: "2026-09-01",
    inicial: false,
  },
];
assert.equal(
  avancouLead({ id: "l", estagio: "perdido" }, eventos, "proposta"),
  true,
);
assert.equal(
  avancouLead({ id: "l", estagio: "perdido" }, eventos, "ganho"),
  false,
);
assert.equal(
  avancouLead({ id: "l", estagio: "lista" }, null, "conversa"),
  false,
);
assert.equal(
  validarContrato({
    titulo: "Vitrine",
    valor_total: 999,
    parcelas: [{ numero: 1, valor: 999, vence_em: "2026-10-01" }],
  }),
  null,
);
assert.ok(
  validarContrato({
    titulo: "Vitrine",
    valor_total: NaN,
    parcelas: [{ numero: 1, valor: 999, vence_em: "2026-10-01" }],
  }),
);
assert.ok(
  validarContrato({
    titulo: "Vitrine",
    valor_total: 999,
    parcelas: [{ numero: 1, valor: 999, vence_em: "2026-02-30" }],
  }),
);
const contratos = [
  {
    id: "p1",
    lead_id: "cliente",
    tipo: "projeto",
    status: "ativo",
    valor_total: 999,
  },
  {
    id: "p2",
    lead_id: "cliente",
    tipo: "projeto",
    status: "ativo",
    valor_total: 1499,
  },
  {
    id: "mensal",
    lead_id: "cliente",
    tipo: "recorrencia",
    status: "ativo",
    valor_total: null,
  },
];
const parcelas = [
  {
    id: "a",
    lead_id: "cliente",
    contrato_id: "p1",
    numero: 1,
    valor: 199,
    vence_em: "2026-08-01",
    cancelada_em: null,
  },
  {
    id: "b",
    lead_id: "cliente",
    contrato_id: "p1",
    numero: 2,
    valor: 800,
    vence_em: "2026-09-01",
    cancelada_em: null,
  },
  {
    id: "c",
    lead_id: "cliente",
    contrato_id: "p2",
    numero: 1,
    valor: 1499,
    vence_em: "2026-09-01",
    cancelada_em: null,
  },
  {
    id: "d",
    lead_id: "cliente",
    contrato_id: "mensal",
    numero: 1,
    valor: 79,
    vence_em: "2026-09-01",
    cancelada_em: null,
  },
];
const pagos = [
  {
    id: "r1",
    lead_id: "cliente",
    parcela_id: "a",
    valor: 199,
    estornado_em: null,
  },
  {
    id: "r2",
    lead_id: "cliente",
    parcela_id: "c",
    valor: 600,
    estornado_em: null,
  },
  {
    id: "r3",
    lead_id: "cliente",
    parcela_id: "d",
    valor: 79,
    estornado_em: null,
  },
];
assert.equal(caixaDo("cliente", contratos, parcelas, pagos, "p1").total, 999);
assert.equal(caixaDo("cliente", contratos, parcelas, pagos, "p1").pago, 199);
assert.equal(
  caixaDo("cliente", contratos, parcelas, pagos, "p1").entrada,
  true,
);
assert.equal(caixaDo("cliente", contratos, parcelas, pagos, "p2").pago, 600);
assert.equal(caixaDo("cliente", contratos, parcelas, pagos).total, 2498);
assert.equal(caixaDo("cliente", contratos, parcelas, pagos).pago, 799);
assert.equal(
  caixaDo(
    "cliente",
    contratos.filter((c) => c.tipo === "recorrencia"),
    parcelas,
    pagos,
  ).contrato,
  false,
);
const { valoresDaMeta } = require(path.join(dir, "lib/sistema/metas.js"));
const { datasDoCompromisso, saldoDaOcorrencia, previstoNoMes } = require(
  path.join(dir, "lib/financeiro/ocorrencias.js"),
);
const { faixaDoAtraso } = require(path.join(dir, "lib/sistema/atrasos.js"));
const { paginarHistorico } = require(
  path.join(dir, "lib/sistema/historico.js"),
);
const metaOutubro = {
  ano: 2026,
  created_at: "2026-10-01T14:00:00Z",
  alvo: 12000,
  periodo: "ano",
  direcao: "aumentar",
};
const valoresOutubro = valoresDaMeta(
  metaOutubro,
  { 8: 1000, 9: 1000, 10: 1000 },
  10,
);
assert.deepEqual(valoresOutubro, { 10: 1000 });
assert.equal(percentual(metaOutubro, valoresOutubro, 10), 0.1);
assert.deepEqual(
  valoresDaMeta({ ...metaOutubro, ano: 2025 }, { 1: 10 }, 12),
  {},
);
assert.deepEqual(datasDoCompromisso("2027-01-31", "mensal", 3), [
  "2027-01-31",
  "2027-02-28",
  "2027-03-31",
]);
assert.deepEqual(datasDoCompromisso("2028-02-29", "anual", 2), [
  "2028-02-29",
  "2029-02-28",
]);
assert.deepEqual(datasDoCompromisso("2026-12-29", "semanal", 2), [
  "2026-12-29",
  "2027-01-05",
]);
assert.throws(() => datasDoCompromisso("2026-02-30", "mensal", 1));
const ocorrencia = {
  id: "o1",
  custo_id: "c1",
  valor: 100,
  moeda: "USD",
  vence_em: "2026-10-01",
};
const pagamentoOcorrencia = [
  { ocorrencia_id: "o1", valor: 150, valor_original: 30 },
];
assert.equal(saldoDaOcorrencia(ocorrencia, pagamentoOcorrencia), 70);
assert.equal(
  previstoNoMes("2026-10", [ocorrencia], pagamentoOcorrencia, 5),
  350,
);
assert.equal(
  previstoNoMes("2026-10", [ocorrencia], pagamentoOcorrencia, null),
  null,
);
assert.equal(
  previstoNoMes(
    "2026-10",
    [ocorrencia],
    [{ ocorrencia_id: "o1", valor_original: 100 }],
    null,
  ),
  0,
);
assert.equal(faixaDoAtraso("2026-10-13", "2026-10-14"), "1-7");
assert.equal(faixaDoAtraso("2026-10-06", "2026-10-14"), "8-30");
assert.equal(faixaDoAtraso("2026-10-14", "2026-10-14"), null);
const eventosFake = Array.from({ length: 40 }, (_, i) => ({
  id: String(i),
  tipo: i % 2 ? "financeiro" : "etapas",
  quando: "2026-10-" + String((i % 14) + 1).padStart(2, "0"),
}));
assert.equal(paginarHistorico(eventosFake, "financeiro", 1, 10).total, 20);
assert.equal(
  paginarHistorico(eventosFake, undefined, 2, 30).eventos.length,
  10,
);
console.log(
  "Revisão: vigência única das metas, vencimentos mensais/anuais/semanais, pagamentos parciais, câmbio ausente, atrasos e paginação do histórico.",
);
console.log(
  "Passou: calendário, caixa, taxas desconhecidas, câmbio, devoluções, despesas, metas, histórico e validação de contratos.",
);
