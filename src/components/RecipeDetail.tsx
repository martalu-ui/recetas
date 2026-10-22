import { useState } from 'react';
import { useData } from '../data';
import { usePantry } from '../pantry';
import { formatMinutes } from '../lib/dates';
import { FOOD_GROUP_INFO, foodGroupOf } from '../lib/nutrition';
import type { Recipe } from '../lib/types';
import { MealTags, Photo } from './RecipeCard';

export default function RecipeDetail({ recipe, onDeleted }: { recipe: Recipe; onDeleted(): void }) {
  const { editRecipe, deleteRecipe } = useData();
  const pantry = usePantry();
  const [busy, setBusy] = useState(false);
  const times = pantry?.items.filter((i) => i.recipeId === recipe.id).length ?? 0;

  async function remove() {
    if (!confirm(`¿Borrar «${recipe.title}»? También se quitará del menú semanal.`)) return;
    setBusy(true);
    try {
      await deleteRecipe(recipe);
      onDeleted();
    } catch (e) {
      alert(`No se ha podido borrar: ${(e as Error).message}`);
      setBusy(false);
    }
  }

  return (
    <article className="detail">
      <Photo recipe={recipe} className="detail-photo" />
      <div className="detail-body">
        <h2>{recipe.title}</h2>
        <div className="meta">
          <MealTags recipe={recipe} />
          {recipe.timeMinutes != null && <span className="time">{formatMinutes(recipe.timeMinutes)}</span>}
          <span className="muted">
            {FOOD_GROUP_INFO[foodGroupOf(recipe)].label}
          </span>
          {recipe.createdBy && <span className="muted">Subida por {recipe.createdBy}</span>}
        </div>

        <h3>Ingredientes</h3>
        <ul className="ingredients">
          {recipe.ingredients.map((i, idx) => (
            <li key={idx}>
              <span>{i.name}</span>
              {i.quantity && <span className="muted">{i.quantity}</span>}
            </li>
          ))}
        </ul>

        {recipe.instructions && (
          <>
            <h3>Preparación</h3>
            <p className="instructions">{recipe.instructions}</p>
          </>
        )}

        {/* Se marca como hecha desde el menú de la semana; aquí solo se ve cuántas veces */}
        {times > 0 && <p className="muted small cook-count">{times === 1 ? 'La has cocinado 1 vez' : `La has cocinado ${times} veces`}</p>}

        <div className="actions">
          <button className="btn" onClick={() => editRecipe(recipe)} disabled={busy}>
            Editar
          </button>
          <button className="btn danger" onClick={remove} disabled={busy}>
            Borrar
          </button>
        </div>
      </div>
    </article>
  );
}
