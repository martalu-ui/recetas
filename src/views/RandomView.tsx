import { useEffect, useRef, useState } from 'react';
import { useData } from '../data';
import { formatMinutes, toISODate } from '../lib/dates';
import { pickRandom } from '../lib/match';
import { store } from '../lib/store';
import { MEAL_LABEL, type MealType, type Recipe } from '../lib/types';
import FoodSprite from '../components/FoodSprite';
import Chef from '../components/Chef';
import Icon from '../components/Icon';
import { MealTags } from '../components/RecipeCard';
import { useGlide } from '../lib/useGlide';

type Mood = 'todo' | 'comida' | 'cena' | 'rapida' | 'thermomix';

/** Filtros de la receta al azar, en tags encima de la receta */
const MOODS: { id: Mood; title: string; test(r: Recipe): boolean }[] = [
  { id: 'todo', title: 'Todo', test: () => true },
  { id: 'comida', title: 'Comer', test: (r) => r.mealTypes.includes('comida') },
  { id: 'cena', title: 'Cenar', test: (r) => r.mealTypes.includes('cena') },
  { id: 'rapida', title: 'Rápido', test: (r) => r.timeMinutes != null && r.timeMinutes <= 30 },
  { id: 'thermomix', title: 'Thermomix', test: (r) => r.thermomix },
];

/** Platos principales que cumplen el filtro; si no hay ninguno principal, cualquiera que lo cumpla */
function poolFor(recipes: Recipe[], mood: Mood): Recipe[] {
  const test = MOODS.find((m) => m.id === mood)!.test;
  const matching = recipes.filter(test);
  const mains = matching.filter((r) => r.course === 'principal');
  return mains.length ? mains : matching;
}

/**
 * Una receta protagonista: siempre hay una elegida (nunca inventada, solo de las vuestras).
 * `demo`: en el sistema de diseño, «Para hoy» no guarda nada.
 */
export default function RandomView({ demo = false }: { demo?: boolean }) {
  const { recipes, openRecipe } = useData();
  const [mood, setMood] = useState<Mood>('todo');
  const [resultId, setResultId] = useState<string | null>(null);
  /** Nombre que va pasando mientras el chef elige */
  const [rolling, setRolling] = useState<string | null>(null);
  const [todayOpen, setTodayOpen] = useState(false);
  /** Mensaje tras ponerla en el menú de hoy */
  const [added, setAdded] = useState<string | null>(null);
  const timer = useRef<number>();
  const moodsRef = useGlide<HTMLDivElement>();

  useEffect(() => () => window.clearInterval(timer.current), []);

  // Al abrir ya hay una receta elegida, sin animación
  useEffect(() => {
    if (resultId && recipes.some((r) => r.id === resultId)) return;
    setResultId(pickRandom(poolFor(recipes, mood))?.id ?? null);
  }, [recipes, resultId, mood]);

  const result = recipes.find((r) => r.id === resultId) ?? null;
  const pool = poolFor(recipes, mood);

  function roll(nextMood: Mood = mood) {
    const next = poolFor(recipes, nextMood);
    if (next.length === 0) return;
    setMood(nextMood);
    setAdded(null);
    setTodayOpen(false);
    const final = pickRandom(next, result ?? undefined)!;
    let ticks = 0;
    setRolling(pickRandom(next)!.title);
    window.clearInterval(timer.current);
    // Dura un poco más de una vuelta completa de la tortita
    timer.current = window.setInterval(() => {
      ticks++;
      if (ticks >= 14) {
        window.clearInterval(timer.current);
        setRolling(null);
        setResultId(final.id);
      } else {
        setRolling(pickRandom(next)!.title);
      }
    }, 110);
  }

  async function addToday(recipe: Recipe, slot: MealType) {
    try {
      if (!demo) await store.setPlan(toISODate(new Date()), slot, 1, recipe.id);
      setAdded(`En la ${MEAL_LABEL[slot].toLowerCase()} de hoy`);
      setTodayOpen(false);
    } catch (e) {
      setAdded(`No se ha podido guardar: ${(e as Error).message}`);
    }
  }

  return (
    <section className={rolling !== null ? 'feature rolling' : 'feature'}>
      <div ref={moodsRef} className="mood-tags segmented scroll-fade-x" role="group" aria-label="Filtrar la receta al azar">
        {MOODS.map((m) => (
          <button
            key={m.id}
            className={mood === m.id ? 'on' : ''}
            aria-pressed={mood === m.id}
            disabled={rolling !== null || poolFor(recipes, m.id).length === 0}
            onClick={() => roll(m.id)}
          >
            {m.title}
          </button>
        ))}
      </div>

      <button className="feature-card" onClick={() => result && rolling === null && openRecipe(result)} aria-live="polite">
        <span className="feature-media">
          {rolling !== null ? (
            <Chef size={150} />
          ) : result?.photoUrl ? (
            <img src={result.photoUrl} alt="" />
          ) : result ? (
            <FoodSprite recipe={result} size={128} />
          ) : (
            <Chef size={150} cooking={false} />
          )}
        </span>
        <span className="feature-body">
          <strong className="feature-title">{rolling ?? result?.title ?? 'Sin recetas para este filtro'}</strong>
          {rolling === null && result && (
            <span className="meta">
              <MealTags recipe={result} />
              {result.timeMinutes != null && <span className="time">{formatMinutes(result.timeMinutes)}</span>}
            </span>
          )}
        </span>
      </button>

      <div className="feature-actions">
        <button className="btn primary" onClick={() => roll()} disabled={rolling !== null || pool.length === 0}>
          <Icon name="dice" size={18} /> Otra
        </button>
        {result && (
          <button className="btn" onClick={() => setTodayOpen((o) => !o)} aria-expanded={todayOpen} disabled={rolling !== null}>
            Para hoy <span className={todayOpen ? 'caret open' : 'caret'} aria-hidden />
          </button>
        )}
        {todayOpen && result && (
          <span className="today-options">
            {(['comida', 'cena'] as MealType[]).map((slot) => (
              <button key={slot} className="select-tag" onClick={() => addToday(result, slot)}>
                {MEAL_LABEL[slot]}
              </button>
            ))}
          </span>
        )}
        {added && <span className="small feature-added">{added}</span>}
      </div>
    </section>
  );
}
