import { useCallback, useEffect, useMemo, useState } from 'react';
import { useData } from '../data';
import { addDays, shortDate, startOfWeek, toISODate, weekDays, weekdayName } from '../lib/dates';
import { pickRandom } from '../lib/match';
import { store } from '../lib/store';
import { MEAL_LABEL, MEAL_TYPES, type MealType, type PlanEntry, type Recipe } from '../lib/types';
import Empty from './Empty';

const slotKey = (day: string, slot: MealType) => `${day}|${slot}`;

export default function WeekView() {
  const { recipes, loading, openRecipe } = useData();
  const [monday, setMonday] = useState(() => startOfWeek(new Date()));
  const [plan, setPlan] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(() => weekDays(monday), [monday]);
  const from = toISODate(days[0]);
  const to = toISODate(days[6]);
  const today = toISODate(new Date());

  const loadPlan = useCallback(async () => {
    try {
      const entries: PlanEntry[] = await store.listPlan(from, to);
      setPlan(new Map(entries.map((e) => [slotKey(e.day, e.slot), e.recipeId])));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [from, to]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan, recipes]);

  async function assign(day: string, slot: MealType, recipeId: string | null) {
    const key = slotKey(day, slot);
    setPlan((p) => {
      const next = new Map(p);
      if (recipeId) next.set(key, recipeId);
      else next.delete(key);
      return next;
    });
    try {
      await store.setPlan(day, slot, recipeId);
    } catch (e) {
      setError(`No se ha podido guardar: ${(e as Error).message}`);
      loadPlan();
    }
  }

  const forSlot = (slot: MealType) => {
    const suited = recipes.filter((r) => r.mealTypes.includes(slot));
    return suited.length ? suited : recipes;
  };

  function randomFor(day: string, slot: MealType) {
    const current = recipes.find((r) => r.id === plan.get(slotKey(day, slot)));
    const pick = pickRandom(forSlot(slot), current);
    if (pick) assign(day, slot, pick.id);
  }

  async function fillEmpty() {
    for (const d of days) {
      for (const slot of MEAL_TYPES) {
        const day = toISODate(d);
        if (!plan.has(slotKey(day, slot))) {
          const pick = pickRandom(forSlot(slot));
          if (pick) await assign(day, slot, pick.id);
        }
      }
    }
  }

  async function clearWeek() {
    if (!confirm('¿Vaciar el menú de esta semana?')) return;
    for (const key of [...plan.keys()]) {
      const [day, slot] = key.split('|') as [string, MealType];
      await assign(day, slot, null);
    }
  }

  if (loading) return <p className="muted">Cargando…</p>;
  if (recipes.length === 0) return <Empty text="Subid recetas para poder organizar el menú de la semana." />;

  const isCurrentWeek = toISODate(startOfWeek(new Date())) === from;

  return (
    <section>
      <div className="view-header">
        <h1>Menú semanal</h1>
        <div className="week-nav">
          <button className="btn small" onClick={() => setMonday((m) => addDays(m, -7))} aria-label="Semana anterior">
            ‹
          </button>
          <span className="week-label">
            {shortDate(days[0])} – {shortDate(days[6])}
          </span>
          <button className="btn small" onClick={() => setMonday((m) => addDays(m, 7))} aria-label="Semana siguiente">
            ›
          </button>
          {!isCurrentWeek && (
            <button className="btn ghost small" onClick={() => setMonday(startOfWeek(new Date()))}>
              Hoy
            </button>
          )}
        </div>
      </div>

      <div className="toolbar">
        <button className="btn small" onClick={fillEmpty}>
          🎲 Rellenar huecos al azar
        </button>
        {plan.size > 0 && (
          <button className="btn ghost small" onClick={clearWeek}>
            Vaciar semana
          </button>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      <div className="week">
        {days.map((d) => {
          const day = toISODate(d);
          return (
            <div key={day} className={day === today ? 'day today' : 'day'}>
              <div className="day-head">
                <strong>{weekdayName(d)}</strong>
                <span className="muted">{shortDate(d)}</span>
              </div>
              {MEAL_TYPES.map((slot) => (
                <Slot
                  key={slot}
                  slot={slot}
                  recipes={recipes}
                  recipe={recipes.find((r) => r.id === plan.get(slotKey(day, slot))) ?? null}
                  onChange={(id) => assign(day, slot, id)}
                  onRandom={() => randomFor(day, slot)}
                  onOpen={openRecipe}
                />
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Slot(props: {
  slot: MealType;
  recipes: Recipe[];
  recipe: Recipe | null;
  onChange(id: string | null): void;
  onRandom(): void;
  onOpen(r: Recipe): void;
}) {
  const { slot, recipes, recipe } = props;
  const suited = recipes.filter((r) => r.mealTypes.includes(slot));
  const others = recipes.filter((r) => !r.mealTypes.includes(slot));
  const byName = (a: Recipe, b: Recipe) => a.title.localeCompare(b.title, 'es');

  return (
    <div className={`slot slot-${slot}`}>
      <span className="slot-label">{MEAL_LABEL[slot]}</span>
      <div className="slot-controls">
        <select value={recipe?.id ?? ''} onChange={(e) => props.onChange(e.target.value || null)} aria-label={MEAL_LABEL[slot]}>
          <option value="">—</option>
          <optgroup label={`Para ${slot}`}>
            {[...suited].sort(byName).map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </optgroup>
          {others.length > 0 && (
            <optgroup label="Otras">
              {[...others].sort(byName).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <button className="icon-btn" onClick={props.onRandom} title="Elegir al azar" aria-label={`${MEAL_LABEL[slot]} al azar`}>
          🎲
        </button>
      </div>
      {recipe && (
        <button className="slot-open" onClick={() => props.onOpen(recipe)}>
          Ver receta →
        </button>
      )}
    </div>
  );
}
