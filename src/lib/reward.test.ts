import { describe, expect, it } from 'vitest';
import { SPRITE_NAMES } from '../components/FoodSprite';
import { pickReward } from './reward';
import type { Recipe } from './types';

const salmon: Recipe = {
  id: 'salmon',
  title: 'Salmón al horno',
  photoUrl: null,
  ingredients: [{ name: 'Salmón', quantity: '' }],
  timeMinutes: null,
  mealTypes: ['cena'],
  course: 'principal',
  foodGroup: null,
  thermomix: false,
  instructions: '',
  createdBy: null,
  createdAt: '',
};

describe('pickReward', () => {
  it('la mitad de las veces da la comida de la receta', () => {
    expect(pickReward(salmon, () => 0.2)).toBe('fish');
  });

  it('si no, da cualquier comida de la colección', () => {
    const values = [0.7, 0.99];
    expect(pickReward(salmon, () => values.shift()!)).toBe(SPRITE_NAMES[SPRITE_NAMES.length - 1]);
  });
});
