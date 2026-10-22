import { useEffect, useRef, useState } from 'react';
import { useData } from '../data';
import { formatMinutes } from '../lib/dates';
import { pickRandom } from '../lib/match';
import { store } from '../lib/store';
import { toISODate } from '../lib/dates';
import { MEAL_LABEL, type MealType, type Recipe } from '../lib/types';
import FoodSprite from '../components/FoodSprite';
import Chef from '../components/Chef';
import Icon from '../components/Icon';
import { MealTags } from '../components/RecipeCard';

type Mood = 'todo' | 'comida' | 'cena' | 'rapida' | 'thermomix';

/** Atajos para sacar una receta al azar con un criterio (como las tarjetas de colores de la referencia) */
const MOODS: { id: Exclude<Mood, 'todo'>; title: string; hint: string; test(r: Recipe): boolean }[] = [
  { id: 'comida', title: 'Para comer', hint: 'Algo para mediodía', test: (r) => r.mealTypes.includes('comida') },
  { id: 'cena', title: 'Para cenar', hint: 'Algo para la noche', test: (r) => r.mealTypes.includes('cena') },
  { id: 'rapida', title: 'Algo rápido', hint: 'En 30 min o menos', test: (r) => r.timeMinutes != null && r.timeMinutes <= 30 },
  { id: 'thermomix', title: 'Con Thermomix', hint: 'Que lo haga ella', test: (r) => r.thermomix },
];

/** Platos principales que cumplen el criterio; si no hay ninguno principal, cualquiera que lo cumpla */
function poolFor(recipes: Recipe[], mood: Mood): Recipe[] {
  const test = MOODS.find((m) => m.id === mood)?.test ?? (() => true);
  const matching = recipes.filter(test);
  const mains = matching.filter((r) => r.course === 'principal');
  return mains.length ? mains : matching;
}

/** `demo`: en el sistema de diseño, «Para hoy» no guarda nada */
export default function RandomView({ demo = false }: { demo?: boolean }) {
  const { recipes, openRecipe } = useData();
  const [mood, setMood] = useState<Mood>('todo');
  const [resultId, setResultId] = useState<string | null>(null);
  const [rolling, setRolling] = useState<string | null>(null);
  /** Mensaje tras ponerla en el menú de hoy */
  const [added, setAdded] = useState<string | null>(null);
  const timer = useRef<number>();

  useEffect(() => () => window.clearInterval(timer.current), []);

  const result = recipes.find((r) => r.id === resultId) ?? null;

  // Solo elige entre nuestras recetas: nunca se inventa ninguna
  function roll(nextMood: Mood = mood) {
    const pool = poolFor(recipes, nextMood);
    if (pool.length === 0) return;
    setMood(nextMood);
    setAdded(null);
    const final = pickRandom(pool, result ?? undefined)!;
    let ticks = 0;
    setRolling(pickRandom(pool)!.title);
    window.clearInterval(timer.current);
    // Dura un poco más de una vuelta completa de la tortita
    timer.current = window.setInterval(() => {
      ticks++;
      if (ticks >= 14) {
        window.clearInterval(timer.current);
        setRolling(null);
        setResultId(final.id);
      } else {
        setRolling(pickRandom(pool)!.title);
      }
    }, 110);
  }

  async function addToday(recipe: Recipe, slot: MealType) {
    try {
      if (!demo) await store.setPlan(toISODate(new Date()), slot, 1, recipe.id);
      setAdded(`Puesta en la ${MEAL_LABEL[slot].toLowerCase()} de hoy`);
    } catch (e) {
      setAdded(`No se ha podido guardar: ${(e as Error).message}`);
    }
  }

  const moodTitle = MOODS.find((m) => m.id === mood)?.title;

  return (
    <section className="discover-random">
      <div className="hero">
        <div className="hero-head">
          <h2>Una receta al azar</h2>
          <p>
            {moodTitle ? `${moodTitle}, al azar entre nuestras recetas` : `Una de nuestras ${recipes.length} recetas, al azar`}
            {mood !== 'todo' && (
              <button className="hero-clear" onClick={() => setMood('todo')}>
                Quitar filtro ×
              </button>
            )}
          </p>
        </div>

        {rolling !== null ? (
          <div className="hero-stage rolling" aria-live="polite">
            <Chef size={112} />
            <span className="hero-stage-text">
              <span className="muted small">Pensando…</span>
              <strong>{rolling}</strong>
            </span>
          </div>
        ) : result ? (
          <div className="hero-stage result">
            <button className="hero-pick" onClick={() => openRecipe(result)}>
              <span className="hero-sprite">
                {result.photoUrl ? <img src={result.photoUrl} alt="" /> : <FoodSprite recipe={result} size={64} />}
              </span>
              <span className="hero-result-body">
                <strong>{result.title}</strong>
                <span className="meta">
                  <MealTags recipe={result} />
                  {result.timeMinutes != null && <span className="time">{formatMinutes(result.timeMinutes)}</span>}
                </span>
                <span className="hero-link">Ver receta →</span>
              </span>
            </button>
            <div className="hero-today">
              <span className="muted small">Para hoy:</span>
              {(['comida', 'cena'] as MealType[]).map((slot) => (
                <button key={slot} className={`chip slot-chip-${slot}`} onClick={() => addToday(result, slot)}>
                  {MEAL_LABEL[slot]}
                </button>
              ))}
              {added && <span className="small hero-added">{added}</span>}
            </div>
          </div>
        ) : (
          <div className="hero-stage empty">
            <Chef size={96} cooking={false} />
            <span className="hero-stage-text">
              <strong>¿No sabéis qué hacer?</strong>
              <span className="muted">Tira el dado y el chef elige entre vuestras recetas.</span>
            </span>
          </div>
        )}

        <button className="btn hero-roll" onClick={() => roll()} disabled={rolling !== null || poolFor(recipes, mood).length === 0}>
          <Icon name="dice" size={20} /> {result ? 'Otra' : '¡Dame una!'}
        </button>
      </div>

      <div className="moods" aria-label="Al azar con un criterio">
        {MOODS.map((m) => {
          const count = poolFor(recipes, m.id).length;
          return (
            <button
              key={m.id}
              className={`mood mood-${m.id}${mood === m.id ? ' on' : ''}`}
              onClick={() => roll(m.id)}
              disabled={count === 0 || rolling !== null}
              aria-pressed={mood === m.id}
            >
              <strong>{m.title}</strong>
              <span>{m.hint}</span>
              <span className="mood-count">{count === 1 ? '1 receta' : `${count} recetas`}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
