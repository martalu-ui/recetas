import { describe, expect, it } from 'vitest';
import { allIngredients, ingredientKey, ingredientsMatch, pickRandom, rankBySelectedIngredients } from './match';
import type { Recipe } from './types';

function recipe(title: string, ingredients: string[]): Recipe {
  return {
    id: title,
    title,
    photoUrl: null,
    ingredients: ingredients.map((name) => ({ name, quantity: '' })),
    timeMinutes: null,
    mealTypes: ['comida'],
    course: 'principal',
    foodGroup: null,
    thermomix: false,
    instructions: '',
    createdBy: null,
    createdAt: '',
  };
}

describe('ingredientes', () => {
  it('ignora mayúsculas, tildes y plurales', () => {
    expect(ingredientKey('Tomates')).toBe('tomate');
    expect(ingredientKey('Limones')).toBe('limon');
    expect(ingredientKey('limón')).toBe('limon');
    expect(ingredientKey('Pechugas de pollo')).toBe('pechuga de pollo');
  });

  it('coincide por palabras completas', () => {
    expect(ingredientsMatch('pechuga de pollo', 'pollo')).toBe(true);
    expect(ingredientsMatch('ajo', 'ajonjolí')).toBe(false);
    expect(ingredientsMatch('Huevos', 'huevo')).toBe(true);
  });

  it('lista ingredientes sin duplicados', () => {
    const list = allIngredients([recipe('a', ['Tomate', 'sal']), recipe('b', ['tomates', 'Tomate'])]);
    expect(list).toEqual(['sal', 'Tomate']);
  });
});

describe('rankBySelectedIngredients', () => {
  const tortilla = recipe('Tortilla', ['huevo', 'patata', 'cebolla', 'aceite']);
  const huevosFritos = recipe('Huevos fritos', ['huevo', 'aceite']);
  const ensalada = recipe('Ensalada', ['lechuga', 'tomate']);
  const all = [ensalada, tortilla, huevosFritos];

  it('pone primero la receta que usa más ingredientes elegidos', () => {
    const res = rankBySelectedIngredients(all, ['huevos', 'patatas', 'cebolla']);
    expect(res.map((r) => r.recipe.title)).toEqual(['Tortilla', 'Huevos fritos']);
    expect(res[0].missing).toEqual(['aceite']);
  });

  it('a igualdad, prefiere la que necesita menos cosas extra', () => {
    const res = rankBySelectedIngredients(all, ['huevo', 'aceite']);
    expect(res[0].recipe.title).toBe('Huevos fritos');
    expect(res[0].missing).toEqual([]);
  });

  it('solo devuelve recetas nuestras con algo en común', () => {
    expect(rankBySelectedIngredients(all, ['salmón'])).toEqual([]);
    expect(rankBySelectedIngredients(all, [])).toEqual([]);
  });
});

describe('pickRandom', () => {
  it('siempre devuelve un elemento de la lista y evita repetir', () => {
    const items = ['a', 'b'];
    for (let i = 0; i < 20; i++) expect(pickRandom(items, 'a')).toBe('b');
    expect(pickRandom([], 'a')).toBeUndefined();
    expect(pickRandom(['a'], 'a')).toBe('a');
  });
});
