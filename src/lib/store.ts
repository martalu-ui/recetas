import { blobToDataUrl } from './image';
import { PHOTO_BUCKET, supabase } from './supabase';
import { EATING_OUT, LEFTOVERS, type Course, type Ingredient, type MealType, type PlanEntry, type PlanPosition, type Recipe, type RecipeDraft } from './types';

export interface DataStore {
  mode: 'local' | 'supabase';
  listRecipes(): Promise<Recipe[]>;
  saveRecipe(draft: RecipeDraft, existing: Recipe | null, author: string | null): Promise<Recipe>;
  deleteRecipe(recipe: Recipe): Promise<void>;
  /** Entradas del menú entre dos fechas (YYYY-MM-DD, ambas incluidas) */
  listPlan(from: string, to: string): Promise<PlanEntry[]>;
  /** `value` es el id de una receta, LEFTOVERS, EATING_OUT, o null para vaciar el hueco */
  setPlan(day: string, slot: MealType, position: PlanPosition, value: string | null): Promise<void>;
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
  async listRecipes() {
    // Las recetas guardadas antes de existir estos campos se toman como principales
    return readLS<Recipe[]>(LS_RECIPES, []).map((r) => ({ ...r, course: r.course ?? 'principal', thermomix: r.thermomix ?? false }));
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

const supabaseStore: DataStore = {
  mode: 'supabase',
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
            { day, slot, position, leftovers, eating_out: eatingOut, recipe_id: leftovers || eatingOut ? null : value },
            { onConflict: 'day,slot,position' },
          ),
      );
    } else {
      check(await supabase!.from('meal_plan').delete().eq('day', day).eq('slot', slot).eq('position', position));
    }
  },
};

export const store: DataStore = supabase ? supabaseStore : localStore;
