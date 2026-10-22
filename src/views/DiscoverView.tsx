import Avatar from '../components/Avatar';
import { useData } from '../data';
import Empty from './Empty';
import RandomView from './RandomView';
import SearchView from './SearchView';

/** «Descubrir»: receta al azar arriba y buscador por ingredientes debajo */
export default function DiscoverView({ avatar = null }: { avatar?: string | null }) {
  const { recipes, loading } = useData();
  if (loading) return <p className="muted">Cargando…</p>;
  if (recipes.length === 0) return <Empty text="Cuando subáis recetas podréis sacar una al azar o buscar por ingredientes." />;
  return (
    <section className="discover">
      <Greeting avatar={avatar} />
      <RandomView />
      <SearchView />
    </section>
  );
}

/** Saludo de arriba: «Hi chef!» con el avatar de quien entra */
export function Greeting({ avatar }: { avatar: string | null }) {
  return (
    <header className="greeting">
      {avatar && (
        <span className="avatar">
          <Avatar value={avatar} size={44} />
        </span>
      )}
      <div>
        <p className="greeting-hi">Hi chef!</p>
        <h1>¿Qué cocinamos hoy?</h1>
      </div>
    </header>
  );
}
