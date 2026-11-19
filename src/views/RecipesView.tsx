import { useMemo, useState } from 'react';
import { useData } from '../data';
import { normalize } from '../lib/match';
import { FOOD_GROUP_INFO, FOOD_GROUPS, foodGroupOf, type FoodGroup } from '../lib/nutrition';
import { COURSES, type Course, type Recipe } from '../lib/types';
import Icon, { FOOD_GROUP_ICON } from '../components/Icon';
import RecipeCard from '../components/RecipeCard';
import { useGlide } from '../lib/useGlide';
import Empty from './Empty';
import MealFilter, { filterByMeal, type MealFilterValue } from './MealFilter';

type Sort = 'recientes' | 'nombre' | 'tiempo';

/** Busca por nombre y por ingredientes: «garbanzos» encuentra el curry aunque no lo diga el título */
function matchesQuery(recipe: Recipe, q: string): boolean {
  return !q || normalize(recipe.title).includes(q) || recipe.ingredients.some((i) => normalize(i.name).includes(q));
}

export default function RecipesView() {
  const { recipes, loading, error, editRecipe, openRecipe } = useData();
  const [meal, setMeal] = useState<MealFilterValue>('todas');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('recientes');
  const [course, setCourse] = useState<Course | 'todos'>('todos');
  const [group, setGroup] = useState<FoodGroup | 'todos'>('todos');
  const groupsRef = useGlide<HTMLDivElement>();

  // Todo lo filtrado menos el tipo de alimento (para contar cuántas hay de cada tipo)
  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    const list = filterByMeal(recipes, meal).filter((r) => matchesQuery(r, q) && (course === 'todos' || r.course === course));
    if (sort === 'nombre') return [...list].sort((a, b) => a.title.localeCompare(b.title, 'es'));
    if (sort === 'tiempo') return [...list].sort((a, b) => (a.timeMinutes ?? Infinity) - (b.timeMinutes ?? Infinity));
    return list;
  }, [recipes, meal, query, sort, course]);

  const counts = useMemo(() => {
    const c = Object.fromEntries(FOOD_GROUPS.map((g) => [g, 0])) as Record<FoodGroup, number>;
    for (const r of filtered) c[foodGroupOf(r)]++;
    return c;
  }, [filtered]);

  const shown = group === 'todos' ? filtered : filtered.filter((r) => foodGroupOf(r) === group);
  // Sin buscar ni elegir tipo, la lista va por secciones (Legumbres, Pescado…)
  const sectioned = group === 'todos' && !query.trim();
  const sections = FOOD_GROUPS.map((g) => ({ group: g, items: shown.filter((r) => foodGroupOf(r) === g) })).filter((s) => s.items.length > 0);

  const grid = (list: Recipe[]) => (
    <div className="grid">
      {list.map((r) => (
        <RecipeCard key={r.id} recipe={r} onClick={() => openRecipe(r)} />
      ))}
    </div>
  );

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

      <label className="recipe-search">
        <Icon name="search" size={18} />
        <input
          type="search"
          placeholder="Buscar receta o ingrediente…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar receta o ingrediente"
        />
      </label>

      {/* Tipos de alimento, con cuántas recetas hay de cada uno */}
      <div ref={groupsRef} className="group-tags segmented scroll-fade-x" role="group" aria-label="Tipo de alimento">
        <button className={group === 'todos' ? 'on' : ''} aria-pressed={group === 'todos'} onClick={() => setGroup('todos')}>
          Todas <span className="group-count">{filtered.length}</span>
        </button>
        {FOOD_GROUPS.map((g) => (
          <button
            key={g}
            className={group === g ? 'on' : ''}
            aria-pressed={group === g}
            disabled={counts[g] === 0 && group !== g}
            onClick={() => setGroup(group === g ? 'todos' : g)}
          >
            <Icon name={FOOD_GROUP_ICON[g]} size={16} />
            {FOOD_GROUP_INFO[g].label} <span className="group-count">{counts[g]}</span>
          </button>
        ))}
      </div>

      <div className="toolbar">
        <MealFilter value={meal} onChange={setMeal} />
        <select value={course} onChange={(e) => setCourse(e.target.value as Course | 'todos')} aria-label="Tipo de plato">
          <option value="todos">Todos los platos</option>
          {COURSES.map((c) => (
            <option key={c} value={c}>
              {c === 'principal' ? 'Principales' : 'Acompañamientos'}
            </option>
          ))}
        </select>
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
        <Empty text="Todavía no hay recetas." />
      ) : shown.length === 0 ? (
        <p className="muted">Ninguna receta coincide{query.trim() ? ` con «${query.trim()}»` : ' con el filtro'}.</p>
      ) : sectioned ? (
        sections.map((s) => (
          <section key={s.group} className="recipe-section">
            <h2>
              <Icon name={FOOD_GROUP_ICON[s.group]} size={20} />
              {FOOD_GROUP_INFO[s.group].label}
              <span className="muted">{s.items.length}</span>
            </h2>
            {grid(s.items)}
          </section>
        ))
      ) : (
        grid(shown)
      )}
    </section>
  );
}
