const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const ts = require("typescript");

function carregar(arquivo, substitutos = {}) {
  const cache = new Map();
  function ler(nome, pai = path.resolve("entrada.js")) {
    if (Object.hasOwn(substitutos, nome)) return substitutos[nome];
    if (!nome.startsWith("@/") && !nome.startsWith(".")) return require(nome);
    const base = nome.startsWith("@/")
      ? path.resolve(nome.slice(2))
      : path.resolve(path.dirname(pai), nome);
    const alvo = [base, base + ".ts", base + ".tsx"].find((p) =>
      fs.existsSync(p),
    );
    if (!alvo) throw Error("Módulo ausente: " + nome);
    if (cache.has(alvo)) return cache.get(alvo).exports;
    const modulo = { exports: {} };
    cache.set(alvo, modulo);
    const codigo = ts.transpileModule(fs.readFileSync(alvo, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText;
    new Function("require", "module", "exports", codigo)(
      (nome) => ler(nome, alvo),
      modulo,
      modulo.exports,
    );
    return modulo.exports;
  }
  return ler("@/" + arquivo);
}
const op = carregar("lib/caixa/operacao.ts"),
  rec = carregar("lib/caixa/recebimentos.ts");
const testes = [];
const testar = (nome, f) => testes.push({ nome, f });
const hoje = "2026-10-15",
  id = (n) => "00000000-0000-4000-8000-" + String(n).padStart(12, "0");
const parcela = (n, extra = {}) => ({
  id: id(n),
  lead_id: id(10),
  contrato_id: id(20),
  valor: 1000,
  recebido: 200,
  vence_em: "2026-10-10",
  cobrar_em: null,
  cancelada_em: null,
  rotulo: `Parcela ${n}`,
  lead_nome: "Loja",
  contrato_titulo: "Projeto",
  ...extra,
});
const entrada = (extra = {}) => ({
  id: id(40),
  owner_id: id(1),
  lead_id: id(10),
  parcela_id: id(30),
  valor: 200,
  valor_liquido: 195,
  recebido_em: hoje,
  metodo: "pix",
  origem: "manual",
  estornado_em: null,
  valor_estornado: 0,
  bruto: null,
  ...extra,
});
testar("Parcial reduz 1000 para 800 e depois 500 sem supor quitação", () => {
  assert.equal(op.saldoParcela(parcela(30)), 800);
  assert.equal(op.saldoParcela(parcela(30, { recebido: 500 })), 500);
});
testar(
  "Adiar sai da fila de contato, mas permanece no atraso financeiro",
  () => {
    const ps = [parcela(30, { cobrar_em: "2026-10-20" })];
    assert.equal(op.filaCobranca(ps, hoje).length, 0);
    assert.equal(op.resumoCaixa(ps, [], [], "2026-09", hoje).vencido, 800);
  },
);
testar("Fila agrupa cliente e ordena por lembrete e vencimento", () => {
  const fila = op.filaCobranca(
    [
      parcela(30),
      parcela(31, { vence_em: "2026-10-14" }),
      parcela(32, { lead_id: id(11), cobrar_em: "2026-10-01" }),
    ],
    hoje,
  );
  assert.equal(fila.length, 2);
  assert.equal(fila[0].lead_id, id(11));
  assert.equal(fila[1].saldo, 1600);
});
testar("Recebimento antigo não quita parcelas do período consultado", () => {
  const r = op.resumoCaixa(
    [parcela(30)],
    [entrada({ valor: 1200 })],
    [],
    "2026-10",
    hoje,
  );
  assert.equal(r.bruto, 1200);
  assert.equal(r.vencido, 800);
});
testar(
  "Devolução posterior pertence ao dia da devolução, não ao recebimento",
  () => {
    const rs = [entrada({ recebido_em: "2026-09-01", valor: 1000 })],
      ds = [
        { id: id(90), recebimento_id: id(40), devolvido_em: hoje, valor: 200 },
      ];
    assert.equal(op.resumoCaixa([], rs, ds, "2026-09", hoje).recebido, 1000);
    assert.equal(op.resumoCaixa([], rs, ds, "2026-10", hoje).recebido, -200);
  },
);
testar(
  "Líquido incompleto permanece identificado e não presume taxas zero",
  () => {
    const r = op.resumoCaixa(
      [],
      [entrada(), entrada({ id: id(41), valor_liquido: null })],
      [],
      "2026-10",
      hoje,
    );
    assert.equal(r.liquidoConhecido, 195);
    assert.equal(r.taxasPendentes, 1);
  },
);
testar("Agenda usa vencimento e separa vencido, hoje, 7 e 30 dias", () => {
  const ps = [
    parcela(30),
    parcela(31, { vence_em: hoje }),
    parcela(32, { vence_em: "2026-10-22" }),
    parcela(33, { vence_em: "2026-11-14" }),
    parcela(34, { vence_em: "2026-11-15" }),
  ];
  assert.equal(op.agendaCaixa(ps, hoje, 7).length, 1);
  assert.equal(op.agendaCaixa(ps, hoje, 30).length, 2);
});
testar("Cancelada ou paga não entra em fila nem previsão", () => {
  assert.equal(
    op.abertas([
      parcela(30, { cancelada_em: hoje }),
      parcela(31, { recebido: 1000 }),
    ]).length,
    0,
  );
});
testar(
  "Dividir pagamento entre parcelas mantém entrada única e desfaz últimas alocações na devolução",
  () => {
    const r = entrada({
      parcela_id: null,
      valor: 1000,
      bruto: {
        caixa_alocacoes: [
          { parcela_id: id(30), valor: 600 },
          { parcela_id: id(31), valor: 400 },
        ],
      },
    });
    assert.deepEqual(
      [...rec.pagamentosPorParcela([r])],
      [
        [id(30), 600],
        [id(31), 400],
      ],
    );
    assert.deepEqual(
      rec.alocacoesDoRecebimento({ ...r, valor_estornado: 500 }),
      [{ parcela_id: id(30), valor: 500 }],
    );
    assert.equal(
      rec.alocacoesDoRecebimento({ ...r, estornado_em: hoje }).length,
      0,
    );
  },
);
testar("Alocação parcial preserva crédito não distribuído", () => {
  assert.equal(
    rec.semAlocacao(
      entrada({
        parcela_id: null,
        valor: 500,
        bruto: { caixa_alocacoes: [{ parcela_id: id(30), valor: 300 }] },
      }),
    ),
    200,
  );
});
testar(
  "Histórico respeita data local, cliente e contrato inclusive múltiplas parcelas",
  () => {
    const r = entrada({
      parcela_id: null,
      recebido_em: "2026-10-01T01:30:00Z",
      bruto: { caixa_alocacoes: [{ parcela_id: id(30), valor: 200 }] },
    });
    const f = {
      inicio: "2026-09-01",
      fim: "2026-09-30",
      cliente: id(10),
      contrato: id(20),
      metodo: "pix",
      origem: "manual",
      conferencia: "confirmado",
    };
    assert.equal(op.filtrarHistorico([r], f, [parcela(30)]).length, 1);
    assert.equal(
      op.filtrarHistorico([r], { ...f, inicio: "2026-10-01", fim: hoje }, [
        parcela(30),
      ]).length,
      0,
    );
  },
);
function cenario({
  logado = true,
  falharAgenda = false,
  concorrencia = false,
} = {}) {
  const tabelas = {
    crm_leads: [{ id: id(10) }],
    crm_contratos: [{ id: id(20), status: "ativo" }],
    crm_parcelas: [parcela(30), parcela(31, { recebido: 0 })],
    crm_recebimentos: [entrada()],
    crm_interacoes: [],
  };
  const escritas = [];
  const banco = {
    from(tabela) {
      let operacao = "select",
        valores,
        opcoes,
        unidade = false,
        inicio = 0,
        fim = Infinity;
      const filtros = [];
      const q = {
        select() {
          return q;
        },
        eq(k, v) {
          filtros.push((r) =>
            k === "bruto"
              ? JSON.stringify(r[k]) === v
              : (k.includes("->>")
                  ? r[k.split("->>")[0]]?.[k.split("->>")[1]]
                  : r[k]) === v,
          );
          return q;
        },
        is(k, v) {
          filtros.push(
            (r) =>
              (k.includes("->>")
                ? r[k.split("->>")[0]]?.[k.split("->>")[1]]
                : r[k]) == v,
          );
          return q;
        },
        in(k, v) {
          filtros.push((r) => v.includes(r[k]));
          return q;
        },
        order() {
          return q;
        },
        range(a, b) {
          inicio = a;
          fim = b + 1;
          return q;
        },
        maybeSingle() {
          unidade = true;
          return q;
        },
        update(v) {
          operacao = "update";
          valores = v;
          return q;
        },
        upsert(v, o) {
          operacao = "upsert";
          valores = v;
          opcoes = o;
          return q;
        },
        then(resolve, reject) {
          return Promise.resolve()
            .then(() => {
              const rows = tabelas[tabela]
                .filter((r) => filtros.every((f) => f(r)))
                .slice(inicio, fim);
              if (operacao === "select")
                return {
                  data: structuredClone(unidade ? (rows[0] ?? null) : rows),
                  error: null,
                };
              escritas.push({
                tabela,
                operacao,
                valores: structuredClone(valores),
              });
              if (tabela === "crm_parcelas" && falharAgenda) {
                falharAgenda = false;
                return { data: null, error: { message: "simulada" } };
              }
              if (operacao === "update" && concorrencia) {
                concorrencia = false;
                return { data: null, error: null };
              }
              if (operacao === "upsert") {
                if (!tabelas[tabela].some((r) => r.id === valores.id))
                  tabelas[tabela].push(structuredClone(valores));
                return { data: null, error: null };
              }
              rows.forEach((r) => Object.assign(r, structuredClone(valores)));
              return {
                data: structuredClone(unidade ? (rows[0] ?? null) : rows),
                error: null,
              };
            })
            .then(resolve, reject);
        },
      };
      return q;
    },
  };
  const a = carregar("app/(pt)/crm/acoes-caixa.ts", {
    "@/lib/crm/supabase": {
      usuarioAtual: async () => (logado ? { id: id(1) } : null),
      clienteServidor: async () => banco,
    },
    "@/lib/crm/regras": { hojeSP: () => hoje },
    "next/cache": { revalidatePath() {} },
  });
  return { a, tabelas, escritas };
}
const contato = {
  request: id(80),
  lead: id(10),
  parcelas: [id(30)],
  dia: hoje,
  canal: "whatsapp",
  nota: "Pedi comprovante",
  lembrete: "2026-10-20",
};
testar(
  "Cobrança salva uma vez; reenvio retoma lembrete após falha",
  async () => {
    const { a, tabelas } = cenario({ falharAgenda: true });
    assert.equal((await a.registrarCobranca(contato)).ok, false);
    assert.equal(tabelas.crm_interacoes.length, 1);
    assert.equal((await a.registrarCobranca(contato)).ok, true);
    assert.equal(tabelas.crm_interacoes.length, 1);
    assert.equal(tabelas.crm_parcelas[0].cobrar_em, "2026-10-20");
    assert.equal(tabelas.crm_parcelas[0].vence_em, "2026-10-10");
  },
);
testar(
  "Mesmo identificador com contato diferente não sobrescreve registro",
  async () => {
    const { a, tabelas } = cenario();
    await a.registrarCobranca(contato);
    assert.equal(
      (await a.registrarCobranca({ ...contato, nota: "Outra" })).ok,
      false,
    );
    assert.equal(tabelas.crm_interacoes.length, 1);
  },
);
testar("Só lembrar não inventa contato nem altera vencimento", async () => {
  const { a, tabelas } = cenario();
  assert.equal(
    (await a.lembrarCobranca(id(10), [id(30)], "2026-10-20")).ok,
    true,
  );
  assert.equal(tabelas.crm_interacoes.length, 0);
  assert.equal(tabelas.crm_parcelas[0].vence_em, "2026-10-10");
});
testar(
  "Sessão, parcela de outro cliente e data inválida não gravam nada",
  async () => {
    for (const [opts, d] of [
      [{ logado: false }, contato],
      [{}, { ...contato, lead: id(11) }],
      [{}, { ...contato, dia: "2026-02-30" }],
      [{}, { ...contato, lembrete: hoje }],
    ]) {
      const { a, escritas } = cenario(opts);
      assert.equal((await a.registrarCobranca(d)).ok, false);
      assert.equal(escritas.length, 0);
    }
  },
);
const ajuste = {
  id: id(40),
  request: id(81),
  motivo: "Valor digitado errado",
  valor: 300,
  dia: hoje,
  metodo: "pix",
  liquido: 295,
};
testar(
  "Correção preserva antes/depois e reenvio não duplica histórico",
  async () => {
    const { a, tabelas } = cenario();
    assert.equal((await a.ajustarRecebimento(ajuste)).ok, true);
    const r = tabelas.crm_recebimentos[0];
    assert.equal(r.valor, 300);
    assert.equal(r.bruto.caixa_historico[0].antes.valor, 200);
    assert.equal((await a.ajustarRecebimento(ajuste)).ok, true);
    assert.equal(r.bruto.caixa_historico.length, 1);
    assert.equal(
      (await a.ajustarRecebimento({ ...ajuste, valor: 400 })).ok,
      false,
    );
  },
);
testar("Pagamento automático não aceita reescrever bruto", async () => {
  const { a, tabelas, escritas } = cenario();
  Object.assign(tabelas.crm_recebimentos[0], {
    origem: "mercadopago",
    mp_payment_id: "123",
  });
  assert.equal((await a.ajustarRecebimento(ajuste)).ok, false);
  assert.equal(escritas.length, 0);
});
testar("Correção detecta concorrência e preserva registro", async () => {
  const { a, tabelas } = cenario({ concorrencia: true });
  assert.equal((await a.ajustarRecebimento(ajuste)).ok, false);
  assert.equal(tabelas.crm_recebimentos[0].valor, 200);
});
testar(
  "Identificar pagamento não duplica recebimento; distribuição respeita saldo e dono",
  async () => {
    const { a, tabelas } = cenario();
    const d = {
      id: id(40),
      request: id(82),
      motivo: "Conferi comprovante",
      lead: id(10),
      alocacoes: [
        { parcela_id: id(30), valor: 100 },
        { parcela_id: id(31), valor: 100 },
      ],
    };
    assert.equal((await a.ajustarRecebimento(d)).ok, true);
    assert.equal(tabelas.crm_recebimentos.length, 1);
    assert.deepEqual(
      [...rec.pagamentosPorParcela(tabelas.crm_recebimentos)],
      [
        [id(30), 100],
        [id(31), 100],
      ],
    );
    assert.equal(
      (
        await a.ajustarRecebimento({
          ...d,
          request: id(83),
          alocacoes: [{ parcela_id: id(30), valor: 1000 }],
        })
      ).ok,
      false,
    );
  },
);
testar(
  "Valor inválido, devolvido ou além do saldo não pode ser corrigido",
  async () => {
    for (const extra of [
      { valor: 0 },
      { valor: Infinity },
      { valor: 1001 },
      { dia: "2026-02-30" },
      { liquido: 301 },
    ]) {
      const { a, escritas } = cenario();
      assert.equal(
        (await a.ajustarRecebimento({ ...ajuste, ...extra })).ok,
        false,
      );
      assert.equal(escritas.length, 0);
    }
    const { a, tabelas, escritas } = cenario();
    tabelas.crm_recebimentos[0].valor_estornado = 50;
    assert.equal((await a.ajustarRecebimento(ajuste)).ok, false);
    assert.equal(escritas.length, 0);
  },
);
testar(
  "Anular preserva original e auditoria, zera saldo pago sem inventar devolução",
  async () => {
    const { a, tabelas } = cenario();
    const pedido = {
      id: id(40),
      request: id(88),
      motivo: "Lançamento duplicado por engano",
      anular: true,
    };
    assert.equal((await a.ajustarRecebimento(pedido)).ok, true);
    const r = tabelas.crm_recebimentos[0];
    assert.equal(r.valor, 200);
    assert.equal(r.estornado_em, null);
    assert.ok(r.bruto.caixa_anulado);
    assert.equal(r.bruto.caixa_historico.length, 1);
    assert.equal(rec.pagamentosPorParcela([r]).size, 0);
    assert.equal(op.resumoCaixa([], [r], [], "2026-10", hoje).bruto, 0);
    const regras = carregar("lib/sistema/indicadores.ts");
    assert.equal(regras.valorRetido(r), 0);
    assert.equal(regras.apurarMes("2026-10", [r], [], []).bruto, 0);
    assert.equal(regras.devolucoesComLegado([r], []).length, 0);
    assert.equal((await a.ajustarRecebimento(pedido)).ok, true);
    assert.equal(r.bruto.caixa_historico.length, 1);
    assert.equal(
      (await a.ajustarRecebimento({ ...ajuste, request: id(89) })).ok,
      false,
    );
  },
);
testar("Não anula pagamento automático ou com devolução", async () => {
  for (const extra of [
    { origem: "mercadopago", mp_payment_id: "123" },
    { valor_estornado: 50 },
    { estornado_em: hoje },
  ]) {
    const { a, tabelas, escritas } = cenario();
    Object.assign(tabelas.crm_recebimentos[0], extra);
    assert.equal(
      (
        await a.ajustarRecebimento({
          id: id(40),
          request: id(88),
          motivo: "Teste",
          anular: true,
        })
      ).ok,
      false,
    );
    assert.equal(escritas.length, 0);
  }
});
testar(
  "Anulados continuam consultáveis no histórico com filtro próprio",
  () => {
    const r = entrada({ bruto: { caixa_anulado: { motivo: "Engano" } } });
    const f = {
      inicio: "2026-10-01",
      fim: hoje,
      cliente: "",
      contrato: "",
      metodo: "",
      origem: "",
      conferencia: "anulado",
    };
    assert.equal(op.filtrarHistorico([r], f, [parcela(30)]).length, 1);
    assert.equal(
      op.filtrarHistorico([r], { ...f, conferencia: "confirmado" }, [
        parcela(30),
      ]).length,
      0,
    );
  },
);
testar(
  "Resumo e extrato do Financeiro excluem anulado sem produzir devolução",
  () => {
    const r = entrada({ bruto: { caixa_anulado: { motivo: "Engano" } } }),
      f = carregar("lib/financeiro/operacao.ts");
    assert.deepEqual(f.liquidoConfirmado([r]), { valor: 0, pendentes: 0 });
    assert.equal(f.extratoFinanceiro("2026-10", [r], [], []).length, 0);
    const tipos = carregar("lib/financeiro/tipos.ts");
    assert.equal(tipos.resultadoDoMes("2026-10", [r], [], 5).entrou, 0);
  },
);
(async () => {
  let n = 0;
  for (const t of testes) {
    await t.f();
    n++;
    console.log("OK: " + t.nome);
  }
  console.log(`${n}/${testes.length} cenários do Caixa passaram.`);
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
