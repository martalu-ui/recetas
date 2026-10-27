import { blobToDataUrl } from './image';
import type { Household } from './household';
import { byCost, DEFAULT_VOUCHERS, voucherTitle, type Voucher, type VoucherKind } from './vouchers';
import type { FoodGroup } from './nutrition';
import { PHOTO_BUCKET, supabase } from './supabase';
import { EATING_OUT, LEFTOVERS, type Course, type Ingredient, type MealType, type PantryDraft, type PantryItem, type PlanEntry, type PlanPosition, type Recipe, type RecipeDraft } from './types';

export interface DataStore {
  mode: 'local' | 'supabase';
  /** El espacio de quien ha entrado; null si aún no está en ninguno */
  getHousehold(author: string | null): Promise<Household | null>;
  createHousehold(name: string, author: string | null): Promise<void>;
  /** Unirse al espacio de la pareja con su código */
  joinHousehold(code: string, author: string | null): Promise<void>;
  listRecipes(): Promise<Recipe[]>;
  saveRecipe(draft: RecipeDraft, existing: Recipe | null, author: string | null): Promise<Recipe>;
  deleteRecipe(recipe: Recipe): Promise<void>;
  /** Entradas del menú entre dos fechas (YYYY-MM-DD, ambas incluidas) */
  listPlan(from: string, to: string): Promise<PlanEntry[]>;
  /** `value` es el id de una receta, LEFTOVERS, EATING_OUT, o null para vaciar el hueco */
  setPlan(day: string, slot: MealType, position: PlanPosition, value: string | null): Promise<void>;
  /** «Mi despensa»: comidas ganadas por quien ha entrado, la más reciente primero */
  listPantry(): Promise<PantryItem[]>;
  addPantry(item: PantryDraft, author: string | null): Promise<PantryItem>;
  removePantry(id: string): Promise<void>;
  /** Marcador de «¿Quién cocina más?»: comidas ganadas por cada persona */
  listScores(author: string | null): Promise<Score[]>;
  /** Vales de los dos, el más reciente primero */
  listVouchers(): Promise<Voucher[]>;
  /** Catálogo de vales, compartido y editable */
  listVoucherKinds(): Promise<VoucherKind[]>;
  /** Crea (sin id) o cambia un vale del catálogo */
  saveVoucherKind(kind: { id?: string; what: string; cost: number }): Promise<VoucherKind>;
  deleteVoucherKind(id: string): Promise<void>;
  /** Gasta comidas del bote en un vale para la pareja */
  redeemVoucher(kind: VoucherKind, author: string | null): Promise<Voucher>;
  /** La pareja ha visto el aviso / ha cumplido el vale */
  markVoucherSeen(id: string): Promise<void>;
  completeVoucher(id: string): Promise<void>;
  /** Avisa cuando cambian los vales (p. ej. la pareja canjea uno). Devuelve cómo dejar de escuchar */
  watchVouchers(onChange: () => void): () => void;
}

export interface Score {
  author: string;
  count: number;
  me: boolean;
}

function cleanIngredients(list: Ingredient[]): Ingredient[] {
  return list
    .map((i) => ({ name: i.name.trim(), quantity: i.quantity.trim() }))
    .filter((i) => i.name);
}

// ---------------------------------------------------------------------------
// Modo local: todo en localStorage. Útil para probar sin configurar nada,
// pero los datos NO se comparten entre dispositivos.
// ---------------------------------------------------------------------------

const LS_RECIPES = 'recetas.recipes';
const LS_PLAN = 'recetas.plan';
const LS_PANTRY = 'recetas.pantry';
const LS_VOUCHERS = 'recetas.vouchers';
const LS_VOUCHER_KINDS = 'recetas.voucherKinds';

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLS(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new Error('No queda espacio en el navegador. Configura Supabase para guardar más recetas y fotos.');
  }
}

/** Menú local; acepta el formato antiguo ({ recipeId }, un plato por hueco) */
function readLocalPlan(): PlanEntry[] {
  return readLS<(PlanEntry & { recipeId?: string })[]>(LS_PLAN, []).map(({ recipeId, ...p }) => ({
    ...p,
    position: p.position ?? 1,
    value: p.value ?? recipeId!,
  }));
}

const localStore: DataStore = {
  mode: 'local',
  // En local no hay cuentas: un único espacio de mentira para que la app y la vista previa funcionen igual
  async getHousehold(author) {
    return { id: 'local', name: 'MajoChef', inviteCode: 'MAJO42', members: [{ name: author ?? 'Tú', me: true }] };
  },
  async createHousehold() {},
  async joinHousehold() {},
  async listRecipes() {
    // Las recetas guardadas antes de existir estos campos se toman como principales
    return readLS<Recipe[]>(LS_RECIPES, []).map((r) => ({
      ...r,
      course: r.course ?? 'principal',
      foodGroup: r.foodGroup ?? null,
      thermomix: r.thermomix ?? false,
    }));
  },
  async saveRecipe(draft, existing, author) {
    const recipes = readLS<Recipe[]>(LS_RECIPES, []);
    let photoUrl = draft.removePhoto ? null : existing?.photoUrl ?? null;
    if (draft.photo) photoUrl = await blobToDataUrl(draft.photo);
    const recipe: Recipe = {
      id: existing?.id ?? crypto.randomUUID(),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      createdBy: existing?.createdBy ?? author,
      title: draft.title.trim(),
      ingredients: cleanIngredients(draft.ingredients),
      timeMinutes: draft.timeMinutes,
      mealTypes: draft.mealTypes,
      course: draft.course,
      foodGroup: draft.foodGroup,
      thermomix: draft.thermomix,
      instructions: draft.instructions.trim(),
      photoUrl,
    };
    const next = existing ? recipes.map((r) => (r.id === recipe.id ? recipe : r)) : [recipe, ...recipes];
    writeLS(LS_RECIPES, next);
    return recipe;
  },
  async deleteRecipe(recipe) {
    writeLS(LS_RECIPES, readLS<Recipe[]>(LS_RECIPES, []).filter((r) => r.id !== recipe.id));
    writeLS(LS_PLAN, readLocalPlan().filter((p) => p.value !== recipe.id));
  },
  async listPlan(from, to) {
    return readLocalPlan().filter((p) => p.day >= from && p.day <= to);
  },
  async setPlan(day, slot, position, value) {
    const plan = readLocalPlan().filter((p) => !(p.day === day && p.slot === slot && p.position === position));
    if (value) plan.push({ day, slot, position, value });
    writeLS(LS_PLAN, plan);
  },
  async listPantry() {
    return readLS<PantryItem[]>(LS_PANTRY, []).map((i) => ({ ...i, voucherId: i.voucherId ?? null }));
  },
  async addPantry(draft) {
    const item: PantryItem = { ...draft, id: crypto.randomUUID(), voucherId: null, createdAt: new Date().toISOString() };
    writeLS(LS_PANTRY, [item, ...readLS<PantryItem[]>(LS_PANTRY, [])]);
    return item;
  },
  async removePantry(id) {
    const items = readLS<PantryItem[]>(LS_PANTRY, []);
    if (items.find((i) => i.id === id)?.voucherId) throw new Error('esa comida ya está gastada en un vale');
    writeLS(LS_PANTRY, items.filter((i) => i.id !== id));
  },
  // En local no hay pareja: los vales quedan como tuyos y nadie los cumple
  async listVouchers() {
    return readLS<Voucher[]>(LS_VOUCHERS, []);
  },
  async listVoucherKinds() {
    return readLS<VoucherKind[]>(LS_VOUCHER_KINDS, DEFAULT_VOUCHERS).sort(byCost);
  },
  async saveVoucherKind({ id, what, cost }) {
    const kinds = readLS<VoucherKind[]>(LS_VOUCHER_KINDS, DEFAULT_VOUCHERS);
    const kind: VoucherKind = { id: id ?? crypto.randomUUID(), what: what.trim(), cost };
    writeLS(LS_VOUCHER_KINDS, id ? kinds.map((k) => (k.id === id ? kind : k)) : [...kinds, kind]);
    return kind;
  },
  async deleteVoucherKind(id) {
    writeLS(LS_VOUCHER_KINDS, readLS<VoucherKind[]>(LS_VOUCHER_KINDS, DEFAULT_VOUCHERS).filter((k) => k.id !== id));
  },
  async redeemVoucher(k, author) {
    const items = readLS<PantryItem[]>(LS_PANTRY, []);
    const free = items.filter((i) => !i.voucherId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    if (free.length < k.cost) throw new Error(`No tienes comidas suficientes: tienes ${free.length}, el vale cuesta ${k.cost}`);
    const voucher: Voucher = {
      id: crypto.randomUUID(),
      userId: null,
      author,
      kind: k.id,
      title: voucherTitle(k.what),
      cost: k.cost,
      status: 'pendiente',
      seenAt: null,
      doneAt: null,
      createdAt: new Date().toISOString(),
      mine: true,
    };
    const spent = new Set(free.slice(0, k.cost).map((i) => i.id));
    writeLS(LS_PANTRY, items.map((i) => (spent.has(i.id) ? { ...i, voucherId: voucher.id } : i)));
    writeLS(LS_VOUCHERS, [voucher, ...readLS<Voucher[]>(LS_VOUCHERS, [])]);
    return voucher;
  },
  async markVoucherSeen(id) {
    writeLS(LS_VOUCHERS, readLS<Voucher[]>(LS_VOUCHERS, []).map((v) => (v.id === id ? { ...v, seenAt: new Date().toISOString() } : v)));
  },
  async completeVoucher(id) {
    const now = new Date().toISOString();
    writeLS(LS_VOUCHERS, readLS<Voucher[]>(LS_VOUCHERS, []).map((v) => (v.id === id ? { ...v, status: 'cumplido', doneAt: now } : v)));
  },
  watchVouchers() {
    return () => {};
  },
  async listScores(author) {
    return [{ author: author ?? 'Tú', count: readLS<PantryItem[]>(LS_PANTRY, []).length, me: true }];
  },
};

// ---------------------------------------------------------------------------
// Modo Supabase: base de datos y fotos compartidas entre los dos.
// ---------------------------------------------------------------------------

interface RecipeRow {
  id: string;
  title: string;
  photo_url: string | null;
  ingredients: Ingredient[] | null;
  time_minutes: number | null;
  meal_types: MealType[] | null;
  course: Course | null;
  food_group: FoodGroup | null;
  thermomix: boolean | null;
  instructions: string | null;
  created_by: string | null;
  created_at: string;
}

function fromRow(row: RecipeRow): Recipe {
  return {
    id: row.id,
    title: row.title,
    photoUrl: row.photo_url,
    ingredients: row.ingredients ?? [],
    timeMinutes: row.time_minutes,
    mealTypes: row.meal_types ?? [],
    course: row.course ?? 'principal',
    foodGroup: row.food_group ?? null,
    thermomix: row.thermomix ?? false,
    instructions: row.instructions ?? '',
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

/** Ruta dentro del bucket a partir de la URL pública, para poder borrar la foto. */
function photoPath(url: string | null): string | null {
  const marker = `/object/public/${PHOTO_BUCKET}/`;
  const i = url?.indexOf(marker) ?? -1;
  return url && i >= 0 ? decodeURIComponent(url.slice(i + marker.length)) : null;
}

async function removePhoto(url: string | null) {
  const path = photoPath(url);
  if (path) await supabase!.storage.from(PHOTO_BUCKET).remove([path]);
}

const supabaseVouchers: Pick<DataStore, 'listVouchers' | 'listVoucherKinds' | 'saveVoucherKind' | 'deleteVoucherKind' | 'redeemVoucher' | 'markVoucherSeen' | 'completeVoucher' | 'watchVouchers'> = {
  async listVouchers() {
    const uid = await currentUserId();
    const rows = check(await supabase!.from('vouchers').select('*').order('created_at', { ascending: false }));
    return (rows as VoucherRow[]).map((r) => voucherFromRow(r, uid));
  },
  async listVoucherKinds() {
    const rows = check(await supabase!.from('voucher_kinds').select('id, what, cost').order('cost').order('what'));
    return rows as VoucherKind[];
  },
  async saveVoucherKind({ id, what, cost }) {
    const fields = { what: what.trim(), cost };
    const row = id
      ? check(await supabase!.from('voucher_kinds').update(fields).eq('id', id).select('id, what, cost').single())
      : check(await supabase!.from('voucher_kinds').insert(fields).select('id, what, cost').single());
    return row as VoucherKind;
  },
  async deleteVoucherKind(id) {
    check(await supabase!.from('voucher_kinds').delete().eq('id', id));
  },
  async redeemVoucher(k, author) {
    const row = check(await supabase!.rpc('redeem_voucher', { p_kind: k.id, p_title: voucherTitle(k.what), p_cost: k.cost, p_author: author }));
    return voucherFromRow(row as VoucherRow, await currentUserId());
  },
  async markVoucherSeen(id) {
    check(await supabase!.from('vouchers').update({ seen_at: new Date().toISOString() }).eq('id', id));
  },
  async completeVoucher(id) {
    check(await supabase!.from('vouchers').update({ status: 'cumplido', done_at: new Date().toISOString() }).eq('id', id));
  },
  watchVouchers(onChange) {
    const channel = supabase!
      .channel(`vales-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vouchers' }, onChange)
      .subscribe();
    return () => {
      supabase!.removeChannel(channel);
    };
  },
};

/** Espacio de quien ha entrado, para guardar el menú en el suyo */
let householdId: string | null = null;

const supabaseStore: DataStore = {
  mode: 'supabase',
  async getHousehold() {
    const uid = await currentUserId();
    const homes = check(await supabase!.from('households').select('id, name, invite_code').limit(1)) as { id: string; name: string; invite_code: string }[];
    if (!homes.length) {
      householdId = null;
      return null;
    }
    const members = check(await supabase!.from('household_members').select('user_id, name').order('joined_at')) as { user_id: string; name: string | null }[];
    householdId = homes[0].id;
    return {
      id: homes[0].id,
      name: homes[0].name,
      inviteCode: homes[0].invite_code,
      members: members.map((m) => ({ name: m.name ?? 'Alguien', me: m.user_id === uid })),
    };
  },
  async createHousehold(name, author) {
    check(await supabase!.rpc('create_household', { p_name: name.trim(), p_author: author }));
  },
  async joinHousehold(code, author) {
    check(await supabase!.rpc('join_household', { p_code: code, p_author: author }));
  },
  ...supabaseVouchers,
  async listRecipes() {
    const rows = check(await supabase!.from('recipes').select('*').order('created_at', { ascending: false }));
    return (rows as RecipeRow[]).map(fromRow);
  },
  async saveRecipe(draft, existing, author) {
    const sb = supabase!;
    let photoUrl = draft.removePhoto ? null : existing?.photoUrl ?? null;
    if (draft.photo) {
      const path = `${crypto.randomUUID()}.jpg`;
      check(await sb.storage.from(PHOTO_BUCKET).upload(path, draft.photo, { contentType: 'image/jpeg' }));
      photoUrl = sb.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
    }
    const fields = {
      title: draft.title.trim(),
      ingredients: cleanIngredients(draft.ingredients),
      time_minutes: draft.timeMinutes,
      meal_types: draft.mealTypes,
      course: draft.course,
      food_group: draft.foodGroup,
      thermomix: draft.thermomix,
      instructions: draft.instructions.trim(),
      photo_url: photoUrl,
    };
    const row = existing
      ? check(await sb.from('recipes').update(fields).eq('id', existing.id).select().single())
      : check(await sb.from('recipes').insert({ ...fields, created_by: author }).select().single());
    if (existing?.photoUrl && existing.photoUrl !== photoUrl) await removePhoto(existing.photoUrl);
    return fromRow(row as RecipeRow);
  },
  async deleteRecipe(recipe) {
    check(await supabase!.from('recipes').delete().eq('id', recipe.id));
    await removePhoto(recipe.photoUrl);
  },
  async listPlan(from, to) {
    const rows = check(await supabase!.from('meal_plan').select('*').gte('day', from).lte('day', to));
    type Row = { day: string; slot: MealType; position: PlanPosition; recipe_id: string | null; leftovers: boolean; eating_out: boolean };
    return (rows as Row[]).map((r) => ({
      day: r.day,
      slot: r.slot,
      position: r.position,
      value: r.leftovers ? LEFTOVERS : r.eating_out ? EATING_OUT : r.recipe_id!,
    }));
  },
  async setPlan(day, slot, position, value) {
    if (value) {
      const leftovers = value === LEFTOVERS;
      const eatingOut = value === EATING_OUT;
      check(
        await supabase!
          .from('meal_plan')
          .upsert(
            { household_id: householdId, day, slot, position, leftovers, eating_out: eatingOut, recipe_id: leftovers || eatingOut ? null : value },
            { onConflict: 'household_id,day,slot,position' },
          ),
      );
    } else {
      check(await supabase!.from('meal_plan').delete().eq('day', day).eq('slot', slot).eq('position', position));
    }
  },
  // En el bote cada uno ve solo lo suyo (todos pueden leer la tabla para el marcador)
  async listPantry() {
    const uid = await currentUserId();
    const rows = check(await supabase!.from('pantry').select('*').eq('user_id', uid).order('created_at', { ascending: false }));
    return (rows as PantryRow[]).map(pantryFromRow);
  },
  async addPantry(draft, author) {
    const row = check(
      await supabase!
        .from('pantry')
        .insert({ recipe_id: draft.recipeId, recipe_title: draft.recipeTitle, sprite: draft.sprite, day: draft.day, slot: draft.slot, author })
        .select()
        .single(),
    );
    return pantryFromRow(row as PantryRow);
  },
  async removePantry(id) {
    // Lo gastado en un vale no se puede quitar (se descuadraría lo canjeado)
    const rows = check(await supabase!.from('pantry').delete().eq('id', id).is('voucher_id', null).select('id')) as { id: string }[];
    if (rows.length === 0) throw new Error('esa comida ya está gastada en un vale');
  },
  async listScores(author) {
    const uid = await currentUserId();
    const rows = check(await supabase!.from('pantry').select('user_id, author')) as { user_id: string; author: string | null }[];
    const scores = new Map<string, Score>();
    for (const r of rows) {
      const me = r.user_id === uid;
      const s = scores.get(r.user_id) ?? { author: (me ? author : r.author) ?? 'Alguien', count: 0, me };
      s.count++;
      scores.set(r.user_id, s);
    }
    // Siempre sales tú, aunque aún no hayas cocinado nada
    if (uid && !scores.has(uid)) scores.set(uid, { author: author ?? 'Tú', count: 0, me: true });
    return [...scores.values()].sort((a, b) => b.count - a.count);
  },
};


interface VoucherRow {
  id: string;
  user_id: string;
  author: string | null;
  kind: string;
  title: string;
  cost: number;
  status: 'pendiente' | 'cumplido';
  seen_at: string | null;
  done_at: string | null;
  created_at: string;
}

function voucherFromRow(row: VoucherRow, uid: string | null): Voucher {
  return {
    id: row.id,
    userId: row.user_id,
    author: row.author,
    kind: row.kind,
    title: row.title,
    cost: row.cost,
    status: row.status,
    seenAt: row.seen_at,
    doneAt: row.done_at,
    createdAt: row.created_at,
    mine: row.user_id === uid,
  };
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase!.auth.getSession();
  return data.session?.user.id ?? null;
}

interface PantryRow {
  id: string;
  recipe_id: string | null;
  recipe_title: string;
  sprite: string;
  day: string | null;
  slot: MealType | null;
  voucher_id: string | null;
  created_at: string;
}

function pantryFromRow(row: PantryRow): PantryItem {
  return {
    id: row.id,
    recipeId: row.recipe_id,
    recipeTitle: row.recipe_title,
    sprite: row.sprite,
    day: row.day,
    slot: row.slot,
    voucherId: row.voucher_id,
    createdAt: row.created_at,
  };
}

export const store: DataStore = supabase ? supabaseStore : localStore;
