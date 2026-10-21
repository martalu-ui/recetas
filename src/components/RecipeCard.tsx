import type { ReactNode } from 'react';
import { formatMinutes } from '../lib/dates';
import { COURSE_LABEL, MEAL_LABEL, type Recipe } from '../lib/types';

export function MealTags({ recipe }: { recipe: Recipe }) {
  return (
    <>
      {recipe.mealTypes.map((t) => (
        <span key={t} className={`tag tag-${t}`}>
          {MEAL_LABEL[t]}
        </span>
      ))}
      {recipe.course === 'acompanamiento' && <span className="tag tag-course">{COURSE_LABEL.acompanamiento}</span>}
      {recipe.thermomix && <span className="tag tag-thermomix">Thermomix</span>}
    </>
  );
}

export function Photo({ recipe, className }: { recipe: Recipe; className?: string }) {
  return recipe.photoUrl ? (
    <img className={`photo ${className ?? ''}`} src={recipe.photoUrl} alt={recipe.title} loading="lazy" />
  ) : (
    <div className={`photo photo-empty ${className ?? ''}`} aria-hidden>
      <span>Sin foto</span>
    </div>
  );
}

export default function RecipeCard({ recipe, onClick, children }: { recipe: Recipe; onClick(): void; children?: ReactNode }) {
  return (
    <button className="recipe-card" onClick={onClick}>
      <Photo recipe={recipe} />
      <div className="recipe-card-body">
        <h3>{recipe.title}</h3>
        <div className="meta">
          <MealTags recipe={recipe} />
          {recipe.timeMinutes != null && <span className="time">{formatMinutes(recipe.timeMinutes)}</span>}
        </div>
        {children}
      </div>
    </button>
  );
}
