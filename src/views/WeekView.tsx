import { useCallback, useEffect, useMemo, useState } from 'react';
import { useData } from '../data';
import { addDays, shortDate, startOfWeek, toISODate, weekDays, weekdayName } from '../lib/dates';
import { pickRandom } from '../lib/match';
import { balanceState, FOOD_GROUP_INFO, FOOD_GROUPS, foodGroupOf, recommendation, type FoodGroup } from '../lib/nutrition';
import { emptyGroupCounts, pickBalanced, type PickContext } from '../lib/planner';
import { store } from '../lib/store';
import { EATING_OUT, LEFTOVERS, MEAL_LABEL, MEAL_TYPES, type Course, type MealType, type PlanPosition, type Recipe } from '../lib/types';
import Icon, { type IconName } from '../components/Icon';
import { usePantry } from '../pantry';
import Empty from './Empty';

const slotKey = (day: string, slot: MealType, position: PlanPosition) => `${day}|${slot}|${position}`;

/** Recetas para un hueco: primero las de ese tipo y franja, luego las de ese tipo, luego cualquiera */
function candidates(recipes: Recipe[], slot: MealType, course: Course): Recipe[] {
  const ofCourse = recipes.filter((r) => r.course === course);
  const suited = ofCourse.filter((r) => r.mealTypes.includes(slot));
  return suited.length ? suited : ofCourse.length ? ofCourse : recipes;
}

export default function WeekView() {
  const { recipes, loading, openRecipe } = useData();
  const pantry = usePantry();
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

  /** Marcar un plato de hoy o de días pasados como hecho (o desmarcarlo) */
  function cookProps(day: string, slot: MealType) {
    const recipeAt = (position: PlanPosition) => recipes.find((r) => r.id === plan.get(slotKey(day, slot, position)));
    return {
      cooked: (position: PlanPosition) => {
        const r = recipeAt(position);
        return Boolean(r && pantry!.cookedAt(day, slot, r.id));
      },
      onCook: async (position: PlanPosition) => {
        const r = recipeAt(position);
        if (!r) return;
        const done = pantry!.cookedAt(day, slot, r.id);
        try {
          if (done) await pantry!.uncook(done);
          else await pantry!.cook(r, { day, slot });
        } catch (e) {
          setError(`No se ha podido guardar: ${(e as Error).message}`);
        }
      },
    };
  }

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

  const byId = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);

  /** Lo que ya hay en la semana (sin contar el hueco `skip`) para elegir sin repetir y equilibrando */
  function contextFor(current: Map<string, string>, day: string, slot: MealType, skip: string): PickContext {
    const used = new Map<string, number>();
    const groupCounts = emptyGroupCounts();
    for (const [key, value] of current) {
      const r = byId.get(value);
      if (key === skip || !r) continue;
      used.set(r.id, (used.get(r.id) ?? 0) + 1);
      if (r.course === 'principal') groupCounts[foodGroupOf(r)]++;
    }
    const groupsAt = (d: string, s: MealType) =>
      ([1, 2] as PlanPosition[])
        .map((p) => byId.get(current.get(slotKey(d, s, p)) ?? ''))
        .filter((r): r is Recipe => !!r && r.course === 'principal')
        .map(foodGroupOf);
    const date = new Date(`${day}T12:00:00`);
    const other: MealType = slot === 'comida' ? 'cena' : 'comida';
    return {
      used,
      groupCounts,
      sameDay: groupsAt(day, other),
      neighbours: [...groupsAt(toISODate(addDays(date, -1)), slot), ...groupsAt(toISODate(addDays(date, 1)), slot)],
    };
  }

  function randomFor(day: string, slot: MealType, position: PlanPosition) {
    const key = slotKey(day, slot, position);
    const ctx = contextFor(plan, day, slot, key);
    const current = byId.get(plan.get(key) ?? '');
    let pick: Recipe | undefined;
    if (position === 1) {
      // Excluimos la actual para que el dado siempre cambie el plato
      const options = candidates(recipes, slot, 'principal');
      pick = pickBalanced(options.length > 1 ? options.filter((r) => r !== current) : options, ctx);
    } else {
      const options = candidates(recipes, slot, 'acompanamiento');
      const unused = options.filter((r) => !ctx.used.has(r.id));
      pick = pickRandom(unused.length ? unused : options, current);
    }
    if (pick) assign(day, slot, position, pick.id);
  }

  // Rellena el plato principal de cada comida y cena vacía, sin repetir recetas y equilibrando la semana
  async function fillEmpty() {
    const working = new Map(plan);
    for (const d of days) {
      for (const slot of MEAL_TYPES) {
        const day = toISODate(d);
        const key = slotKey(day, slot, 1);
        if (working.has(key)) continue;
        const pick = pickBalanced(candidates(recipes, slot, 'principal'), contextFor(working, day, slot, key));
        if (!pick) continue;
        working.set(key, pick.id);
        await assign(day, slot, 1, pick.id);
      }
    }
  }

  // Cuántos platos principales de cada tipo hay esta semana
  const weekCounts = emptyGroupCounts();
  let repeated = 0;
  {
    const seen = new Set<string>();
    for (const value of plan.values()) {
      const r = byId.get(value);
      if (!r) continue;
      if (seen.has(r.id)) repeated++;
      seen.add(r.id);
      if (r.course === 'principal') weekCounts[foodGroupOf(r)]++;
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
  // En la semana actual, hoy va el primero (sin tener que bajar) y los días que ya pasaron, al final
  const todayIndex = isCurrentWeek ? days.findIndex((d) => toISODate(d) === today) : 0;
  const orderedDays = [...days.slice(todayIndex), ...days.slice(0, todayIndex)];

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

      <DayStrip days={days} today={today} hasPlan={(day) => MEAL_TYPES.some((s) => plan.has(slotKey(day, s, 1)))} />

      <div className="toolbar">
        <button className="btn small" onClick={fillEmpty}>
          <Icon name="dice" size={18} /> Rellenar huecos al azar
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
        {orderedDays.map((d) => {
          const day = toISODate(d);
          const past = isCurrentWeek && day < today;
          return (
            <div key={day} id={`dia-${day}`} className={day === today ? 'day today' : past ? 'day past' : 'day'}>
              <div className="day-head">
                <strong>{weekdayName(d)}</strong>
                {day === today && <span className="today-badge">Hoy</span>}
                {past && <span className="muted small">Ya pasó</span>}
                <span className="muted day-date">{shortDate(d)}</span>
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
                  {...(pantry && day <= today ? cookProps(day, slot) : {})}
                />
              ))}
            </div>
          );
        })}
      </div>

      <WeekBalance counts={weekCounts} repeated={repeated} />
    </section>
  );
}

export function Slot(props: {
  slot: MealType;
  recipes: Recipe[];
  values: [string, string];
  onChange(position: PlanPosition, value: string | null): void;
  onRandom(position: PlanPosition): void;
  onOpen(r: Recipe): void;
  /** Para hoy y días pasados: si el plato ya está marcado como hecho y cómo marcarlo (gana una comida) */
  cooked?(position: PlanPosition): boolean;
  onCook?(position: PlanPosition): void;
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
  cooked?(position: PlanPosition): boolean;
  onCook?(position: PlanPosition): void;
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
          className={value === LEFTOVERS || value === EATING_OUT ? 'special' : undefined}
        >
          <option value="">{position === 1 ? '—' : '— Segundo plato —'}</option>
          <option value={LEFTOVERS}>Sobras</option>
          <option value={EATING_OUT}>Comemos fuera</option>
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
          <Icon name="dice" />
        </button>
        {props.onRemove && (
          <button className="icon-btn" onClick={props.onRemove} title="Quitar segundo plato" aria-label={`Quitar ${label}`}>
            ×
          </button>
        )}
      </div>
      {recipe && (
        <div className="slot-links">
          <button className="slot-open" onClick={() => props.onOpen(recipe)}>
            Ver receta →
          </button>
          {props.onCook &&
            (props.cooked?.(position) ? (
              <button className="slot-cook done" onClick={() => props.onCook!(position)} title="Desmarcar">
                ✓ Hecha
              </button>
            ) : (
              <button className="slot-cook" onClick={() => props.onCook!(position)}>
                ¿La habéis hecho?
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

const GROUP_ICON: Record<FoodGroup, IconName> = {
  legumbres: 'bean',
  pescado: 'fish',
  carne: 'meat',
  huevos: 'egg',
  cereales: 'pasta',
  verdura: 'leaf',
};

/** Fila de días como círculos (hoy en amarillo); al tocar uno baja hasta ese día */
export function DayStrip({ days, today, hasPlan }: { days: Date[]; today: string; hasPlan(day: string): boolean }) {
  return (
    <div className="day-strip" role="list" aria-label="Días de la semana">
      {days.map((d) => {
        const day = toISODate(d);
        const name = d.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '');
        return (
          <button
            key={day}
            role="listitem"
            className={day === today ? 'strip-day today' : 'strip-day'}
            onClick={() => document.getElementById(`dia-${day}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            aria-label={`Ir al ${weekdayName(d)} ${d.getDate()}`}
          >
            <span className="strip-name">{name.charAt(0).toUpperCase() + name.slice(1)}</span>
            <span className="strip-num">{d.getDate()}</span>
            <span className={hasPlan(day) ? 'strip-dot on' : 'strip-dot'} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}

/** Equilibrio de la semana como barras verticales, una por tipo de alimento */
export function WeekBalance({ counts, repeated }: { counts: Record<FoodGroup, number>; repeated: number }) {
  // La barra llena equivale al mayor de: lo recomendado o lo que ya hay
  const scale = Math.max(4, ...FOOD_GROUPS.map((g) => counts[g]));
  return (
    <section className="balance-card" aria-label="Equilibrio de la semana">
      <div className="balance-head">
        <h2>Equilibrio de la semana</h2>
        <p className="muted small">Platos principales según las recomendaciones de la AESAN</p>
      </div>
      <div className="balance-bars">
        {FOOD_GROUPS.map((g) => {
          const info = FOOD_GROUP_INFO[g];
          const count = counts[g];
          const state = balanceState(g, count);
          const rec = recommendation(g);
          return (
            <div key={g} className={`bar bar-${g} ${state}`} title={rec ? `Recomendado: ${rec} por semana` : undefined}>
              <div className="bar-track">
                {count > 0 ? (
                  <div className="bar-fill" style={{ height: `${Math.max(count / scale, 0.28) * 100}%` }}>
                    <span className="bar-count">{count}</span>
                  </div>
                ) : (
                  <span className="bar-count empty">0</span>
                )}
              </div>
              <Icon name={GROUP_ICON[g]} size={22} />
              <span className="bar-label">{info.label}</span>
              {rec && <span className="bar-rec">{rec}</span>}
            </div>
          );
        })}
      </div>
      {repeated > 0 && <p className="balance-note">{repeated === 1 ? '1 receta repetida esta semana' : `${repeated} recetas repetidas esta semana`}</p>}
    </section>
  );
}
