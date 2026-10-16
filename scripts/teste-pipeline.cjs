const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const ts = require("typescript");

// Executa os módulos reais com banco e hooks controlados; não usa credenciais.
function carregar(arquivo, substitutos = {}) {
  const cache = new Map();
  function ler(nome, pai = path.join(process.cwd(), "entrada.js")) {
    if (Object.hasOwn(substitutos, nome)) return substitutos[nome];
    if (nome.endsWith(".css")) return {};
    if (!nome.startsWith("@/") && !nome.startsWith(".")) return require(nome);
    const base = nome.startsWith("@/")
      ? path.resolve(nome.slice(2))
      : path.resolve(path.dirname(pai), nome);
    const alvo = [base, base + ".ts", base + ".tsx"].find((p) =>
      fs.existsSync(p),
    );
    if (!alvo) throw new Error("Módulo ausente: " + nome);
    if (cache.has(alvo)) return cache.get(alvo).exports;
    const modulo = { exports: {} };
    cache.set(alvo, modulo);
    const codigo = ts.transpileModule(fs.readFileSync(alvo, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
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
const { resumoPipeline, noFoco } = carregar("lib/crm/pipeline.ts");
const hoje = "2026-10-15";
const lead = (extra = {}) => ({
  estagio: "conversa",
  ticket_estimado: 1000,
  proxima_acao_em: hoje,
  ...extra,
});
const casos = [
  [
    "Resumo exclui vendas encerradas e contatos pausados do valor em aberto",
    () => {
      const r = resumoPipeline(
        [
          lead(),
          lead({ estagio: "ganho", ticket_estimado: 5000 }),
          lead({ estagio: "perdido", ticket_estimado: 5000 }),
          lead({ estagio: "geladeira", ticket_estimado: 5000 }),
        ],
        hoje,
      );
      assert.equal(r.aberto, 1000);
      assert.equal(r.ativos, 1);
      assert.equal(r.hoje, 1);
    },
  ],
  [
    "Propostas somam somente Proposta e Negociação; estimativa ausente não inventa valor",
    () => {
      const r = resumoPipeline(
        [
          lead({ estagio: "proposta", ticket_estimado: 1500 }),
          lead({ estagio: "negociacao", ticket_estimado: null }),
          lead({ estagio: "conversa", ticket_estimado: 2000 }),
        ],
        hoje,
      );
      assert.equal(r.aberto, 3500);
      assert.equal(r.naMesa, 1500);
      assert.equal(r.propostas, 2);
    },
  ],
  [
    "Hoje, atrasado e sem data são prioridades diferentes",
    () => {
      const r = resumoPipeline(
        [
          lead(),
          lead({ proxima_acao_em: "2026-10-14" }),
          lead({ proxima_acao_em: null }),
          lead({ proxima_acao_em: "2026-10-16" }),
        ],
        hoje,
      );
      assert.equal(r.hoje, 1);
      assert.equal(r.atrasados, 1);
      assert.equal(r.semPasso, 1);
      assert.equal(r.esperando, 2);
    },
  ],
  [
    "Filtro Para hoje não mistura atrasados nem contatos futuros",
    () => {
      assert.equal(noFoco(lead(), "hoje", hoje), true);
      assert.equal(
        noFoco(lead({ proxima_acao_em: "2026-10-14" }), "hoje", hoje),
        false,
      );
      assert.equal(
        noFoco(lead({ proxima_acao_em: "2026-10-16" }), "hoje", hoje),
        false,
      );
      assert.equal(
        noFoco(lead({ proxima_acao_em: null }), "sem_passo", hoje),
        true,
      );
    },
  ],
  [
    "Prioridade não reativa oportunidades encerradas ou pausadas",
    () => {
      for (const estagio of ["ganho", "perdido", "geladeira"]) {
        const l = lead({ estagio, proxima_acao_em: "2026-10-14" });
        assert.equal(noFoco(l, "atrasados", hoje), false);
        assert.equal(noFoco(l, "todos", hoje), true);
      }
    },
  ],
];
for (const [nome, executar] of casos) {
  executar();
  console.log("OK: " + nome);
}
console.log(`${casos.length}/${casos.length} cenários do pipeline passaram.`);

const leadInicial = {
  id: "lead",
  nome: "Loja",
  estagio: "conversa",
  proximo_passo: "Enviar proposta",
  proxima_acao_em: "2026-10-20",
  ticket_estimado: null,
  motivo_perda: null,
  valor_fechado: null,
  fechado_em: null,
};

function cenario(campos = {}, erroLeitura = null) {
  const lead = { ...leadInicial, ...campos };
  const escritas = [];
  const toques = [];
  const banco = {
    from(tabela) {
      let operacao = "select",
        valores;
      const consulta = {
        select() {
          return consulta;
        },
        eq() {
          return consulta;
        },
        single() {
          return consulta;
        },
        update(v) {
          operacao = "update";
          valores = v;
          return consulta;
        },
        insert(v) {
          operacao = "insert";
          valores = v;
          return consulta;
        },
        then(resolve, reject) {
          return Promise.resolve()
            .then(() => {
              if (operacao === "select")
                return { data: { ...lead }, error: erroLeitura };
              escritas.push({ tabela, operacao, valores });
              if (tabela === "crm_interacoes") toques.push(valores);
              else Object.assign(lead, valores);
              return { data: null, error: null };
            })
            .then(resolve, reject);
        },
      };
      return consulta;
    },
  };
  const acoes = carregar("app/(pt)/crm/acoes.ts", {
    "@/lib/crm/supabase": {
      usuarioAtual: async () => ({ id: "usuario" }),
      clienteServidor: async () => banco,
    },
    "next/cache": { revalidatePath() {} },
    "next/navigation": {
      redirect() {
        throw new Error("Redirecionamento inesperado");
      },
    },
  });
  return { acoes, lead, escritas, toques };
}
