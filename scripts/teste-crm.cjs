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
    const alvo = [base, base + ".ts", base + ".tsx"].find((p) => fs.existsSync(p));
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
      (nome) => ler(nome, alvo), modulo, modulo.exports,
    );
    return modulo.exports;
  }
  return ler("@/" + arquivo);
}

const leadInicial = {
  id: "lead", nome: "Loja", estagio: "conversa",
  proximo_passo: "Enviar proposta", proxima_acao_em: "2026-10-20",
  ticket_estimado: null, motivo_perda: null, valor_fechado: null, fechado_em: null,
};

function cenario(campos = {}, erroLeitura = null) {
  const lead = { ...leadInicial, ...campos };
  const escritas = [];
  const toques = [];
  const banco = {
    from(tabela) {
      let operacao = "select", valores;
      const consulta = {
        select() { return consulta; },
        eq() { return consulta; },
        single() { return consulta; },
        update(v) { operacao = "update"; valores = v; return consulta; },
        insert(v) { operacao = "insert"; valores = v; return consulta; },
        then(resolve, reject) {
          return Promise.resolve().then(() => {
            if (operacao === "select") return { data: { ...lead }, error: erroLeitura };
            escritas.push({ tabela, operacao, valores });
            if (tabela === "crm_interacoes") toques.push(valores);
            else Object.assign(lead, valores);
            return { data: null, error: null };
          }).then(resolve, reject);
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
    "next/navigation": { redirect() { throw new Error("Redirecionamento inesperado"); } },
  });
  return { acoes, lead, escritas, toques };
}

const testes = [];
const testar = (nome, executar) => testes.push({ nome, executar });
const regras = carregar("lib/crm/regras.ts");

for (const data of ["2026-02-30", "2026-13-01", "data inválida"]) {
  testar("Recusa data de passagem: " + data, () => {
    assert.ok(regras.oQueFalta("conversa", leadInicial, { proxima_acao_em: data }).includes("proxima_acao_em"));
  });
}
for (const valor of [0, -1, NaN, Infinity]) {
  testar("Recusa ticket de proposta: " + valor, () => {
    assert.ok(regras.oQueFalta("proposta", leadInicial, { ticket_estimado: valor }).includes("ticket_estimado"));
  });
}
testar("Aceita data bissexta e proposta válida", () => {
  assert.deepEqual(regras.oQueFalta("proposta", leadInicial, {
    ticket_estimado: 999, proxima_acao_em: "2028-02-29",
  }), []);
});
testar("Recusa motivo de perda desconhecido", () => {
  assert.deepEqual(regras.oQueFalta("perdido", leadInicial, { motivo_perda: "inexistente" }), ["motivo_perda"]);
});

const coluna = ["a", "b", "c"].map((id, i) => ({ id, posicao: (i + 1) * 1000 }));
function ordemAoSoltar(id, sobre) {
  const posicao = regras.posicaoAoSoltar(coluna, id, sobre);
  return coluna.map((l) => l.id === id ? { ...l, posicao } : l)
    .sort((a, b) => a.posicao - b.posicao).map((l) => l.id);
}
testar("Arrastar para baixo ultrapassa o alvo", () => assert.deepEqual(ordemAoSoltar("a", "b"), ["b", "a", "c"]));
testar("Arrastar para cima fica antes do alvo", () => assert.deepEqual(ordemAoSoltar("c", "b"), ["a", "c", "b"]));
testar("Arrastar para o fim e sobre si mesmo", () => {
  assert.deepEqual(ordemAoSoltar("a", null), ["b", "c", "a"]);
  assert.deepEqual(ordemAoSoltar("b", "b"), ["a", "b", "c"]);
});
testar("Entrada de outra coluna e coluna vazia", () => {
  assert.equal(regras.posicaoAoSoltar(coluna, "externo", "b"), 1500);
  assert.equal(regras.posicaoAoSoltar([], "externo", null), 1000);
});

const toque = { canal: "whatsapp", direcao: "saida" };

testar("Central exige próximo passo antes de gravar atendimento mesmo com agenda futura", async () => {
  const c = cenario();
  const r = await c.acoes.registrarToque("lead", { ...toque, exigir_proximo_passo: true });
  assert.equal(r.ok, false);
  assert.deepEqual(r.falta, ["proximo_passo", "proxima_acao_em"]);
  assert.deepEqual(c.escritas, []);
});
testar("Central salva atendimento e agenda explícita juntos", async () => {
  const c = cenario();
  assert.equal((await c.acoes.registrarToque("lead", { ...toque, exigir_proximo_passo: true, proximo_passo: "Confirmar escopo", proxima_acao_em: "2026-10-25" })).ok, true);
  assert.equal(c.toques.length, 1);
  assert.equal(c.lead.proximo_passo, "Confirmar escopo");
  assert.equal(c.lead.proxima_acao_em, "2026-10-25");
});
testar("Central permite encerrar por perda sem inventar próximo passo", async () => {
  const c = cenario();
  assert.equal((await c.acoes.registrarToque("lead", { ...toque, exigir_proximo_passo: true, estagio: "perdido", motivo_perda: "sem_interesse" })).ok, true);
  assert.equal(c.lead.estagio, "perdido");
  assert.equal(c.lead.proxima_acao_em, null);
});
testar("Etapa recusada não grava toque nem altera agenda", async () => {
  const c = cenario();
  const r = await c.acoes.registrarToque("lead", {
    ...toque, estagio: "proposta", proxima_acao_em: "2026-10-25",
  });
  assert.deepEqual(r, { ok: false, falta: ["ticket_estimado"] });
  assert.deepEqual(c.escritas, []);
});
testar("Reenvio corrigido registra só um toque", async () => {
  const c = cenario();
  await c.acoes.registrarToque("lead", { ...toque, estagio: "proposta" });
  assert.equal((await c.acoes.registrarToque("lead", {
    ...toque, estagio: "proposta", ticket_estimado: 999,
  })).ok, true);
  assert.equal(c.toques.length, 1);
  assert.equal(c.lead.estagio, "proposta");
});
testar("Data inválida no toque não deixa gravação parcial", async () => {
  const c = cenario();
  assert.equal((await c.acoes.registrarToque("lead", { ...toque, proxima_acao_em: "2026-02-30" })).ok, false);
  assert.deepEqual(c.escritas, []);
});
testar("Erro de leitura não registra toque", async () => {
  const c = cenario({}, { message: "Falha de leitura" });
  assert.equal((await c.acoes.registrarToque("lead", toque)).ok, false);
  assert.deepEqual(c.escritas, []);
});
testar("Trilho automático fornece agenda para lead novo", async () => {
  const c = cenario({ estagio: "lista", proximo_passo: null, proxima_acao_em: null });
  assert.equal((await c.acoes.registrarToque("lead", toque)).ok, true);
  assert.equal(c.lead.estagio, "contatado");
  assert.ok(c.lead.proximo_passo);
  assert.match(c.lead.proxima_acao_em, /^\d{4}-\d{2}-\d{2}$/);
});
testar("Alterar só a data preserva o próximo passo", async () => {
  const c = cenario();
  await c.acoes.registrarToque("lead", { ...toque, proxima_acao_em: "2026-10-25" });
  assert.equal(c.lead.proximo_passo, leadInicial.proximo_passo);
  assert.equal(c.lead.proxima_acao_em, "2026-10-25");
});
testar("Perda limpa a agenda e registra o motivo", async () => {
  const c = cenario();
  await c.acoes.registrarToque("lead", { ...toque, direcao: "entrada", resposta: "nao", motivo_perda: "preco" });
  assert.equal(c.lead.estagio, "perdido");
  assert.equal(c.lead.motivo_perda, "preco");
  assert.equal(c.lead.proximo_passo, null);
  assert.equal(c.lead.proxima_acao_em, null);
});
testar("Definir passo recusa dia inexistente antes do banco", async () => {
  const c = cenario();
  assert.equal((await c.acoes.definirPasso("lead", "Enviar proposta", "2026-02-30")).ok, false);
  assert.deepEqual(c.escritas, []);
});

function elementos(no, tipo) {
  if (!no || typeof no !== "object") return [];
  return [
    ...(no.type === tipo ? [no] : []),
    ...[no.props?.children].flat(Infinity).flatMap((filho) => elementos(filho, tipo)),
  ];
}

// Permite disparar eventos antes da próxima renderização, como no blur do Escape.
function componente(arquivo, nome, props) {
  const estados = [], pendentes = [], salvos = [];
  let cursor = 0;
  const hooks = {
    useState(inicial) {
      const i = cursor++;
      if (!(i in estados)) estados[i] = typeof inicial === "function" ? inicial() : inicial;
      return [estados[i], (v) => { estados[i] = typeof v === "function" ? v(estados[i]) : v; }];
    },
    useRef(inicial) {
      const i = cursor++;
      return estados[i] ??= { current: inicial };
    },
    useEffect() {},
    useTransition: () => [false, (fn) => pendentes.push(fn())],
  };
  const Componente = carregar(arquivo, {
    react: hooks,
    "@/app/(pt)/crm/acoes": { salvarLead: async (_, campos) => { salvos.push(campos); return { ok: true }; } },
  })[nome];
  const renderizar = () => {
    cursor = 0;
    return Componente(props);
  };
  return { renderizar, salvos, pendentes };
}
function campoInline() {
  const c = componente("components/crm/CampoInline.tsx", "CampoInline", {
    leadId: "lead", campo: "nome", rotulo: "Nome", valor: "Original",
  });
  return { ...c, renderizar: () => elementos(c.renderizar(), "input")[0] };
}
testar("Escape desfaz sem salvar no blur", async () => {
  const c = campoInline();
  c.renderizar().props.onChange({ target: { value: "Alterado" } });
  const input = c.renderizar();
  input.props.onKeyDown({ key: "Escape", target: { blur: () => input.props.onBlur() } });
  await Promise.all(c.pendentes);
  assert.deepEqual(c.salvos, []);
  assert.equal(c.renderizar().props.value, "Original");
  c.renderizar().props.onChange({ target: { value: "Outra edição" } });
  c.renderizar().props.onBlur();
  await Promise.all(c.pendentes);
  assert.deepEqual(c.salvos, [{ nome: "Outra edição" }]);
});
testar("Enter continua salvando no blur", async () => {
  const c = campoInline();
  c.renderizar().props.onChange({ target: { value: "Alterado" } });
  const input = c.renderizar();
  input.props.onKeyDown({ key: "Enter", target: { blur: () => input.props.onBlur() } });
  await Promise.all(c.pendentes);
  assert.deepEqual(c.salvos, [{ nome: "Alterado" }]);
});

testar("Modal pede correção de ticket negativo já cadastrado", () => {
  const c = componente("components/crm/ModalToque.tsx", "ModalToque", {
    lead: { ...leadInicial, ticket_estimado: -1 }, aoFechar() {},
  });
  const etapa = elementos(c.renderizar(), "select").find((el) => elementos(el, "optgroup").length);
  etapa.props.onChange({ target: { value: "proposta" } });
  const campoTicket = elementos(c.renderizar(), "label").find((label) =>
    elementos(label, "span").some((span) => String(span.props.children).startsWith("Ticket estimado")),
  );
  assert.ok(campoTicket, "A proposta precisa permitir corrigir o ticket inválido");
});

(async () => {
  let falhas = 0;
  for (const { nome, executar } of testes) {
    try { await executar(); console.log("OK: " + nome); }
    catch (erro) { falhas++; console.error("FALHOU: " + nome + "\n" + erro.stack); }
  }
  console.log(`${testes.length - falhas}/${testes.length} cenários passaram.`);
  if (falhas) process.exitCode = 1;
})();
