import { FOOD_GROUP_INFO, FOOD_GROUPS, foodGroupOf, type FoodGroup } from './nutrition';
import type { Recipe } from './types';

export interface PickContext {
  /** Veces que ya sale cada receta en la semana */
  used: Map<string, number>;
  /** Platos principales de la semana por tipo de alimento */
  groupCounts: Record<FoodGroup, number>;
  /** Tipos de alimento de la otra comida del mismo día */
  sameDay: FoodGroup[];
  /** Tipos de alimento de la misma franja el día anterior y el siguiente */
  neighbours: FoodGroup[];
  random?: () => number;
}

export function emptyGroupCounts(): Record<FoodGroup, number> {
  return Object.fromEntries(FOOD_GROUPS.map((g) => [g, 0])) as Record<FoodGroup, number>;
}

/**
 * Elige el plato principal que mejor equilibra la semana:
 * - nunca repite una receta mientras queden otras sin usar,
 * - prioriza los tipos de alimento que van por debajo de lo recomendado y evita pasarse del máximo (p. ej. carne),
 * - evita repetir tipo en el mismo día o el mismo hueco del día anterior y siguiente,
 * - y añade algo de azar para que cada semana sea distinta.
 */
export function pickBalanced(candidates: Recipe[], ctx: PickContext): Recipe | undefined {
  if (candidates.length === 0) return undefined;
  const random = ctx.random ?? Math.random;
  const unused = candidates.filter((r) => !ctx.used.get(r.id));
  const pool = unused.length ? unused : candidates;

  let best: Recipe | undefined;
  let bestScore = -Infinity;
  for (const r of pool) {
    const g = foodGroupOf(r);
    const info = FOOD_GROUP_INFO[g];
    const count = ctx.groupCounts[g];
    let score = (info.target - count) * 2;
    if (info.max != null && count >= info.max) score -= 10;
    if (ctx.sameDay.includes(g)) score -= 3;
    score -= ctx.neighbours.filter((n) => n === g).length;
    score -= (ctx.used.get(r.id) ?? 0) * 10;
    score += random() * 1.5;
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return best;
}
