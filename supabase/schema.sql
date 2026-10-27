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

-- (El catálogo inicial se crea con cada espacio: ver create_household más abajo)

-- Espacios ----------------------------------------------------------------
-- Cada pareja tiene su espacio: sus recetas, su menú, su despensa y sus vales.
-- Cada persona está en un espacio; lo crea o se une al de su pareja con un código.
create table if not exists public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) between 1 and 60),
  invite_code text not null unique,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id      uuid not null unique references auth.users(id) on delete cascade,
  name         text,
  joined_at    timestamptz not null default now(),
  primary key (household_id, user_id)
);

alter table public.households enable row level security;
alter table public.household_members enable row level security;

-- El espacio de quien hace la consulta (security definer para no depender de las políticas)
create or replace function public.my_household()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select household_id from public.household_members where user_id = auth.uid() limit 1;
$$;
revoke all on function public.my_household() from public, anon;
grant execute on function public.my_household() to authenticated;

drop policy if exists "ver mi espacio" on public.households;
create policy "ver mi espacio" on public.households for select to authenticated using (id = (select public.my_household()));
drop policy if exists "renombrar mi espacio" on public.households;
create policy "renombrar mi espacio" on public.households for update to authenticated
  using (id = (select public.my_household())) with check (id = (select public.my_household()));
drop policy if exists "ver los miembros de mi espacio" on public.household_members;
create policy "ver los miembros de mi espacio" on public.household_members for select to authenticated
  using (household_id = (select public.my_household()));

-- Códigos de invitación de 6 caracteres, sin letras que se confundan (O/0, I/1)
create or replace function public.new_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.households where invite_code = code);
  end loop;
  return code;
end;
$$;
revoke all on function public.new_invite_code() from public, anon, authenticated;

-- Todo lo de la app es de un espacio; por defecto, del de quien lo guarda
alter table public.recipes       add column if not exists household_id uuid not null default public.my_household() references public.households(id) on delete cascade;
alter table public.meal_plan     add column if not exists household_id uuid not null default public.my_household() references public.households(id) on delete cascade;
alter table public.pantry        add column if not exists household_id uuid not null default public.my_household() references public.households(id) on delete cascade;
alter table public.vouchers      add column if not exists household_id uuid not null default public.my_household() references public.households(id) on delete cascade;
alter table public.voucher_kinds add column if not exists household_id uuid not null default public.my_household() references public.households(id) on delete cascade;
create index if not exists recipes_household_idx       on public.recipes (household_id);
create index if not exists pantry_household_idx        on public.pantry (household_id);
create index if not exists vouchers_household_idx      on public.vouchers (household_id);
create index if not exists voucher_kinds_household_idx on public.voucher_kinds (household_id);
create unique index if not exists meal_plan_household_slot_key on public.meal_plan (household_id, day, slot, position);


-- Cada tabla: solo lo de mi espacio
drop policy if exists "recetas para usuarios logueados" on public.recipes;
drop policy if exists "recetas de mi espacio" on public.recipes;
create policy "recetas de mi espacio" on public.recipes for all to authenticated
  using (household_id = (select public.my_household())) with check (household_id = (select public.my_household()));

drop policy if exists "menu para usuarios logueados" on public.meal_plan;
drop policy if exists "menú de mi espacio" on public.meal_plan;
create policy "menú de mi espacio" on public.meal_plan for all to authenticated
  using (household_id = (select public.my_household())) with check (household_id = (select public.my_household()));

drop policy if exists "catálogo de vales compartido" on public.voucher_kinds;
drop policy if exists "vales del catálogo de mi espacio" on public.voucher_kinds;
create policy "vales del catálogo de mi espacio" on public.voucher_kinds for all to authenticated
  using (household_id = (select public.my_household())) with check (household_id = (select public.my_household()));

drop policy if exists "despensa visible para el marcador" on public.pantry;
drop policy if exists "mi despensa" on public.pantry;
create policy "despensa de mi espacio para el marcador" on public.pantry for select to authenticated
  using (household_id = (select public.my_household()));
create policy "mi despensa" on public.pantry for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and household_id = (select public.my_household()));

drop policy if exists "vales visibles para los dos" on public.vouchers;
drop policy if exists "canjear mis vales" on public.vouchers;
drop policy if exists "la pareja marca visto o cumplido" on public.vouchers;
create policy "vales de mi espacio" on public.vouchers for select to authenticated
  using (household_id = (select public.my_household()));
create policy "canjear mis vales" on public.vouchers for insert to authenticated
  with check (user_id = (select auth.uid()) and household_id = (select public.my_household()));
create policy "la pareja marca visto o cumplido" on public.vouchers for update to authenticated
  using (user_id <> (select auth.uid()) and household_id = (select public.my_household()))
  with check (user_id <> (select auth.uid()) and household_id = (select public.my_household()));

-- Crear un espacio: quien lo crea entra en él y se le pone el catálogo de vales inicial
create or replace function public.create_household(p_name text, p_author text)
returns public.households
language plpgsql
security definer
set search_path = ''
as $$
declare h public.households;
begin
  if auth.uid() is null then raise exception 'Hay que entrar primero'; end if;
  if exists (select 1 from public.household_members where user_id = auth.uid()) then
    raise exception 'Ya estás en un espacio';
  end if;
  if length(trim(coalesce(p_name, ''))) = 0 then raise exception 'Ponle un nombre al espacio'; end if;
  insert into public.households (name, invite_code, created_by)
  values (left(trim(p_name), 60), public.new_invite_code(), auth.uid())
  returning * into h;
  insert into public.household_members (household_id, user_id, name) values (h.id, auth.uid(), p_author);
  insert into public.voucher_kinds (household_id, what, cost) values
    (h.id, 'elegir la peli', 3),
    (h.id, 'un masaje', 6),
    (h.id, 'un desayuno en la cama', 8),
    (h.id, 'un día de cine', 10),
    (h.id, 'una cena fuera', 15);
  return h;
end;
$$;

-- Unirse al espacio de la pareja con su código
create or replace function public.join_household(p_code text, p_author text)
returns public.households
language plpgsql
security definer
set search_path = ''
as $$
declare h public.households;
begin
  if auth.uid() is null then raise exception 'Hay que entrar primero'; end if;
  if exists (select 1 from public.household_members where user_id = auth.uid()) then
    raise exception 'Ya estás en un espacio';
  end if;
  select * into h from public.households where invite_code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if not found then raise exception 'Ese código no existe'; end if;
  insert into public.household_members (household_id, user_id, name) values (h.id, auth.uid(), p_author);
  return h;
end;
$$;

revoke all on function public.create_household(text, text) from public, anon;
revoke all on function public.join_household(text, text) from public, anon;
grant execute on function public.create_household(text, text) to authenticated;
grant execute on function public.join_household(text, text) to authenticated;

-- Al publicar: la clave del menú pasa a incluir el espacio (dos parejas pueden planear el mismo día)
alter table public.meal_plan drop constraint if exists meal_plan_pkey;
alter table public.meal_plan add constraint meal_plan_pkey primary key using index meal_plan_household_slot_key;
