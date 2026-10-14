const fs = require("fs"),
  assert = require("assert/strict");
const { PGlite } = require(
  require("node:path").resolve(".tmp/integracao-qa/node_modules/@electric-sql/pglite"),
);
const owner = "11111111-1111-4111-8111-111111111111",
  outro = "22222222-2222-4222-8222-222222222222",
  lead = "33333333-3333-4333-8333-333333333333",
  lead2 = "44444444-4444-4444-8444-444444444444";
const arquivo = (f) => fs.readFileSync(f, "utf8");
(async () => {
  const db = new PGlite();
  await db.exec(
    `create schema auth;create role authenticated;create role anon;create role service_role;create table auth.users(id uuid primary key,created_at timestamptz default now());insert into auth.users values('${owner}'),('${outro}');create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;select set_config('request.jwt.claim.sub','${owner}',false);`,
  );
  await db.exec(arquivo("supabase/crm.sql"));
  await db.exec(arquivo("supabase/plano.sql"));
  await db.exec(arquivo("supabase/financeiro.sql"));
  await db.exec(arquivo("supabase/projetos.sql"));
  await db.exec(
    `create table public.perf_lojas(id uuid primary key default gen_random_uuid(),owner_id uuid references auth.users(id),lead_id uuid references public.crm_leads(id),contrato_id uuid references public.crm_contratos(id));`,
  );
  await db.exec(
    `insert into crm_leads(id,owner_id,nome,estagio)values('${lead}','${owner}','Teste','conversa'),('${lead2}','${owner}','Outro negÃ³cio','conversa');`,
  );
  await db.exec(
    "create table public.mkt_pecas(id uuid primary key default gen_random_uuid(),owner_id uuid references auth.users(id));",
  );
  const migration = arquivo("supabase/sistema-integrado.sql");
  await db.exec(migration);
  await db.exec(migration);
  console.log("Migração: aplicada e reaplicada sem duplicar dados.");
  const dados = {
    titulo: "Vitrine",
    tipo: "projeto",
    valor_total: 999,
    assinado_em: "2026-08-01",
    parcelas: [
      { numero: 1, de: 2, rotulo: "Entrada", valor: 199, vence_em: "2026-08-01" },
      { numero: 2, de: 2, rotulo: "Saldo", valor: 800, vence_em: "2026-09-01" },
    ],
  };
  const request = "55555555-5555-4555-8555-555555555555";
  const fechar = () =>
    db.query("select crm_fechar_venda($1,$2::jsonb,$3::jsonb,$4) id", [
      lead,
      JSON.stringify(dados),
      JSON.stringify([{ numero: 1, recebido_em: "2026-08-01", metodo: "pix" }]),
      request,
    ]);
  const a = await fechar(),
    b = await fechar();
  assert.equal(a.rows[0].id, b.rows[0].id);
  assert.equal(
    (await db.query("select count(*)::int n from crm_recebimentos where lead_id=$1", [lead])).rows[0].n,
    1,
  );
  assert.equal(
    (await db.query("select count(*)::int n from crm_parcelas where lead_id=$1", [lead])).rows[0].n,
    2,
  );
  console.log("Venda: contrato, parcelas, ganho e recebimento atômicos; repetição idempotente.");
  const antes = (await db.query("select count(*)::int n from crm_contratos")).rows[0].n;
  await assert.rejects(
    db.query("select crm_fechar_venda($1,$2::jsonb,$3::jsonb,$4)", [
      lead2,
      JSON.stringify(dados),
      JSON.stringify([{ numero: 99, recebido_em: "2026-08-01" }]),
      "66666666-6666-4666-8666-666666666666",
    ]),
  );
  assert.equal((await db.query("select count(*)::int n from crm_contratos")).rows[0].n, antes);
  assert.equal(
    (await db.query("select estagio from crm_leads where id=$1", [lead2])).rows[0].estagio,
    "conversa",
  );
  console.log("Falha na baixa: rollback preserva etapa e não deixa contrato sem pagamento.");
  const recibo = (await db.query("select id from crm_recebimentos where lead_id=$1 limit 1", [lead])).rows[0]
    .id;
  const devolver = (valor, request) =>
    db.query("select crm_registrar_devolucao($1,$2,$3,$4)", [recibo, valor, "2026-09-03", request]);
  await devolver(99, "77777777-7777-4777-8777-777777777777");
  await devolver(99, "77777777-7777-4777-8777-777777777777");
  let r = (await db.query("select valor_estornado,estornado_em from crm_recebimentos where id=$1", [recibo]))
    .rows[0];
  assert.equal(Number(r.valor_estornado), 99);
  assert.equal(r.estornado_em, null);
  await assert.rejects(devolver(101, "88888888-8888-4888-8888-888888888888"));
  await devolver(100, "99999999-9999-4999-8999-999999999999");
  r = (await db.query("select valor_estornado,estornado_em from crm_recebimentos where id=$1", [recibo]))
    .rows[0];
  assert.equal(Number(r.valor_estornado), 199);
  assert.equal(new Date(r.estornado_em).toISOString().slice(0, 10), "2026-09-03");
  console.log("Devoluções: parcial, integral, data preservada, excesso rejeitado, sem duplicação.");
  const client = (await db.query("select crm_criar_cliente($1) id", [lead])).rows[0].id;
  assert.equal((await db.query("select crm_criar_cliente($1) id", [lead])).rows[0].id, client);
  await db.exec(
    `grant usage on schema public,auth to authenticated;grant select on crm_leads,crm_contratos,crm_recebimentos,fin_custos to authenticated;set role authenticated;select set_config('request.jwt.claim.sub','${outro}',false);`,
  );
  assert.equal((await db.query("select * from crm_clientes")).rows.length, 0);
  await assert.rejects(db.query("select crm_criar_cliente($1)", [lead]));
  await assert.rejects(
    db.query("insert into crm_entregas(owner_id,lead_id,contrato_id)values($1,$2,$3)", [
      outro,
      lead,
      a.rows[0].id,
    ]),
  );
  await assert.rejects(
    db.query("select crm_registrar_devolucao($1,1,current_date,$2)", [
      recibo,
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    ]),
  );
  console.log("RLS: outro dono não lê, vincula ou devolve registros alheios.");
  await db.close();
})().catch((e) => {
  console.error(e.message, e.position, e.where);
  process.exit(1);
});
