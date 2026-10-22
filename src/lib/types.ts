import type { FoodGroup } from './nutrition';

export type MealType = 'comida' | 'cena';

export const MEAL_TYPES: MealType[] = ['comida', 'cena'];

export const MEAL_LABEL: Record<MealType, string> = {
  comida: 'Comida',
  cena: 'Cena',
};

export type Course = 'principal' | 'acompanamiento';

export const COURSES: Course[] = ['principal', 'acompanamiento'];

export const COURSE_LABEL: Record<Course, string> = {
  principal: 'Principal',
  acompanamiento: 'Acompañamiento',
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
  course: Course;
  /** Tipo de alimento elegido a mano; null = se deduce de los ingredientes */
  foodGroup: FoodGroup | null;
  thermomix: boolean;
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
  course: Course;
  foodGroup: FoodGroup | null;
  thermomix: boolean;
  instructions: string;
  photo: Blob | null;
  removePhoto: boolean;
}

/** Valores especiales del menú en vez de una receta: sobras de otros días o comer fuera */
export const LEFTOVERS = 'sobras';
export const EATING_OUT = 'fuera';

export type PlanPosition = 1 | 2;

export interface PlanEntry {
  /** Fecha en formato YYYY-MM-DD */
  day: string;
  slot: MealType;
  /** Cada comida o cena puede tener hasta dos platos */
  position: PlanPosition;
  /** id de una receta, LEFTOVERS o EATING_OUT */
  value: string;
}

/** Comida ganada al marcar una receta como cocinada (va a «Mi despensa») */
export interface PantryItem {
  id: string;
  recipeId: string | null;
  recipeTitle: string;
  /** Nombre del sprite de comida que se ha ganado */
  sprite: string;
  /** Hueco del menú en el que se cocinó, si se marcó desde la semana */
  day: string | null;
  slot: MealType | null;
  createdAt: string;
}

export type PantryDraft = Omit<PantryItem, 'id' | 'createdAt'>;
