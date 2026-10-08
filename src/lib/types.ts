export type MealType = 'comida' | 'cena';

export const MEAL_TYPES: MealType[] = ['comida', 'cena'];

export const MEAL_LABEL: Record<MealType, string> = {
  comida: 'Comida',
  cena: 'Cena',
};

export interface Ingredient {
  name: string;
  quantity: string;
}

export interface Recipe {
  id: string;
  title: string;
  photoUrl: string | null;
  ingredients: Ingredient[];
  timeMinutes: number | null;
  mealTypes: MealType[];
  instructions: string;
  createdBy: string | null;
  createdAt: string;
}

/** Datos del formulario. `photo` es una foto nueva ya comprimida; `removePhoto` borra la actual. */
export interface RecipeDraft {
  title: string;
  ingredients: Ingredient[];
  timeMinutes: number | null;
  mealTypes: MealType[];
  instructions: string;
  photo: Blob | null;
  removePhoto: boolean;
}

export interface PlanEntry {
  /** Fecha en formato YYYY-MM-DD */
  day: string;
  slot: MealType;
  recipeId: string;
}
