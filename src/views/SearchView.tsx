import { useCallback, useMemo, useState } from 'react';
import { useData } from '../data';
import { allIngredients, ingredientKey, normalize, rankBySelectedIngredients } from '../lib/match';
import { INGREDIENT_CATEGORIES, ingredientCategory } from '../lib/nutrition';
import Modal from '../components/Modal';
import FoodSprite from '../components/FoodSprite';
import Empty from './Empty';
import MealFilter, { filterByMeal, type MealFilterValue } from './MealFilter';

export default function SearchView() {
  const { recipes, loading, openRecipe } = useData();
  const [selected, setSelected] = useState<string[]>([]);
  const [meal, setMeal] = useState<MealFilterValue>('todas');
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  const ingredients = useMemo(() => allIngredients(recipes), [recipes]);
  const results = useMemo(() => rankBySelectedIngredients(filterByMeal(recipes, meal), selected), [recipes, meal, selected]);

  const isSelected = (name: string) => selected.some((s) => ingredientKey(s) === ingredientKey(name));
  const toggle = (name: string) =>
    setSelected((list) => (isSelected(name) ? list.filter((s) => ingredientKey(s) !== ingredientKey(name)) : [...list, name]));

  if (loading) return <p className="muted">Cargando…</p>;
  if (recipes.length === 0) return <Empty text="Cuando subáis recetas podréis buscar por ingredientes." />;

  return (
    <section className="discover-search fridge">
      <div className="fridge-head">
        <h2>¿Qué hay en la nevera?</h2>
        <button className="btn primary" onClick={() => setSheetOpen(true)}>
          {selected.length ? 'Cambiar' : 'Elegir ingredientes'}
        </button>
      </div>

      {selected.length > 0 && (
        <div className="chips selected">
          {selected.map((s) => (
            <button key={s} className="chip on" onClick={() => toggle(s)} aria-label={`Quitar ${s}`}>
              {s} ×
            </button>
          ))}
          <button className="btn ghost small" onClick={() => setSelected([])}>
            Limpiar
          </button>
        </div>
      )}

      {selected.length > 0 && (
        <div className="fridge-filter">
          <MealFilter value={meal} onChange={setMeal} />
        </div>
      )}

      {selected.length > 0 &&
        (results.length === 0 ? (
          <p className="muted">Ninguna de nuestras recetas lleva esos ingredientes.</p>
        ) : (
          <ul className="match-list">
            {results.map((m, idx) => (
              <li key={m.recipe.id}>
                <button className="match-row" onClick={() => openRecipe(m.recipe)}>
                  <span className="match-thumb">
                    {m.recipe.photoUrl ? <img src={m.recipe.photoUrl} alt="" /> : <FoodSprite recipe={m.recipe} size={40} />}
                  </span>
                  <span className="match-body">
                    <span className="match-title">
                      <strong>{m.recipe.title}</strong>
                      {idx === 0 && <span className="best">La más parecida</span>}
                    </span>
                    <span className="muted small">
                      {m.missing.length === 0 ? 'Lo tienes todo' : `Te falta: ${m.missing.join(', ')}`}
                    </span>
                  </span>
                  <span className="match-score" aria-label={`Usa ${m.matched.length} de ${selected.length} ingredientes elegidos`}>
                    {m.matched.length}/{selected.length}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ))}

      {sheetOpen && (
        <Modal label="Elegir ingredientes" onClose={closeSheet}>
          <IngredientSheet
            ingredients={ingredients}
            selected={selected}
            isSelected={isSelected}
            toggle={toggle}
            resultCount={results.length}
            onClear={() => setSelected([])}
            onDone={closeSheet}
          />
        </Modal>
      )}
    </section>
  );
}

function IngredientSheet(props: {
  ingredients: string[];
  selected: string[];
  isSelected(name: string): boolean;
  toggle(name: string): void;
  resultCount: number;
  onClear(): void;
  onDone(): void;
}) {
  const { ingredients, selected, isSelected, toggle } = props;
  const [query, setQuery] = useState('');
  const q = normalize(query);

  // Los elegidos que no salen en ninguna receta (escritos a mano) también se pueden desmarcar
  const all = [...ingredients, ...selected.filter((s) => !ingredients.some((i) => ingredientKey(i) === ingredientKey(s)))];
  const visible = q ? all.filter((i) => normalize(i).includes(q)) : all;
  const groups = INGREDIENT_CATEGORIES.map((c) => ({
    ...c,
    items: visible.filter((i) => ingredientCategory(i) === c.id).sort((a, b) => a.localeCompare(b, 'es')),
  })).filter((g) => g.items.length > 0);

  const typed = query.trim();
  const canAddTyped = typed && !all.some((i) => ingredientKey(i) === ingredientKey(typed));

  return (
    <div className="sheet">
      <div className="sheet-head">
        <h2>Elegir ingredientes</h2>
        <input
          type="search"
          placeholder="Buscar ingrediente…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar ingrediente"
          autoComplete="off"
        />
      </div>

      <div className="sheet-body">
        {groups.map((g) => (
          <fieldset key={g.id} className="check-group">
            <legend>{g.label}</legend>
            {g.items.map((i) => (
              <label key={i} className="check-row">
                <input type="checkbox" checked={isSelected(i)} onChange={() => toggle(i)} />
                <span>{i}</span>
              </label>
            ))}
          </fieldset>
        ))}
        {canAddTyped && (
          <button
            type="button"
            className="btn ghost small add-typed"
            onClick={() => {
              toggle(typed);
              setQuery('');
            }}
          >
            + Añadir «{typed}» (no sale en ninguna receta)
          </button>
        )}
        {groups.length === 0 && !canAddTyped && <p className="muted">No hay ingredientes.</p>}
      </div>

      <div className="sheet-foot">
        {selected.length > 0 && (
          <button type="button" className="btn ghost" onClick={props.onClear}>
            Desmarcar todo
          </button>
        )}
        <button type="button" className="btn primary" onClick={props.onDone}>
          {selected.length === 0
            ? 'Cerrar'
            : props.resultCount === 1
              ? 'Ver 1 receta'
              : `Ver ${props.resultCount} recetas`}
        </button>
      </div>
    </div>
  );
}
