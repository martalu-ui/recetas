import { MEAL_LABEL, MEAL_TYPES, type MealType, type Recipe } from '../lib/types';

export type MealFilterValue = MealType | 'todas';

export function filterByMeal(recipes: Recipe[], filter: MealFilterValue): Recipe[] {
  return filter === 'todas' ? recipes : recipes.filter((r) => r.mealTypes.includes(filter));
}

export default function MealFilter({ value, onChange, allLabel = 'Todas' }: { value: MealFilterValue; onChange(v: MealFilterValue): void; allLabel?: string }) {
  const options: MealFilterValue[] = ['todas', ...MEAL_TYPES];
  return (
    <div className="segmented" role="group" aria-label="Filtrar por comida o cena">
      {options.map((o) => (
        <button key={o} className={o === value ? 'on' : ''} aria-pressed={o === value} onClick={() => onChange(o)}>
          {o === 'todas' ? allLabel : MEAL_LABEL[o]}
        </button>
      ))}
    </div>
  );
}
