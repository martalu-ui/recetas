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
  thermomix: boolean;
  instructions: string;
  photo: Blob | null;
  removePhoto: boolean;
}

/** Valor especial del menú para "sobras" de otros días (en vez de una receta) */
export const LEFTOVERS = 'sobras';

export type PlanPosition = 1 | 2;

export interface PlanEntry {
  /** Fecha en formato YYYY-MM-DD */
  day: string;
  slot: MealType;
  /** Cada comida o cena puede tener hasta dos platos */
  position: PlanPosition;
  /** id de una receta o LEFTOVERS */
  value: string;
}
