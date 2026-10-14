import { useMemo, useState } from 'react';
import { useData } from '../data';
import { normalize } from '../lib/match';
import { COURSES, type Course } from '../lib/types';
import RecipeCard from '../components/RecipeCard';
import Empty from './Empty';
import MealFilter, { filterByMeal, type MealFilterValue } from './MealFilter';

type Sort = 'recientes' | 'nombre' | 'tiempo';

export default function RecipesView() {
  const { recipes, loading, error, editRecipe, openRecipe } = useData();
  const [meal, setMeal] = useState<MealFilterValue>('todas');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('recientes');
  const [course, setCourse] = useState<Course | 'todos'>('todos');
  const [onlyThermomix, setOnlyThermomix] = useState(false);

  const shown = useMemo(() => {
    const q = normalize(query);
    const list = filterByMeal(recipes, meal).filter(
      (r) =>
        (!q || normalize(r.title).includes(q)) &&
        (course === 'todos' || r.course === course) &&
        (!onlyThermomix || r.thermomix),
    );
    if (sort === 'nombre') return [...list].sort((a, b) => a.title.localeCompare(b.title, 'es'));
    if (sort === 'tiempo') return [...list].sort((a, b) => (a.timeMinutes ?? Infinity) - (b.timeMinutes ?? Infinity));
    return list;
  }, [recipes, meal, query, sort, course, onlyThermomix]);

  return (
    <section>
      <div className="view-header">
        <div>
          <h1>Nuestras recetas</h1>
          <p className="muted">{recipes.length === 1 ? '1 receta' : `${recipes.length} recetas`}</p>
        </div>
        <button className="btn primary new-recipe" onClick={() => editRecipe(null)}>
          + Nueva receta
        </button>
      </div>

      <div className="toolbar">
        <MealFilter value={meal} onChange={setMeal} />
        <input className="search" type="search" placeholder="Buscar por nombre…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select value={course} onChange={(e) => setCourse(e.target.value as Course | 'todos')} aria-label="Tipo de plato">
          <option value="todos">Todos los platos</option>
          {COURSES.map((c) => (
            <option key={c} value={c}>
              {c === 'principal' ? 'Principales' : 'Acompañamientos'}
            </option>
          ))}
        </select>
        <button className={onlyThermomix ? 'chip on' : 'chip'} aria-pressed={onlyThermomix} onClick={() => setOnlyThermomix((t) => !t)}>
          Thermomix
        </button>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Ordenar">
          <option value="recientes">Más recientes</option>
          <option value="nombre">Por nombre</option>
          <option value="tiempo">Más rápidas</option>
        </select>
      </div>

      {error && <p className="error">No se han podido cargar las recetas: {error}</p>}
      {loading ? (
        <p className="muted">Cargando…</p>
      ) : recipes.length === 0 ? (
        <Empty text="Todavía no hay recetas. ¡Subid la primera!" />
      ) : shown.length === 0 ? (
        <p className="muted">Ninguna receta coincide con el filtro.</p>
      ) : (
        <div className="grid">
          {shown.map((r) => (
            <RecipeCard key={r.id} recipe={r} onClick={() => openRecipe(r)} />
          ))}
        </div>
      )}
    </section>
  );
}
