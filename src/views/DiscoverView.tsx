import { useData } from '../data';
import Empty from './Empty';
import RandomView from './RandomView';
import SearchView from './SearchView';

/** «Descubrir»: receta al azar arriba y buscador por ingredientes debajo */
export default function DiscoverView() {
  const { recipes, loading } = useData();
  if (loading) return <p className="muted">Cargando…</p>;
  if (recipes.length === 0) return <Empty text="Cuando subáis recetas podréis sacar una al azar o buscar por ingredientes." />;
  return (
    <section className="discover">
      <h1>Descubrir</h1>
      <RandomView />
      <SearchView />
    </section>
  );
}
