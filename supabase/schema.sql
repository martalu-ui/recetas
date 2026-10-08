-- Ejecuta este script una vez en Supabase → SQL Editor → New query → Run.

-- Recetas ------------------------------------------------------------------
create table if not exists public.recipes (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  photo_url     text,
  ingredients   jsonb not null default '[]'::jsonb,   -- [{ "name": "pollo", "quantity": "300 g" }, ...]
  time_minutes  integer check (time_minutes is null or time_minutes >= 0),
  meal_types    text[] not null default '{}' check (meal_types <@ array['comida', 'cena']),
  instructions  text not null default '',
  created_by    text,
  created_at    timestamptz not null default now()
);

-- Menú semanal: una receta por día y franja (comida / cena) ----------------
create table if not exists public.meal_plan (
  day        date not null,
  slot       text not null check (slot in ('comida', 'cena')),
  recipe_id  uuid not null references public.recipes(id) on delete cascade,
  primary key (day, slot)
);

-- Solo los usuarios con sesión iniciada (vosotros dos) pueden leer y escribir.
alter table public.recipes   enable row level security;
alter table public.meal_plan enable row level security;

drop policy if exists "recetas para usuarios logueados" on public.recipes;
create policy "recetas para usuarios logueados" on public.recipes
  for all to authenticated using (true) with check (true);

drop policy if exists "menu para usuarios logueados" on public.meal_plan;
create policy "menu para usuarios logueados" on public.meal_plan
  for all to authenticated using (true) with check (true);

-- Fotos -------------------------------------------------------------------
-- Bucket público para poder mostrar las fotos con una URL normal;
-- solo los usuarios logueados pueden subir o borrar.
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do nothing;

drop policy if exists "subir fotos" on storage.objects;
create policy "subir fotos" on storage.objects
  for insert to authenticated with check (bucket_id = 'fotos');

drop policy if exists "borrar fotos" on storage.objects;
create policy "borrar fotos" on storage.objects
  for delete to authenticated using (bucket_id = 'fotos');
