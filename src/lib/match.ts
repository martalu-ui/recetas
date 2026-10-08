import type { Recipe } from './types';

/** minúsculas, sin tildes y sin espacios repetidos */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Singular aproximado en castellano: "tomates" → "tomate", "limones" → "limon". */
function singular(word: string): string {
  if (word.length <= 3) return word;
  if (/[rnld]es$/.test(word) && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('s')) return word.slice(0, -1);
  return word;
}

/** Clave para comparar ingredientes escritos de formas ligeramente distintas. */
export function ingredientKey(name: string): string {
  return normalize(name).split(' ').filter(Boolean).map(singular).join(' ');
}

/** "pollo" coincide con "pechuga de pollo" (y al revés), pero "ajo" no con "ajonjoli". */
export function ingredientsMatch(a: string, b: string): boolean {
  const ka = ingredientKey(a);
  const kb = ingredientKey(b);
  if (!ka || !kb) return false;
  return ` ${ka} `.includes(` ${kb} `) || ` ${kb} `.includes(` ${ka} `);
}

export interface RecipeMatch {
  recipe: Recipe;
  /** ingredientes seleccionados que lleva la receta */
  matched: string[];
  /** ingredientes de la receta que no están en la selección */
  missing: string[];
  /** 0..1, cuánto de la receta cubren los ingredientes seleccionados */
  coverage: number;
}

/**
 * Ordena nuestras recetas por parecido con los ingredientes elegidos:
 * primero las que usan más ingredientes seleccionados y, a igualdad, las que menos ingredientes extra necesitan.
 * Solo devuelve recetas con al menos un ingrediente en común.
 */
export function rankBySelectedIngredients(recipes: Recipe[], selected: string[]): RecipeMatch[] {
  if (selected.length === 0) return [];
  const results: RecipeMatch[] = [];
  for (const recipe of recipes) {
    const names = recipe.ingredients.map((i) => i.name).filter((n) => n.trim());
    const matched = selected.filter((s) => names.some((n) => ingredientsMatch(n, s)));
    if (matched.length === 0) continue;
    const missing = names.filter((n) => !selected.some((s) => ingredientsMatch(n, s)));
    const coverage = names.length ? (names.length - missing.length) / names.length : 0;
    results.push({ recipe, matched, missing, coverage });
  }
  return results.sort(
    (a, b) =>
      b.matched.length - a.matched.length ||
      a.missing.length - b.missing.length ||
      b.coverage - a.coverage ||
      a.recipe.title.localeCompare(b.recipe.title, 'es'),
  );
}

/** Todos los ingredientes distintos de nuestras recetas, con el nombre más usado de cada uno. */
export function allIngredients(recipes: Recipe[]): string[] {
  const byKey = new Map<string, Map<string, number>>();
  for (const r of recipes) {
    for (const ing of r.ingredients) {
      const label = ing.name.trim();
      const key = ingredientKey(label);
      if (!key) continue;
      const labels = byKey.get(key) ?? new Map<string, number>();
      labels.set(label, (labels.get(label) ?? 0) + 1);
      byKey.set(key, labels);
    }
  }
  return [...byKey.values()]
    .map((labels) => [...labels.entries()].sort((a, b) => b[1] - a[1])[0][0])
    .sort((a, b) => a.localeCompare(b, 'es'));
}

export function pickRandom<T>(items: T[], avoid?: T): T | undefined {
  if (items.length === 0) return undefined;
  const pool = items.length > 1 && avoid !== undefined ? items.filter((i) => i !== avoid) : items;
  return pool[Math.floor(Math.random() * pool.length)];
}
