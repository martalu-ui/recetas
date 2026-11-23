import { useEffect, useRef, useState } from 'react';
import { formatMinutes } from '../lib/dates';
import { normalize, recipeMatches } from '../lib/match';
import { foodGroupOf } from '../lib/nutrition';
import { EATING_OUT, LEFTOVERS, MEAL_LABEL, type Course, type MealType, type PlanPosition, type Recipe } from '../lib/types';
import Icon, { FOOD_GROUP_ICON } from './Icon';
import Modal from './Modal';

/** Lo que se ve en el botón del hueco */
export function dishLabel(value: string, recipe: Recipe | null, position: PlanPosition): string {
  if (value === LEFTOVERS) return 'Sobras';
  if (value === EATING_OUT) return 'Comemos fuera';
  return recipe?.title ?? (position === 1 ? 'Elegir plato' : 'Segundo plato');
}

/**
 * Hoja para elegir el plato de un hueco del menú: buscador (por nombre o ingrediente),
 * atajos de Sobras y Comemos fuera, y la lista con las que mejor encajan primero.
 */
export default function DishPicker(props: {
  slot: MealType;
  position: PlanPosition;
  recipes: Recipe[];
  value: string;
  /** Para el título: «Lunes» */
  dayName?: string;
  onPick(value: string | null): void;
  onClose(): void;
}) {
  const { slot, position, recipes, value } = props;
  const title = `${props.dayName ? `${props.dayName} · ` : ''}${MEAL_LABEL[slot]}${position === 2 ? ' · 2º plato' : ''}`;

  return (
    <Modal label={`Elegir plato: ${title}`} onClose={props.onClose} className="picker-modal">
      {(close) => (
        <PickerBody
          title={title}
          slot={slot}
          position={position}
          recipes={recipes}
          value={value}
          onPick={(v) => {
            props.onPick(v);
            close();
          }}
        />
      )}
    </Modal>
  );
}

function PickerBody(props: { title: string; slot: MealType; position: PlanPosition; recipes: Recipe[]; value: string; onPick(value: string | null): void }) {
  const { slot, position, recipes, value, onPick } = props;
  const [query, setQuery] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);

  // En el ordenador se puede escribir directamente; en el móvil no abrimos el teclado sin pedirlo
  useEffect(() => {
    if (!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return;
    const t = window.setTimeout(() => input.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, []);

  const q = normalize(query.trim());
  const byName = (a: Recipe, b: Recipe) => a.title.localeCompare(b.title, 'es');
  // Primer plato: antes los principales; segundo: antes los acompañamientos
  const courseOrder: Course[] = position === 1 ? ['principal', 'acompanamiento'] : ['acompanamiento', 'principal'];
  const matching = recipes.filter((r) => recipeMatches(r, q));
  const sections = [
    ...courseOrder.map((c) => ({
      label: c === 'principal' ? 'Principales' : 'Acompañamientos',
      items: matching.filter((r) => r.course === c && r.mealTypes.includes(slot)).sort(byName),
    })),
    { label: `No suelen ser de ${slot === 'comida' ? 'comer' : 'cenar'}`, items: matching.filter((r) => !r.mealTypes.includes(slot)).sort(byName) },
  ].filter((s) => s.items.length > 0);

  return (
    <div className="sheet dish-picker">
      <div className="sheet-head">
        <h2>{props.title}</h2>
        <label className="recipe-search">
          <Icon name="search" size={18} />
          <input
            ref={input}
            type="search"
            placeholder="Buscar receta o ingrediente…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              // Al buscar, la lista vuelve arriba para ver los resultados
              if (list.current) list.current.scrollTop = 0;
            }}
            aria-label="Buscar receta o ingrediente"
            autoComplete="off"
          />
        </label>
        {!q && (
          <div className="select-tags">
            <button className={value === LEFTOVERS ? 'select-tag on' : 'select-tag'} aria-pressed={value === LEFTOVERS} onClick={() => onPick(LEFTOVERS)}>
              Sobras
            </button>
            <button className={value === EATING_OUT ? 'select-tag on' : 'select-tag'} aria-pressed={value === EATING_OUT} onClick={() => onPick(EATING_OUT)}>
              Comemos fuera
            </button>
            {value && (
              <button className="select-tag" onClick={() => onPick(null)}>
                Dejar vacío
              </button>
            )}
          </div>
        )}
      </div>

      <div className="sheet-body" ref={list}>
        {sections.length === 0 && <p className="muted">Ninguna receta coincide con «{query.trim()}».</p>}
        {sections.map((s) => (
          <div key={s.label} className="pick-group" role="group" aria-label={s.label}>
            <h3>{s.label}</h3>
            {s.items.map((r) => (
              <button key={r.id} className={r.id === value ? 'pick-row on' : 'pick-row'} aria-pressed={r.id === value} onClick={() => onPick(r.id)}>
                <Icon name={FOOD_GROUP_ICON[foodGroupOf(r)]} size={18} />
                <span className="pick-title">{r.title}</span>
                {r.timeMinutes != null && <span className="muted small">{formatMinutes(r.timeMinutes)}</span>}
                {r.id === value && <Icon name="check" size={16} />}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
