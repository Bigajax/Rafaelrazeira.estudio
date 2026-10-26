-- 21/10/2026: o conceito do Marketing foi trocado (ver CATEGORIAS em
-- lib/marketing/tipos.ts). As editorias de 01/10 (tendencia, design,
-- ecommerce, educacional, vitrines) deram lugar às de design: por_dentro,
-- percepcao, construcao, antes_depois (e as da primeira troca do dia).
--
-- O mkt_pecas.categoria não tem trava, mas o mkt_referencias tem: sem esta
-- troca, guardar uma referência numa categoria nova é recusado. As chaves
-- antigas continuam aceitas, porque as referências e peças de antes ainda
-- carregam elas.
--
-- Rodar uma vez no SQL Editor do Supabase do estúdio.

alter table public.mkt_referencias drop constraint if exists mkt_referencias_categoria_check;
alter table public.mkt_referencias add constraint mkt_referencias_categoria_check check (
  categoria is null or categoria in (
    'por_dentro','percepcao','construcao','antes_depois','conta','analise','noticia','historia',
    'tendencia','design','ecommerce','educacional','vitrines'
  )
);
