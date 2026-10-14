const fs = require("fs"),
  assert = require("assert/strict");
const { PGlite } = require(
  require("node:path").resolve(
    ".tmp/integracao-qa/node_modules/@electric-sql/pglite",
  ),
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
  await db.exec(
    "create table public.prod_lojas(id uuid primary key default gen_random_uuid(),owner_id uuid references auth.users(id),lead_id uuid references public.crm_leads(id));",
  );
  const migration = arquivo("supabase/sistema-integrado.sql");
  await db.exec(migration);
  await db.exec(migration);
  const revisao = arquivo("supabase/sistema-integrado-revisao.sql");
  await db.exec(revisao);
  await db.exec(revisao);
  console.log("Migração: aplicada e reaplicada sem duplicar dados.");
  const dados = {
    titulo: "Vitrine",
    tipo: "projeto",
    valor_total: 999,
    assinado_em: "2026-08-01",
    parcelas: [
      {
        numero: 1,
        de: 2,
        rotulo: "Entrada",
        valor: 199,
        vence_em: "2026-08-01",
      },
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
    (
      await db.query(
        "select count(*)::int n from crm_recebimentos where lead_id=$1",
        [lead],
      )
    ).rows[0].n,
    1,
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from crm_parcelas where lead_id=$1",
        [lead],
      )
    ).rows[0].n,
    2,
  );
  console.log(
    "Venda: contrato, parcelas, ganho e recebimento atômicos; repetição idempotente.",
  );
  const antes = (await db.query("select count(*)::int n from crm_contratos"))
    .rows[0].n;
  await assert.rejects(
    db.query("select crm_fechar_venda($1,$2::jsonb,$3::jsonb,$4)", [
      lead2,
      JSON.stringify(dados),
      JSON.stringify([{ numero: 99, recebido_em: "2026-08-01" }]),
      "66666666-6666-4666-8666-666666666666",
    ]),
  );
  assert.equal(
    (await db.query("select count(*)::int n from crm_contratos")).rows[0].n,
    antes,
  );
  assert.equal(
    (await db.query("select estagio from crm_leads where id=$1", [lead2]))
      .rows[0].estagio,
    "conversa",
  );
  console.log(
    "Falha na baixa: rollback preserva etapa e não deixa contrato sem pagamento.",
  );
  const recibo = (
    await db.query("select id from crm_recebimentos where lead_id=$1 limit 1", [
      lead,
    ])
  ).rows[0].id;
  const devolver = (valor, request) =>
    db.query("select crm_registrar_devolucao($1,$2,$3,$4)", [
      recibo,
      valor,
      "2026-09-03",
      request,
    ]);
  await devolver(99, "77777777-7777-4777-8777-777777777777");
  await devolver(99, "77777777-7777-4777-8777-777777777777");
  let r = (
    await db.query(
      "select valor_estornado,estornado_em from crm_recebimentos where id=$1",
      [recibo],
    )
  ).rows[0];
  assert.equal(Number(r.valor_estornado), 99);
  assert.equal(r.estornado_em, null);
  await assert.rejects(devolver(101, "88888888-8888-4888-8888-888888888888"));
  await devolver(100, "99999999-9999-4999-8999-999999999999");
  r = (
    await db.query(
      "select valor_estornado,estornado_em from crm_recebimentos where id=$1",
      [recibo],
    )
  ).rows[0];
  assert.equal(Number(r.valor_estornado), 199);
  assert.equal(
    new Date(r.estornado_em).toISOString().slice(0, 10),
    "2026-09-03",
  );
  console.log(
    "Devoluções: parcial, integral, data preservada, excesso rejeitado, sem duplicação.",
  );
  await assert.rejects(devolver(1, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab"));
  // Formulário antigo depois do estorno integral do webhook não reabre saldo.
  const legado = (
    await db.query(
      "insert into crm_recebimentos(owner_id,valor,recebido_em,metodo,origem,estornado_em)values($1,100,'2026-08-01','pix','manual','2026-09-01')returning id",
      [owner],
    )
  ).rows[0].id;
  await assert.rejects(
    db.query("select crm_registrar_devolucao($1,20,'2026-09-01',$2)", [
      legado,
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaac",
    ]),
  );
  assert.ok(
    (
      await db.query("select estornado_em from crm_recebimentos where id=$1", [
        legado,
      ])
    ).rows[0].estornado_em,
  );
  const mp = (
    await db.query(
      "insert into crm_recebimentos(owner_id,valor,recebido_em,metodo,origem,mp_payment_id)values($1,100,'2026-08-01','pix','mercadopago','123456789')returning id",
      [owner],
    )
  ).rows[0].id;
  const parcial = [{ id: "r1", valor: 20, dia: "2026-09-01" }],
    integral = [...parcial, { id: "r2", valor: 80, dia: "2026-10-01" }];
  const sync = (mov) =>
    db.query("select crm_sincronizar_devolucoes($1,'123456789',$2::jsonb,$3)", [
      owner,
      JSON.stringify(mov),
      mov.reduce((s, m) => s + m.valor, 0) >= 100 ? "refunded" : "approved",
    ]);
  await sync(parcial);
  await sync(integral);
  await sync(integral);
  await sync(parcial);
  assert.equal(
    Number(
      (
        await db.query(
          "select valor_estornado from crm_recebimentos where id=$1",
          [mp],
        )
      ).rows[0].valor_estornado,
    ),
    100,
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from crm_devolucoes where recebimento_id=$1",
        [mp],
      )
    ).rows[0].n,
    2,
  );
  await assert.rejects(
    sync([...integral, { id: "r3", valor: 1, dia: "2026-10-01" }]),
  );
  console.log(
    "Revisão: estorno integral protegido; devoluções do provedor parciais/integrais, repetidas e fora de ordem preservadas.",
  );
  // O cancelamento falha após alterar parcelas: a função deve reverter a operação inteira.
  await db.exec(
    "create function falhar_cancelamento()returns trigger language plpgsql as $$begin raise exception 'falha simulada';end$$;create trigger teste_falhar before update on crm_contratos for each row execute function falhar_cancelamento();",
  );
  await assert.rejects(
    db.query("select crm_cancelar_contrato($1)", [a.rows[0].id]),
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from crm_parcelas where contrato_id=$1 and cancelada_em is not null",
        [a.rows[0].id],
      )
    ).rows[0].n,
    0,
  );
  await db.exec("drop trigger teste_falhar on crm_contratos;");
  await db.query("select crm_cancelar_contrato($1)", [a.rows[0].id]);
  await db.query("select crm_cancelar_contrato($1)", [a.rows[0].id]);
  assert.equal(
    (
      await db.query("select status from crm_contratos where id=$1", [
        a.rows[0].id,
      ])
    ).rows[0].status,
    "cancelado",
  );
  const despesa = (
    await db.query(
      "insert into fin_despesas(owner_id,nome,categoria,valor,pago_em,request_id)values($1,'Ferramenta','ferramenta',100,'2026-09-01',gen_random_uuid())returning id",
      [owner],
    )
  ).rows[0].id;
  await assert.rejects(
    db.query("update fin_despesas set valor=120 where id=$1", [despesa]),
  );
  await db.query(
    "select fin_retificar_despesa($1,$2::jsonb,'Valor confirmado no comprovante')",
    [
      despesa,
      JSON.stringify({
        nome: "Ferramenta",
        categoria: "ferramenta",
        valor: 120,
        pago_em: "2026-09-01",
        valor_original: 120,
      }),
    ],
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from fin_despesas_historico where despesa_id=$1",
        [despesa],
      )
    ).rows[0].n,
    1,
  );
  console.log(
    "Revisão: cancelamento atômico com rollback e repetição; retificação exige motivo e preserva histórico.",
  );
  const client = (await db.query("select crm_criar_cliente($1) id", [lead]))
    .rows[0].id;
  assert.equal(
    (await db.query("select crm_criar_cliente($1) id", [lead])).rows[0].id,
    client,
  );
  await db.exec(
    `grant usage on schema public,auth to authenticated;grant select on crm_leads,crm_contratos,crm_recebimentos,fin_custos to authenticated;set role authenticated;select set_config('request.jwt.claim.sub','${outro}',false);`,
  );
  assert.equal((await db.query("select * from crm_clientes")).rows.length, 0);
  await assert.rejects(db.query("select crm_criar_cliente($1)", [lead]));
  await assert.rejects(
    db.query(
      "insert into crm_entregas(owner_id,lead_id,contrato_id)values($1,$2,$3)",
      [outro, lead, a.rows[0].id],
    ),
  );
  await assert.rejects(
    db.query("select crm_registrar_devolucao($1,1,current_date,$2)", [
      recibo,
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    ]),
  );
  await assert.rejects(
    db.query(
      "select crm_sincronizar_devolucoes($1,'123456789','[]'::jsonb,'refunded')",
      [owner],
    ),
  );
  await assert.rejects(
    db.query("select crm_cancelar_contrato($1)", [a.rows[0].id]),
  );
  await assert.rejects(
    db.query("select fin_retificar_despesa($1,'{}'::jsonb,'Outro dono')", [
      despesa,
    ]),
  );
  console.log("RLS: outro dono não lê, vincula ou devolve registros alheios.");
  await db.close();
})().catch((e) => {
  console.error(e.message, e.position, e.where);
  process.exit(1);
});
