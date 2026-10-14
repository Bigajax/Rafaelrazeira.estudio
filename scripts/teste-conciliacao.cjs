const fs = require("node:fs"),
  path = require("node:path"),
  Module = require("node:module"),
  assert = require("node:assert/strict"),
  ts = require("typescript");
const dir = path.resolve(".tmp/teste-conciliacao");
fs.mkdirSync(dir, { recursive: true });
for (const nome of ["processar", "conciliacao"])
  fs.writeFileSync(
    path.join(dir, nome + ".js"),
    ts.transpileModule(
      fs.readFileSync("lib/mercadopago/" + nome + ".js", "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText,
  );
let receipt = null,
  acessos = new Set(),
  falharCaixa = false,
  lojaExiste = true,
  movimentos = [],
  fila = [],
  refunds = [];
const response = (ok, body = {}, status = ok ? 200 : 500) => ({
  ok,
  status,
  json: async () => body,
});
const supabaseREST = async (url, opts = {}) => {
  const body = opts.body ? JSON.parse(opts.body) : null;
  if (url === "rpc/crm_integracao_estado") {
    fila.push(body);
    return response(true);
  }
  if (url.startsWith("perf_lojas?"))
    return response(true, lojaExiste ? [{ lead_id: "lead" }] : []);
  if (url === "rpc/perf_registrar_pagamento") {
    const novo = !acessos.has(body.p_payment);
    acessos.add(body.p_payment);
    return response(true, { novo });
  }
  if (url.startsWith("crm_recebimentos?"))
    return response(true, receipt ? [receipt] : []);
  if (url === "crm_recebimentos") {
    if (falharCaixa) {
      falharCaixa = false;
      return response(false);
    }
    receipt = { ...body, id: "r" };
    return response(true);
  }
  if (url === "rpc/crm_sincronizar_devolucoes") {
    movimentos = body.p_movimentos;
    return response(true);
  }
  throw Error("Consulta não prevista no teste: " + url);
};
const oldLoad = Module._load,
  oldFetch = global.fetch;
Module._load = function (request, ...rest) {
  if (request === "@/lib/supabase-rest") return { supabaseREST };
  if (request === "@/lib/oferta-performance")
    return {
      DEGRAUS: {},
      UPGRADES: {},
      PLANOS_PERFORMANCE: { mensal: { valor: 100, dias: 30 } },
    };
  return oldLoad.call(this, request, ...rest);
};
global.fetch = async () => response(true, refunds);
(async () => {
  const { processarPagamento } = require(path.join(dir, "processar.js"));
  const pg = {
    id: 123,
    status: "approved",
    external_reference: "perf:loja:mensal:request",
    transaction_amount: 100,
    date_approved: "2026-08-01T14:00:00Z",
    transaction_details: { net_received_amount: 98 },
    payment_method_id: "pix",
  };
  falharCaixa = true;
  await assert.rejects(processarPagamento("owner", pg));
  assert.equal(fila.at(-1).p_estado, "pendente");
  await processarPagamento("owner", pg);
  await processarPagamento("owner", pg);
  assert.equal(acessos.size, 1);
  assert.equal(receipt.valor, 100);
  assert.equal(fila.at(-1).p_estado, "concluido");
  receipt = null;
  acessos.clear();
  lojaExiste = false;
  await assert.rejects(processarPagamento("owner", pg));
  assert.equal(acessos.size, 0);
  lojaExiste = true;
  receipt = null;
  refunds = [
    {
      id: 1,
      status: "approved",
      amount: 20,
      date_created: "2026-09-01T01:30:00Z",
    },
  ];
  await processarPagamento("owner", {
    ...pg,
    status: "approved",
    transaction_amount_refunded: 20,
  });
  assert.equal(movimentos[0].dia, "2026-08-31");
  assert.equal(acessos.size, 0);
  refunds = [];
  await assert.rejects(
    processarPagamento("owner", { ...pg, status: "refunded" }),
  );
  assert.equal(fila.at(-1).p_estado, "pendente");
  const q = fila.length;
  assert.equal(
    (await processarPagamento("owner", { ...pg, status: "cancelled" }))
      .ignorado,
    "cancelled",
  );
  assert.equal(fila.length, q);
  console.log(
    "Conciliação: falha de Caixa recuperável, acesso idempotente, dono da loja conferido, devolução datada e cancelamento sem devolução presumida.",
  );
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => {
    Module._load = oldLoad;
    global.fetch = oldFetch;
  });
