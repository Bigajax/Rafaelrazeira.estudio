/* Banco em memória e API real, sem chaves, sessões ou dados de produção. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const Module = require("node:module");
const ts = require("typescript");
const { PGlite } = require(path.resolve(".tmp/raspadinha-qa/node_modules/@electric-sql/pglite"));
const { NextRequest } = require("next/server");
const owner = "11111111-1111-4111-8111-111111111111";
const outro = "22222222-2222-4222-8222-222222222222";
const token = "a".repeat(64);
const campanha = "bloco-arquitetura-2026";
const origem = "http://localhost:3107";
const endpoint = `${origem}/api/arquitetos/raspadinha/${token}`;
const cache = new Map();

// Carrega a rota TS sem precisar iniciar Next, mantendo NextRequest/Response reais.
function carregar(arquivo) {
  const absoluto = path.resolve(arquivo);
  if (cache.has(absoluto)) return cache.get(absoluto).exports;
  const m = new Module(absoluto, module);
  m.filename = absoluto; m.paths = Module._nodeModulePaths(path.dirname(absoluto));
  cache.set(absoluto, m);
  const nativo = m.require.bind(m);
  m.require = (nome) => {
    if (nome === "server-only") return {};
    if (nome.startsWith("@/") || nome.startsWith("./")) {
      const base = nome.startsWith("@/") ? path.resolve(nome.slice(2)) : path.resolve(path.dirname(absoluto), nome);
      if (fs.existsSync(`${base}.ts`)) return carregar(`${base}.ts`);
    }
    return nativo(nome);
  };
  m._compile(ts.transpileModule(fs.readFileSync(absoluto, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, absoluto);
  return m.exports;
}

(async () => {
  const db = new PGlite();
  let servidor;
  try {
    await db.exec(`create schema auth;
      create role anon; create role authenticated; create role service_role;
      alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
      create table auth.users(id uuid primary key);
      insert into auth.users values ('${owner}'),('${outro}');
      create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth, public to anon, authenticated, service_role;`);
    const migration = fs.readFileSync("supabase/raspadinha-arquitetos.sql", "utf8");
    await db.exec(migration); await db.exec(migration);
    await db.query("insert into arquiteto_cupom_evento(campanha,owner_id,token,codigo) values ($1,$2,$3,'ARQ-TESTE')", [campanha, owner, token]);
    await assert.rejects(db.query("insert into arquiteto_cupom_evento(campanha,owner_id,token,codigo) values ($1,$2,$3,'ARQ-OUTRO')", [campanha, owner, "b".repeat(64)]), /duplicate key/);
    await assert.rejects(db.exec("update arquiteto_cupom_evento set final_centavos=1"), /imutáveis/);
    console.log("OK: migração reaplicável, único prêmio e preço imutável.");

    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${owner}',false)`);
    assert.equal((await db.query("select * from arquiteto_cupom_evento")).rows.length, 1);
    await db.exec(`select set_config('request.jwt.claim.sub','${outro}',false)`);
    assert.equal((await db.query("select * from arquiteto_cupom_evento")).rows.length, 0);
    await assert.rejects(db.exec("update arquiteto_cupom_evento set nome='Intruso'"), /permission denied/);
    await assert.rejects(db.exec("delete from arquiteto_cupom_evento"), /permission denied/);
    await assert.rejects(db.exec(`insert into arquiteto_cupom_evento(campanha,owner_id,token,codigo) values ('x','${outro}','x','x')`), /permission denied/);
    await db.exec("reset role; set role anon");
    await assert.rejects(db.exec("select * from arquiteto_cupom_evento"), /permission denied/);
    await db.exec("reset role; set role service_role");
    await assert.rejects(db.exec("delete from arquiteto_cupom_evento"), /permission denied/);
    await db.exec("reset role");
    console.log("OK: RLS do dono, dados fechados ao público e sem exclusão pela chave de serviço.");

    let falhar = false;
    // Adaptador PostgREST: o supabase-js real envia filtros reais; o Postgres executa o UPDATE.
    servidor = http.createServer(async (req, res) => {
      try {
        if (falhar) { res.writeHead(503, { "Content-Type": "application/json" }); res.end(JSON.stringify({ message: "Banco indisponível" })); return; }
        const url = new URL(req.url, "http://localhost");
        assert.equal(url.pathname, "/rest/v1/arquiteto_cupom_evento");
        const valores = [], filtros = [];
        for (const [campo, valor] of url.searchParams) {
          if (campo === "select") continue;
          assert.ok(["campanha", "owner_id", "token", "resgatado_em"].includes(campo));
          if (valor === "is.null") filtros.push(`${campo} is null`);
          else { assert.ok(valor.startsWith("eq.")); valores.push(valor.slice(3)); filtros.push(`${campo}=$${valores.length}`); }
        }
        let sql = "";
        if (req.method === "GET") sql = `select * from arquiteto_cupom_evento where ${filtros.join(" and ")}`;
        else {
          assert.equal(req.method, "PATCH");
          let texto = ""; for await (const chunk of req) texto += chunk;
          const dados = JSON.parse(texto), campos = [];
          for (const [campo, valor] of Object.entries(dados)) {
            assert.ok(["nome", "whatsapp", "recibo_hash", "resgatado_em"].includes(campo));
            valores.push(valor); campos.push(`${campo}=$${valores.length}`);
          }
          sql = `update arquiteto_cupom_evento set ${campos.join(",")} where ${filtros.join(" and ")} returning campanha`;
        }
        const result = await db.query(sql, valores);
        res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify(result.rows));
      } catch (e) { res.writeHead(500, { "Content-Type": "application/json" }); res.end(JSON.stringify({ message: e.message })); }
    });
    await new Promise(resolve => servidor.listen(0, "127.0.0.1", resolve));
    process.env.SUPABASE_URL = `http://127.0.0.1:${servidor.address().port}`;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "chave-ficticia-qa";
    process.env.CRM_OWNER_ID = owner;
    const rota = carregar("app/(pt)/api/arquitetos/raspadinha/[token]/route.ts");
    const ctx = { params: Promise.resolve({ token }) };
    const get = cookie => rota.GET(new NextRequest(endpoint, { headers: cookie ? { cookie } : {} }), ctx);
    const post = (cookie, dados = { nome: "Pessoa sorteada", whatsapp: "44991246187" }, origin = origem) => rota.POST(new NextRequest(endpoint, {
      method: "POST", headers: { "Content-Type": "application/json", Origin: origin, ...(cookie ? { cookie } : {}) }, body: JSON.stringify(dados),
    }), ctx);
    const a = await get(), b = await get();
    assert.deepEqual(await a.json(), { estado: "disponivel" });
    assert.equal(a.headers.get("cache-control"), "private, no-store");
    const ca = a.headers.get("set-cookie").split(";")[0], cb = b.headers.get("set-cookie").split(";")[0];
    assert.match(a.headers.get("set-cookie"), /HttpOnly/i); assert.match(a.headers.get("set-cookie"), /SameSite=strict/i);
    assert.equal((await db.query("select resgatado_em from arquiteto_cupom_evento")).rows[0].resgatado_em, null);
    assert.equal((await post(null)).status, 400);
    assert.equal((await post(ca, undefined, "https://outro.example")).status, 403);
    assert.equal((await post(ca, { nome: "Pessoa", whatsapp: "123" })).status, 400);
    assert.equal((await post(ca, { nome: "x", whatsapp: "44991246187" })).status, 400);
    assert.equal((await rota.GET(new NextRequest(endpoint), { params: Promise.resolve({ token: "z" }) })).status, 404);
    console.log("OK: abrir não consome; validação, origem, cookie e link inválido.");

    const disputa = await Promise.all([post(ca), post(cb, { nome: "Outra pessoa", whatsapp: "44999887766" })]);
    assert.deepEqual(disputa.map(r => r.status).sort(), [200, 409]);
    const vencedor = disputa[0].status === 200 ? ca : cb;
    const perdedor = vencedor === ca ? cb : ca;
    const estado = await (await get(vencedor)).json();
    assert.equal(estado.estado, "resgatado"); assert.equal(estado.codigo, "ARQ-TESTE");
    assert.deepEqual(await (await post(vencedor)).json(), estado);
    assert.deepEqual(await (await get(perdedor)).json(), { estado: "indisponivel" });
    assert.deepEqual(await (await get()).json(), { estado: "indisponivel" });
    assert.equal((await db.query("select count(*)::int as n from arquiteto_cupom_evento")).rows[0].n, 1);
    await assert.rejects(db.exec("update arquiteto_cupom_evento set nome='Troca'"), /já tem ganhador/);
    await assert.rejects(db.exec("update arquiteto_cupom_evento set resgatado_em=null,nome=null,whatsapp=null,recibo_hash=null"), /já tem ganhador/);
    console.log("OK: dois resgates simultâneos → um ganhador; recarga e repetição recuperam o mesmo cupom; outros não veem dados.");

    await db.exec("update arquiteto_cupom_evento set utilizado_em=now()");
    assert.equal((await (await get(vencedor)).json()).estado, "utilizado");
    assert.equal((await (await post(vencedor)).json()).estado, "utilizado");
    await assert.rejects(db.exec("update arquiteto_cupom_evento set utilizado_em=null"), /já foi utilizado/);
    falhar = true;
    assert.equal((await get(vencedor)).status, 503);
    console.log("OK: uso definitivo, sem reabrir o cupom, e falha do banco tratada.");
  } finally {
    if (servidor) { servidor.closeAllConnections(); await new Promise(resolve => servidor.close(resolve)); }
    await db.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
