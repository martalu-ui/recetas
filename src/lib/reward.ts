import { SPRITE_NAMES, spriteForRecipe, type SpriteName } from '../components/FoodSprite';
import type { Recipe } from './types';

/** Comida que se gana al cocinar: la mitad de las veces la de la receta; si no, una cualquiera para que haya variedad */
export function pickReward(recipe: Recipe, random = Math.random): SpriteName {
  if (random() < 0.5) return spriteForRecipe(recipe);
  return SPRITE_NAMES[Math.floor(random() * SPRITE_NAMES.length)];
}
