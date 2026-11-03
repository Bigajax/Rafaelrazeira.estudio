-- ============================================================
-- AS FUNÇÕES DO SERVIDOR FECHADAS PARA A CHAVE PÚBLICA (03/11/2026)
--
-- O caso: ao conferir o supabase/turbinar.sql, a perf_registrar_turbinar
-- respondeu à chave anon (a pública, que vai no navegador): só não gravou
-- porque a loja do teste não existia. As irmãs perf_registrar_pagamento e
-- perf_registrar_upgrade, de 07/10, tinham o mesmo buraco. Com o id de uma
-- loja (que não é segredo: está no link de assinar), qualquer um somava dias
-- de Performance e de Turbinar, ou marcava um upgrade como pago, sem pagar.
--
-- A causa: no Supabase, função nova nasce com EXECUTE para anon e
-- authenticated (os privilégios padrão do esquema public). O
-- "revoke all ... from public" dos arquivos não tira esses dois.
--
-- Todas estas são chamadas só pelo servidor, com a service role
-- (lib/supabase-rest: o webhook do Mercado Pago e a conciliação). Rodar
-- de novo não estraga nada.
-- ============================================================
revoke execute on function public.perf_registrar_pagamento(uuid, text, text, numeric, int) from anon, authenticated;
revoke execute on function public.perf_registrar_upgrade(uuid, text, text, numeric) from anon, authenticated;
revoke execute on function public.perf_registrar_turbinar(uuid, text, text, numeric, int) from anon, authenticated;
revoke execute on function public.crm_sincronizar_devolucoes(uuid, text, jsonb, text) from anon, authenticated;
revoke execute on function public.crm_integracao_estado(uuid, text, text, text) from anon, authenticated;

grant execute on function public.perf_registrar_pagamento(uuid, text, text, numeric, int) to service_role;
grant execute on function public.perf_registrar_upgrade(uuid, text, text, numeric) to service_role;
grant execute on function public.perf_registrar_turbinar(uuid, text, text, numeric, int) to service_role;
grant execute on function public.crm_sincronizar_devolucoes(uuid, text, jsonb, text) to service_role;
grant execute on function public.crm_integracao_estado(uuid, text, text, text) to service_role;
