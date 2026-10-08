import { useMemo, useState, type FormEvent } from 'react';
import { useData } from '../data';
import { allIngredients, ingredientKey, normalize, rankBySelectedIngredients } from '../lib/match';
import RecipeCard from '../components/RecipeCard';
import Empty from './Empty';
import MealFilter, { filterByMeal, type MealFilterValue } from './MealFilter';

export default function SearchView() {
  const { recipes, loading, openRecipe } = useData();
  const [selected, setSelected] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [meal, setMeal] = useState<MealFilterValue>('todas');

  const ingredients = useMemo(() => allIngredients(recipes), [recipes]);
  const results = useMemo(() => rankBySelectedIngredients(filterByMeal(recipes, meal), selected), [recipes, meal, selected]);

  const isSelected = (name: string) => selected.some((s) => ingredientKey(s) === ingredientKey(name));
  const toggle = (name: string) =>
    setSelected((list) => (isSelected(name) ? list.filter((s) => ingredientKey(s) !== ingredientKey(name)) : [...list, name]));

  const q = normalize(text);
  const visibleChips = q ? ingredients.filter((i) => normalize(i).includes(q)) : ingredients;

  function addTyped(e: FormEvent) {
    e.preventDefault();
    const name = text.trim();
    if (!name) return;
    // Si coincide con uno de nuestros ingredientes usamos ese nombre
    const known = ingredients.find((i) => ingredientKey(i) === ingredientKey(name)) ?? name;
    if (!isSelected(known)) setSelected((l) => [...l, known]);
    setText('');
  }

  if (loading) return <p className="muted">Cargando…</p>;
  if (recipes.length === 0) return <Empty text="Cuando subáis recetas podréis buscar por ingredientes." />;

  return (
    <section>
      <h1>¿Qué tenemos en la nevera?</h1>
      <p className="muted">Elige ingredientes y te decimos cuál de nuestras recetas se parece más.</p>

      <form className="ingredient-search" onSubmit={addTyped}>
        <input
          type="search"
          placeholder="Filtra o escribe un ingrediente y pulsa Enter"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </form>

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

      <div className="chips">
        {visibleChips
          .filter((i) => !isSelected(i))
          .map((i) => (
            <button key={i} className="chip" onClick={() => toggle(i)}>
              {i}
            </button>
          ))}
        {visibleChips.length === 0 && q && <span className="muted">Ninguna receta lleva «{text}». Pulsa Enter para añadirlo igualmente.</span>}
      </div>

      <div className="toolbar">
        <MealFilter value={meal} onChange={setMeal} />
      </div>

      {selected.length === 0 ? (
        <p className="muted">Selecciona al menos un ingrediente.</p>
      ) : results.length === 0 ? (
        <p className="muted">Ninguna de nuestras recetas lleva esos ingredientes.</p>
      ) : (
        <div className="grid">
          {results.map((m, idx) => (
            <RecipeCard key={m.recipe.id} recipe={m.recipe} onClick={() => openRecipe(m.recipe)}>
              {idx === 0 && <span className="best">⭐ La más parecida</span>}
              <p className="match-info">
                Usa {m.matched.length} de {selected.length} ingredientes elegidos
              </p>
              {m.missing.length > 0 ? (
                <p className="muted small">Te falta: {m.missing.join(', ')}</p>
              ) : (
                <p className="ok small">¡Tienes todo!</p>
              )}
            </RecipeCard>
          ))}
        </div>
      )}
    </section>
  );
}
