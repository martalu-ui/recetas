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

-- Vales -------------------------------------------------------------------
-- Las comidas de la despensa se canjean por vales para la pareja (un masaje,
-- un día de cine…). Quien canjea es el dueño del vale; la otra persona se lo
-- debe, recibe el aviso y lo marca como visto y como cumplido.
create table if not exists public.vouchers (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  author     text, -- nombre de quien lo canjea
  kind       text not null, -- id del vale del catálogo (src/lib/vouchers.ts)
  title      text not null,
  cost       int not null check (cost > 0), -- comidas gastadas
  status     text not null default 'pendiente' check (status in ('pendiente', 'cumplido')),
  seen_at    timestamptz, -- cuando la pareja ha visto el aviso
  done_at    timestamptz,
  created_at timestamptz not null default now()
);

alter table public.vouchers enable row level security;

drop policy if exists "vales visibles para los dos" on public.vouchers;
create policy "vales visibles para los dos" on public.vouchers
  for select to authenticated using (true);

drop policy if exists "canjear mis vales" on public.vouchers;
create policy "canjear mis vales" on public.vouchers
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "la pareja marca visto o cumplido" on public.vouchers;
create policy "la pareja marca visto o cumplido" on public.vouchers
  for update to authenticated
  using (user_id <> (select auth.uid()))
  with check (user_id <> (select auth.uid()));

-- Las comidas gastadas en un vale salen del bote (pero siguen contando en el marcador)
alter table public.pantry add column if not exists voucher_id uuid references public.vouchers(id) on delete set null;
create index if not exists pantry_voucher_id_idx on public.pantry (voucher_id);

-- Canjear: comprueba que hay comidas suficientes, crea el vale y gasta las más antiguas, todo a la vez
create or replace function public.redeem_voucher(p_kind text, p_title text, p_cost int, p_author text)
returns public.vouchers
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v public.vouchers;
  available int;
begin
  select count(*) into available from public.pantry where user_id = auth.uid() and voucher_id is null;
  if available < p_cost then
    raise exception 'No tienes comidas suficientes: tienes %, el vale cuesta %', available, p_cost;
  end if;
  insert into public.vouchers (kind, title, cost, author) values (p_kind, p_title, p_cost, p_author) returning * into v;
  update public.pantry set voucher_id = v.id
  where id in (
    select id from public.pantry where user_id = auth.uid() and voucher_id is null order by created_at limit p_cost
  );
  return v;
end;
$$;

-- Avisos al momento a la pareja
alter publication supabase_realtime add table public.vouchers;

-- Catálogo de vales: compartido y editable por los dos desde Cuenta.
-- Cada vale es «Vale por <what>» y cuesta <cost> comidas.
create table if not exists public.voucher_kinds (
  id         uuid primary key default gen_random_uuid(),
  what       text not null check (length(trim(what)) > 0),
  cost       int not null check (cost > 0 and cost <= 999),
  created_at timestamptz not null default now()
);

alter table public.voucher_kinds enable row level security;

drop policy if exists "catálogo de vales compartido" on public.voucher_kinds;
create policy "catálogo de vales compartido" on public.voucher_kinds
  for all to authenticated using (true) with check (true);

-- Catálogo inicial, solo si está vacío
insert into public.voucher_kinds (what, cost)
select v.what, v.cost
from (values
  ('elegir la peli', 3),
  ('un «hoy friego yo»', 4),
  ('una siesta sin interrupciones', 5),
  ('un masaje', 6),
  ('un desayuno en la cama', 8),
  ('un día de cine', 10),
  ('una cena fuera', 15)
) as v(what, cost)
where not exists (select 1 from public.voucher_kinds);
