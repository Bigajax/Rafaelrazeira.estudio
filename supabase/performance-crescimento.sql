-- Comparação de mudanças usando eventos reais do central do estúdio.
-- Aplicar depois de performance.sql. Chave da loja apenas no servidor.
create or replace function public.perf_comparar_mudanca(chave text, quando timestamptz, produto text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  l public.perf_lojas;
  inicio_contagem timestamptz;
  antes jsonb;
  depois jsonb;
begin
  l := public.perf_loja_da_chave(chave);
  if l.id is null or not public.perf_liberada(l) then return null; end if;
  if quando is null or quando > now() or quando < now() - interval '400 days'
     or (produto is not null and (char_length(produto) > 160 or produto !~ '^[a-z0-9-]+$')) then return null; end if;
  if now() < quando + interval '7 days' then return jsonb_build_object('status','reunindo'); end if;
  select min(criado_em) into inicio_contagem from public.perf_eventos where loja_id = l.id;
  if inicio_contagem is null or inicio_contagem > quando - interval '7 days' then return jsonb_build_object('status','sem_base'); end if;
  select jsonb_build_object(
    'visitas',count(distinct visitante) filter (where (produto is null or tipo = 'peca')),
    'contatos',count(distinct visitante) filter (where tipo = 'whatsapp' and (produto is null or exists (
      select 1 from public.perf_eventos v where v.loja_id = l.id and v.visitante = e.visitante and v.peca = produto
        and v.tipo = 'peca' and v.criado_em >= quando - interval '7 days' and v.criado_em <= e.criado_em
    )))) into antes
  from public.perf_eventos e where loja_id = l.id and criado_em >= quando - interval '7 days' and criado_em < quando
    and (produto is null or peca = produto);
  select jsonb_build_object(
    'visitas',count(distinct visitante) filter (where (produto is null or tipo = 'peca')),
    'contatos',count(distinct visitante) filter (where tipo = 'whatsapp' and (produto is null or exists (
      select 1 from public.perf_eventos v where v.loja_id = l.id and v.visitante = e.visitante and v.peca = produto
        and v.tipo = 'peca' and v.criado_em >= quando and v.criado_em <= e.criado_em
    )))) into depois
  from public.perf_eventos e where loja_id = l.id and criado_em >= quando and criado_em < quando + interval '7 days'
    and (produto is null or peca = produto);
  return jsonb_build_object('status','pronto','antes',antes,'depois',depois);
end $$;
revoke all on function public.perf_comparar_mudanca(text,timestamptz,text) from public;
grant execute on function public.perf_comparar_mudanca(text,timestamptz,text) to anon,authenticated;
