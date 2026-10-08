import { useEffect, useRef, useState } from 'react';
import { useData } from '../data';
import { formatMinutes } from '../lib/dates';
import { pickRandom } from '../lib/match';
import { MealTags, Photo } from '../components/RecipeCard';
import Empty from './Empty';
import MealFilter, { filterByMeal, type MealFilterValue } from './MealFilter';

export default function RandomView() {
  const { recipes, loading, openRecipe } = useData();
  const [meal, setMeal] = useState<MealFilterValue>('todas');
  const [resultId, setResultId] = useState<string | null>(null);
  const [rolling, setRolling] = useState<string | null>(null);
  const timer = useRef<number>();

  useEffect(() => () => window.clearInterval(timer.current), []);

  const pool = filterByMeal(recipes, meal);
  const result = recipes.find((r) => r.id === resultId) ?? null;

  // Solo elige entre nuestras recetas: nunca se inventa ninguna
  function roll() {
    if (pool.length === 0) return;
    const final = pickRandom(pool, result ?? undefined)!;
    let ticks = 0;
    window.clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      ticks++;
      if (ticks >= 12) {
        window.clearInterval(timer.current);
        setRolling(null);
        setResultId(final.id);
      } else {
        setRolling(pickRandom(pool)!.title);
      }
    }, 70);
  }

  if (loading) return <p className="muted">Cargando…</p>;
  if (recipes.length === 0) return <Empty text="Para sacar una receta al azar primero tenéis que subir alguna." />;

  return (
    <section className="random">
      <h1>¿Qué cocinamos hoy?</h1>
      <p className="muted">Una receta al azar de las {recipes.length} que tenemos.</p>

      <MealFilter value={meal} onChange={setMeal} allLabel="Cualquiera" />

      <button className="btn primary big dice" onClick={roll} disabled={pool.length === 0 || rolling !== null}>
        🎲 {result ? 'Otra' : '¡Dame una receta!'}
      </button>
      {pool.length === 0 && <p className="muted">No hay recetas marcadas para {meal}.</p>}

      {rolling !== null ? (
        <div className="random-result rolling">
          <h2>{rolling}</h2>
        </div>
      ) : (
        result && (
          <button className="random-result" onClick={() => openRecipe(result)}>
            <Photo recipe={result} />
            <div className="random-result-body">
              <h2>{result.title}</h2>
              <div className="meta">
                <MealTags recipe={result} />
                {result.timeMinutes != null && <span className="time">⏱ {formatMinutes(result.timeMinutes)}</span>}
              </div>
              <p className="muted">{result.ingredients.map((i) => i.name).join(' · ')}</p>
              <span className="link">Ver receta →</span>
            </div>
          </button>
        )
      )}
    </section>
  );
}
