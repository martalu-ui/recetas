import { describe, expect, it } from 'vitest';
import { inferFoodGroup } from './nutrition';
import { emptyGroupCounts, pickBalanced, type PickContext } from './planner';
import type { Recipe } from './types';

function recipe(title: string, ingredients: string[]): Recipe {
  return {
    id: title,
    title,
    photoUrl: null,
    ingredients: ingredients.map((name) => ({ name, quantity: '' })),
    timeMinutes: null,
    mealTypes: ['comida', 'cena'],
    course: 'principal',
    foodGroup: null,
    thermomix: false,
    instructions: '',
    createdBy: null,
    createdAt: '',
  };
}

const ing = (names: string[]) => names.map((name) => ({ name, quantity: '' }));

describe('inferFoodGroup', () => {
  it('detecta el tipo de alimento de nuestros platos', () => {
    expect(inferFoodGroup('Lentejas majas', ing(['Cebolla', 'Lentejas', 'Caldo de verduras', 'Chorizo']))).toBe('legumbres');
    expect(inferFoodGroup('Emperador con patatas', ing(['Emperador']))).toBe('pescado');
    expect(inferFoodGroup('Fideua', ing(['Sepia', 'Fideua', 'Fumet']))).toBe('pescado');
    expect(inferFoodGroup('Pollo tikamasala', ing(['Pollo']))).toBe('carne');
    expect(inferFoodGroup('Hamburguesas', ing(['Carne de hamburguesa', 'Pan de cristal']))).toBe('carne');
    expect(inferFoodGroup('Tortilla', ing(['Huevos', 'Patatas', 'Cebolla']))).toBe('huevos');
    expect(inferFoodGroup('Crema de calabaza', ing(['Calabaza']))).toBe('verdura');
  });

  it('no se deja engañar por caldos ni embutidos de condimento', () => {
    expect(inferFoodGroup('Risotto de champis', ing(['Champiñones', 'Caldo de pollo', 'Tacos de Jamón']))).toBe('cereales');
    expect(inferFoodGroup('Carbonara', ing(['Pasta', 'Huevos', 'Beacon']))).toBe('cereales');
    expect(inferFoodGroup('Pizza casera', ing(['Masa de pizza', 'Beacon', 'Huevo']))).toBe('cereales');
  });
});

describe('pickBalanced', () => {
  const ctx = (over: Partial<PickContext> = {}): PickContext => ({
    used: new Map(),
    groupCounts: emptyGroupCounts(),
    sameDay: [],
    neighbours: [],
    random: () => 0.5,
    ...over,
  });

  it('no repite recetas mientras haya otras', () => {
    const a = recipe('Pollo asado', ['pollo']);
    const b = recipe('Pavo al horno', ['pavo']);
    expect(pickBalanced([a, b], ctx({ used: new Map([['Pollo asado', 1]]) }))).toBe(b);
  });

  it('si ya no quedan sin usar, repite la que menos sale', () => {
    const a = recipe('Pollo asado', ['pollo']);
    const b = recipe('Pavo al horno', ['pavo']);
    expect(pickBalanced([a, b], ctx({ used: new Map([['Pollo asado', 2], ['Pavo al horno', 1]]) }))).toBe(b);
  });

  it('prioriza lo que falta y no se pasa de carne', () => {
    const carne = recipe('Pollo asado', ['pollo']);
    const legumbres = recipe('Lentejas', ['lentejas']);
    const counts = { ...emptyGroupCounts(), carne: 3 };
    expect(pickBalanced([carne, legumbres], ctx({ groupCounts: counts }))).toBe(legumbres);
  });

  it('evita el mismo tipo dos veces el mismo día', () => {
    const p1 = recipe('Merluza', ['merluza']);
    const l1 = recipe('Garbanzos', ['garbanzos']);
    const counts = { ...emptyGroupCounts(), legumbres: 3, pescado: 2 };
    // a ambos les falta 1 para su objetivo; como hoy ya hay legumbres, gana el pescado
    expect(pickBalanced([l1, p1], ctx({ groupCounts: counts, sameDay: ['legumbres'] }))).toBe(p1);
  });

  it('rellena una semana entera sin repetir si hay recetas de sobra', () => {
    const names = ['lentejas', 'garbanzos', 'alubias', 'merluza', 'salmon', 'atun', 'pollo', 'ternera', 'pavo', 'huevo', 'arroz', 'calabacin', 'judia verde', 'pasta', 'bacalao', 'cerdo'];
    const recipes = names.map((n) => recipe(n, [n]));
    const used = new Map<string, number>();
    const counts = emptyGroupCounts();
    for (let i = 0; i < 14; i++) {
      const r = pickBalanced(recipes, ctx({ used, groupCounts: counts, random: Math.random }))!;
      expect(used.has(r.id)).toBe(false);
      used.set(r.id, 1);
      counts[inferFoodGroup(r.title, r.ingredients)]++;
    }
    expect(counts.carne).toBeLessThanOrEqual(3);
    expect(counts.legumbres).toBe(3); // solo hay 3 recetas de legumbres
    expect(counts.pescado).toBeGreaterThanOrEqual(3);
  });
});
