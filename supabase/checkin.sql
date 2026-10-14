-- ============================================================
-- O CHECK-IN DAS FOTOS (14/10/2026): o bucket privado `checkin`
-- Ver lib/checkin.ts. Cole no Supabase do estúdio → SQL Editor → Run.
--
-- SEM policy nenhuma de propósito: ninguém logado ou anônimo lê nem
-- escreve. Só a chave de serviço (a /api/checkin e o
-- scripts/baixar-checkin.ts) entra, e o navegador do dono sobe pela URL
-- assinada que a rota entrega uma por foto. Assim a armadilha do
-- "qualquer logado" não volta pela porta do storage.
-- 30 MB por foto: foto de celular cabe com folga.
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('checkin', 'checkin', false, 31457280,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/json'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
