import type { Recipe } from '../lib/types';

/** Recetas de ejemplo para enseñar los componentes (no son datos reales) */
function recipe(id: string, title: string, extra: Partial<Recipe>): Recipe {
  return {
    id,
    title,
    photoUrl: null,
    ingredients: [],
    timeMinutes: null,
    mealTypes: ['comida'],
    course: 'principal',
    foodGroup: null,
    thermomix: false,
    instructions: '',
    createdBy: null,
    createdAt: '2026-10-01T00:00:00Z',
    ...extra,
  };
}

const ing = (...names: string[]) => names.map((name) => ({ name, quantity: '' }));

export const SAMPLE_RECIPES: Recipe[] = [
  recipe('lentejas', 'Lentejas con verduras', { ingredients: ing('Lentejas', 'Zanahoria', 'Cebolla'), timeMinutes: 45, thermomix: true }),
  recipe('salmon', 'Salmón al horno', { ingredients: ing('Salmón', 'Limón', 'Patata'), mealTypes: ['comida', 'cena'], timeMinutes: 25 }),
  recipe('tortilla', 'Tortilla de patatas', { ingredients: ing('Huevos', 'Patatas', 'Cebolla'), mealTypes: ['cena'], timeMinutes: 30 }),
  recipe('crema', 'Crema de calabacín', { ingredients: ing('Calabacín', 'Puerro'), mealTypes: ['comida', 'cena'], course: 'acompanamiento', thermomix: true }),
  recipe('risotto', 'Risotto de setas', { ingredients: ing('Arroz', 'Champiñones', 'Caldo de verduras'), timeMinutes: 35 }),
  recipe('pollo', 'Pollo al curry', { ingredients: ing('Pollo', 'Curry', 'Leche de coco'), mealTypes: ['cena'] }),
];
