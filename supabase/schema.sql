-- Ejecuta este script una vez en Supabase → SQL Editor → New query → Run.

-- Recetas ------------------------------------------------------------------
create table if not exists public.recipes (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  photo_url     text,
  ingredients   jsonb not null default '[]'::jsonb,   -- [{ "name": "pollo", "quantity": "300 g" }, ...]
  time_minutes  integer check (time_minutes is null or time_minutes >= 0),
  meal_types    text[] not null default '{}' check (meal_types <@ array['comida', 'cena']),
  course        text not null default 'principal' check (course in ('principal', 'acompanamiento')),
  thermomix     boolean not null default false,
  -- Tipo de alimento para equilibrar el menú; null = se deduce de los ingredientes
  food_group    text check (food_group in ('legumbres', 'pescado', 'carne', 'huevos', 'cereales', 'verdura')),
  instructions  text not null default '',
  created_by    text,
  created_at    timestamptz not null default now()
);

-- Menú semanal: hasta dos platos por día y franja (comida / cena) -----------
-- Cada plato es una receta nuestra, "sobras" (leftovers) o "comemos fuera" (eating_out).
create table if not exists public.meal_plan (
  day        date not null,
  slot       text not null check (slot in ('comida', 'cena')),
  position   smallint not null default 1 check (position in (1, 2)),
  recipe_id  uuid references public.recipes(id) on delete cascade,
  leftovers  boolean not null default false,
  eating_out boolean not null default false,
  primary key (day, slot, position),
  constraint meal_plan_receta_o_sobras check (leftovers or eating_out or recipe_id is not null)
);

create index if not exists meal_plan_recipe_id_idx on public.meal_plan (recipe_id);

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

-- Despensa ----------------------------------------------------------------
-- Cada vez que alguien marca que ha cocinado una receta gana una comida
-- pixel art (sprite). Cada uno añade y quita solo las suyas; todos pueden
-- leerlas para el marcador de «¿Quién cocina más?».
create table if not exists public.pantry (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  recipe_id    uuid references public.recipes(id) on delete set null,
  recipe_title text not null,
  sprite       text not null,
  day          date,
  slot         text check (slot in ('comida', 'cena')),
  author       text, -- nombre para el marcador
  created_at   timestamptz not null default now()
);

create index if not exists pantry_user_id_idx on public.pantry (user_id);
create index if not exists pantry_recipe_id_idx on public.pantry (recipe_id);

alter table public.pantry enable row level security;

drop policy if exists "mi despensa" on public.pantry;
create policy "mi despensa" on public.pantry
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "despensa visible para el marcador" on public.pantry;
create policy "despensa visible para el marcador" on public.pantry
  for select to authenticated using (true);
