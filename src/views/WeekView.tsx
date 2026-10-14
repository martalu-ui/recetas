import { useCallback, useEffect, useMemo, useState } from 'react';
import { useData } from '../data';
import { addDays, shortDate, startOfWeek, toISODate, weekDays, weekdayName } from '../lib/dates';
import { pickRandom } from '../lib/match';
import { store } from '../lib/store';
import { LEFTOVERS, MEAL_LABEL, MEAL_TYPES, type Course, type MealType, type PlanPosition, type Recipe } from '../lib/types';
import Empty from './Empty';

const slotKey = (day: string, slot: MealType, position: PlanPosition) => `${day}|${slot}|${position}`;

/** El primer plato suele ser el principal y el segundo un acompañamiento */
const COURSE_FOR: Record<PlanPosition, Course> = { 1: 'principal', 2: 'acompanamiento' };

/** Recetas para un hueco: primero las de ese tipo y franja, luego las de ese tipo, luego cualquiera */
function candidates(recipes: Recipe[], slot: MealType, course: Course): Recipe[] {
  const ofCourse = recipes.filter((r) => r.course === course);
  const suited = ofCourse.filter((r) => r.mealTypes.includes(slot));
  return suited.length ? suited : ofCourse.length ? ofCourse : recipes;
}

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
      const entries = await store.listPlan(from, to);
      setPlan(new Map(entries.map((e) => [slotKey(e.day, e.slot, e.position), e.value])));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [from, to]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan, recipes]);

  async function assign(day: string, slot: MealType, position: PlanPosition, value: string | null) {
    const key = slotKey(day, slot, position);
    setPlan((p) => {
      const next = new Map(p);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
    try {
      await store.setPlan(day, slot, position, value);
    } catch (e) {
      setError(`No se ha podido guardar: ${(e as Error).message}`);
      loadPlan();
    }
  }

  function randomFor(day: string, slot: MealType, position: PlanPosition) {
    const current = recipes.find((r) => r.id === plan.get(slotKey(day, slot, position)));
    const pick = pickRandom(candidates(recipes, slot, COURSE_FOR[position]), current);
    if (pick) assign(day, slot, position, pick.id);
  }

  // Solo rellena el plato principal de cada comida y cena vacía
  async function fillEmpty() {
    for (const d of days) {
      for (const slot of MEAL_TYPES) {
        const day = toISODate(d);
        if (!plan.has(slotKey(day, slot, 1))) {
          const pick = pickRandom(candidates(recipes, slot, 'principal'));
          if (pick) await assign(day, slot, 1, pick.id);
        }
      }
    }
  }

  const [confirmClear, setConfirmClear] = useState(false);
  async function clearWeek() {
    setConfirmClear(false);
    for (const key of [...plan.keys()]) {
      const [day, slot, position] = key.split('|');
      await assign(day, slot as MealType, Number(position) as PlanPosition, null);
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
        {plan.size > 0 &&
          (confirmClear ? (
            <>
              <span className="muted small">¿Vaciar el menú de esta semana?</span>
              <button className="btn danger small" onClick={clearWeek}>
                Sí, vaciar
              </button>
              <button className="btn ghost small" onClick={() => setConfirmClear(false)}>
                No
              </button>
            </>
          ) : (
            <button className="btn ghost small" onClick={() => setConfirmClear(true)}>
              Vaciar semana
            </button>
          ))}
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
                  values={[plan.get(slotKey(day, slot, 1)) ?? '', plan.get(slotKey(day, slot, 2)) ?? '']}
                  onChange={(position, value) => assign(day, slot, position, value)}
                  onRandom={(position) => randomFor(day, slot, position)}
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
  values: [string, string];
  onChange(position: PlanPosition, value: string | null): void;
  onRandom(position: PlanPosition): void;
  onOpen(r: Recipe): void;
}) {
  const { slot, values } = props;
  const [showSecond, setShowSecond] = useState(false);
  const second = Boolean(values[1]) || showSecond;

  return (
    <div className={`slot slot-${slot}`}>
      <span className="slot-label">{MEAL_LABEL[slot]}</span>
      <Dish {...props} position={1} value={values[0]} />
      {second ? (
        <Dish
          {...props}
          position={2}
          value={values[1]}
          onChange={(p, v) => {
            if (!v) setShowSecond(false);
            props.onChange(p, v);
          }}
          onRemove={() => {
            setShowSecond(false);
            if (values[1]) props.onChange(2, null);
          }}
        />
      ) : (
        <button className="slot-add" onClick={() => setShowSecond(true)}>
          + Otro plato
        </button>
      )}
    </div>
  );
}

function Dish(props: {
  slot: MealType;
  recipes: Recipe[];
  position: PlanPosition;
  value: string;
  onChange(position: PlanPosition, value: string | null): void;
  onRandom(position: PlanPosition): void;
  onOpen(r: Recipe): void;
  onRemove?(): void;
}) {
  const { slot, recipes, position, value } = props;
  const recipe = recipes.find((r) => r.id === value) ?? null;
  const byName = (a: Recipe, b: Recipe) => a.title.localeCompare(b.title, 'es');

  // Ordenamos los grupos según el plato: en el primero salen antes los principales y en el segundo los acompañamientos
  const courseOrder: Course[] = position === 1 ? ['principal', 'acompanamiento'] : ['acompanamiento', 'principal'];
  const groups = [
    ...courseOrder.map((c) => ({
      label: `${c === 'principal' ? 'Principales' : 'Acompañamientos'} para ${slot}`,
      items: recipes.filter((r) => r.course === c && r.mealTypes.includes(slot)),
    })),
    { label: 'Otras', items: recipes.filter((r) => !r.mealTypes.includes(slot)) },
  ].filter((g) => g.items.length > 0);

  const label = `${MEAL_LABEL[slot]}, plato ${position}`;

  return (
    <div className="dish">
      <div className="slot-controls">
        <select
          value={value}
          onChange={(e) => props.onChange(position, e.target.value || null)}
          aria-label={label}
          className={value === LEFTOVERS ? 'leftovers' : undefined}
        >
          <option value="">{position === 1 ? '—' : '— Segundo plato —'}</option>
          <option value={LEFTOVERS}>🥡 Sobras</option>
          {groups.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {[...g.items].sort(byName).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button className="icon-btn" onClick={() => props.onRandom(position)} title="Elegir al azar" aria-label={`${label} al azar`}>
          🎲
        </button>
        {props.onRemove && (
          <button className="icon-btn" onClick={props.onRemove} title="Quitar segundo plato" aria-label={`Quitar ${label}`}>
            ×
          </button>
        )}
      </div>
      {recipe && (
        <button className="slot-open" onClick={() => props.onOpen(recipe)}>
          Ver receta →
        </button>
      )}
    </div>
  );
}
