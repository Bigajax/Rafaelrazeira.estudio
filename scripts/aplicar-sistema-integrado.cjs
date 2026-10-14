const fs = require("node:fs");
const path = require("node:path");
require("@next/env").loadEnvConfig(process.cwd());
const token = process.env.SUPABASE_ACCESS_TOKEN;
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const ref = url && new URL(url).hostname.split(".")[0];
if (!token || !ref) {
  console.error(
    "Configure SUPABASE_ACCESS_TOKEN no ambiente para o projeto já configurado. Não coloque o token no código.",
  );
  process.exit(1);
}
async function consultar(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!r.ok) throw new Error(`Supabase respondeu ${r.status}. Nenhuma chave será exibida.`);
  return r.json();
}
(async () => {
  const estado = await consultar(
    "select current_database() banco, (select count(*) from public.crm_leads) negocios, (select count(*) from public.crm_contratos) contratos, to_regclass('public.crm_entregas') entregas, to_regclass('public.fin_despesas') despesas",
  );
  console.log("Projeto configurado:", ref);
  console.log(estado);
  if (!process.argv.includes("--aplicar")) {
    console.log("Verificação concluída. Use --aplicar para criar backup e instalar a migração.");
    return;
  }
  const tabelas = [
    "crm_leads",
    "crm_contratos",
    "crm_parcelas",
    "crm_recebimentos",
    "crm_projetos",
    "fin_custos",
    "plano_metas",
  ];
  const backup = { quando: new Date().toISOString(), projeto: ref, tabelas: {} };
  for (const tabela of tabelas)
    backup.tabelas[tabela] = await consultar(`select to_jsonb(t) registro from public.${tabela} t`);
  backup.esquema = await consultar(
    "select c.relname tabela,pg_get_constraintdef(k.oid) definicao,k.conname nome from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('crm_leads','crm_contratos','crm_recebimentos','crm_projetos','plano_metas')",
  );
  const destino = path.resolve(
    ".tmp",
    "backups-sistema",
    new Date().toISOString().replace(/[:.]/g, "-") + ".json",
  );
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, JSON.stringify(backup));
  console.log("Backup local criado:", destino);
  await consultar(fs.readFileSync("supabase/sistema-integrado.sql", "utf8"));
  console.log(
    "Migração aplicada. Verificação:",
    await consultar(
      "select (select count(*) from public.crm_eventos_etapa) eventos, (select count(*) from public.crm_entregas) entregas, (select count(*) from public.crm_devolucoes) devolucoes",
    ),
  );
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
