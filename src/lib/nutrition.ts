import { ingredientKey } from './match';
import type { Ingredient, Recipe } from './types';

export type FoodGroup = 'legumbres' | 'pescado' | 'carne' | 'huevos' | 'cereales' | 'verdura';

export const FOOD_GROUPS: FoodGroup[] = ['legumbres', 'pescado', 'carne', 'huevos', 'cereales', 'verdura'];

/**
 * Raciones por semana orientativas para los platos principales, según las recomendaciones de la AESAN:
 * legumbres al menos 4, pescado al menos 3, carne como mucho 3 y huevos hasta 4.
 * `target` reparte las 14 comidas y cenas de la semana.
 */
export const FOOD_GROUP_INFO: Record<FoodGroup, { label: string; icon: string; min?: number; max?: number; target: number }> = {
  legumbres: { label: 'Legumbres', icon: '🫘', min: 4, target: 4 },
  pescado: { label: 'Pescado', icon: '🐟', min: 3, target: 3 },
  carne: { label: 'Carne', icon: '🍗', max: 3, target: 3 },
  huevos: { label: 'Huevos', icon: '🥚', max: 4, target: 2 },
  cereales: { label: 'Pasta y arroz', icon: '🍝', target: 1 },
  verdura: { label: 'Verdura', icon: '🥦', target: 1 },
};

const KEYWORDS: Record<Exclude<FoodGroup, 'verdura'>, string[]> = {
  legumbres: ['lenteja', 'garbanzo', 'alubia', 'judia blanca', 'judion', 'fabe', 'frijol', 'hummu', 'soja texturizada'],
  pescado: [
    'pescado', 'merluza', 'salmon', 'atun', 'bacalao', 'gamba', 'langostino', 'sardina', 'boqueron', 'dorada', 'lubina', 'rape',
    'calamar', 'sepia', 'pulpo', 'mejillon', 'almeja', 'emperador', 'pez espada', 'trucha', 'caballa', 'anchoa', 'marisco', 'gula',
  ],
  carne: [
    'carne', 'pollo', 'pavo', 'ternera', 'cerdo', 'cordero', 'conejo', 'lomo', 'solomillo', 'chuleta', 'hamburguesa', 'salchicha',
    'costilla', 'pechuga', 'muslo', 'contramuslo', 'albondiga', 'secreto', 'presa', 'pluma', 'magro', 'entrecot', 'pato',
  ],
  huevos: ['huevo', 'tortilla'],
  cereales: [
    'arroz', 'risotto', 'paella', 'pasta', 'macarron', 'espagueti', 'spaghetti', 'tallarin', 'fideo', 'fideua', 'lasana', 'canelon',
    'ravioli', 'tortellini', 'noqui', 'gnocchi', 'quinoa', 'cuscus', 'pizza', 'gyoza', 'ramen', 'noodle', 'bulgur',
  ],
};

/** Embutidos que suelen ir como condimento: solo cuentan como carne si no hay otra base */
const MINOR_MEAT = ['jamon', 'bacon', 'beacon', 'panceta', 'chorizo', 'morcilla', 'tocino', 'lacon', 'salchichon'];

/** Ingredientes que no definen el plato: "caldo de pollo" no hace carne a un risotto */
const IGNORED = ['caldo', 'fumet', 'pastilla de caldo', 'avecrem'];

function hits(texts: string[], words: string[]): boolean {
  return texts.some((t) => words.some((w) => ` ${t} `.includes(` ${w} `)));
}

/** Tipo de alimento principal de un plato, deducido de su nombre e ingredientes */
export function inferFoodGroup(title: string, ingredients: Ingredient[]): FoodGroup {
  const ing = ingredients.map((i) => ingredientKey(i.name)).filter((k) => k && !IGNORED.some((w) => ` ${k} `.includes(` ${w} `) || k.startsWith(w)));
  const all = [ingredientKey(title), ...ing];
  if (hits(all, KEYWORDS.legumbres)) return 'legumbres';
  if (hits(all, KEYWORDS.pescado)) return 'pescado';
  if (hits(all, KEYWORDS.carne)) return 'carne';
  if (hits(all, KEYWORDS.cereales)) return 'cereales';
  if (hits(all, KEYWORDS.huevos)) return 'huevos';
  if (hits(all, MINOR_MEAT)) return 'carne';
  return 'verdura';
}

/** El tipo elegido en la receta o, si no se eligió, el deducido */
export function foodGroupOf(recipe: Recipe): FoodGroup {
  return recipe.foodGroup ?? inferFoodGroup(recipe.title, recipe.ingredients);
}

export type BalanceState = 'ok' | 'low' | 'high';

export function balanceState(group: FoodGroup, count: number): BalanceState {
  const { min, max } = FOOD_GROUP_INFO[group];
  if (max != null && count > max) return 'high';
  if (min != null && count < min) return 'low';
  return 'ok';
}

/** "al menos 4", "máx. 3" */
export function recommendation(group: FoodGroup): string {
  const { min, max } = FOOD_GROUP_INFO[group];
  if (min != null) return `mín. ${min}`;
  if (max != null) return `máx. ${max}`;
  return '';
}
