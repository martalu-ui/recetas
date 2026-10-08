import { blobToDataUrl } from './image';
import { PHOTO_BUCKET, supabase } from './supabase';
import type { Ingredient, MealType, PlanEntry, Recipe, RecipeDraft } from './types';

export interface DataStore {
  mode: 'local' | 'supabase';
  listRecipes(): Promise<Recipe[]>;
  saveRecipe(draft: RecipeDraft, existing: Recipe | null, author: string | null): Promise<Recipe>;
  deleteRecipe(recipe: Recipe): Promise<void>;
  /** Entradas del menú entre dos fechas (YYYY-MM-DD, ambas incluidas) */
  listPlan(from: string, to: string): Promise<PlanEntry[]>;
  setPlan(day: string, slot: MealType, recipeId: string | null): Promise<void>;
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

const localStore: DataStore = {
  mode: 'local',
  async listRecipes() {
    return readLS<Recipe[]>(LS_RECIPES, []);
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
      instructions: draft.instructions.trim(),
      photoUrl,
    };
    const next = existing ? recipes.map((r) => (r.id === recipe.id ? recipe : r)) : [recipe, ...recipes];
    writeLS(LS_RECIPES, next);
    return recipe;
  },
  async deleteRecipe(recipe) {
    writeLS(LS_RECIPES, readLS<Recipe[]>(LS_RECIPES, []).filter((r) => r.id !== recipe.id));
    writeLS(LS_PLAN, readLS<PlanEntry[]>(LS_PLAN, []).filter((p) => p.recipeId !== recipe.id));
  },
  async listPlan(from, to) {
    return readLS<PlanEntry[]>(LS_PLAN, []).filter((p) => p.day >= from && p.day <= to);
  },
  async setPlan(day, slot, recipeId) {
    const plan = readLS<PlanEntry[]>(LS_PLAN, []).filter((p) => !(p.day === day && p.slot === slot));
    if (recipeId) plan.push({ day, slot, recipeId });
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
    return (rows as { day: string; slot: MealType; recipe_id: string }[]).map((r) => ({
      day: r.day,
      slot: r.slot,
      recipeId: r.recipe_id,
    }));
  },
  async setPlan(day, slot, recipeId) {
    if (recipeId) {
      check(await supabase!.from('meal_plan').upsert({ day, slot, recipe_id: recipeId }));
    } else {
      check(await supabase!.from('meal_plan').delete().eq('day', day).eq('slot', slot));
    }
  },
};

export const store: DataStore = supabase ? supabaseStore : localStore;
