import { Fragment, useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { DataProvider, useData } from './data';
import { authLinkType, supabase } from './lib/supabase';
import type { Recipe } from './lib/types';
import Icon from './components/Icon';
import Login from './components/Login';
import SetPassword from './components/SetPassword';
import Modal from './components/Modal';
import RecipeDetail from './components/RecipeDetail';
import RecipeForm from './components/RecipeForm';
import AccountView from './views/AccountView';
import DiscoverView from './views/DiscoverView';
import RecipesView from './views/RecipesView';
import WeekView from './views/WeekView';

const VIEWS = [
  { id: 'recetas', label: 'Recetas', icon: 'book' },
  { id: 'descubrir', label: 'Descubrir', icon: 'dice' },
  { id: 'semana', label: 'Semana', icon: 'calendar' },
  { id: 'cuenta', label: 'Cuenta', icon: 'user' },
] as const;

type ViewId = (typeof VIEWS)[number]['id'];

/** Enlaces antiguos de cuando «Al azar» y «Buscador» eran pestañas separadas */
const OLD_VIEWS: Record<string, ViewId> = { azar: 'descubrir', buscador: 'descubrir' };

function viewFromHash(): ViewId {
  const id = window.location.hash.replace(/^#\/?/, '');
  if (OLD_VIEWS[id]) return OLD_VIEWS[id];
  return VIEWS.some((v) => v.id === id) ? (id as ViewId) : 'recetas';
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!supabase);
  // Quien entra desde una invitación o "he olvidado mi contraseña" aún tiene que elegir contraseña
  const [needsPassword, setNeedsPassword] = useState(authLinkType === 'invite' || authLinkType === 'recovery');

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') setNeedsPassword(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!authReady) return <div className="center-screen">Cargando…</div>;
  if (supabase && !session) return <Login />;
  if (session && needsPassword) return <SetPassword email={session.user.email ?? null} onDone={() => setNeedsPassword(false)} />;

  const email = session?.user.email ?? null;
  return <Shell email={email} author={email ? email.split('@')[0] : null} />;
}

function Shell({ email, author }: { email: string | null; author: string | null }) {
  const [view, setView] = useState<ViewId>(viewFromHash);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Recipe | null | undefined>(undefined); // undefined = cerrado

  useEffect(() => {
    const onHash = () => setView(viewFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const onOpen = useCallback((r: Recipe) => setOpenId(r.id), []);
  const onEdit = useCallback((r: Recipe | null) => {
    setOpenId(null);
    setEditing(r);
  }, []);

  return (
    <DataProvider author={author} onOpen={onOpen} onEdit={onEdit}>
      <header className="topbar">
        <a className="brand" href="#/recetas">
          <img className="brand-icon" src={`${import.meta.env.BASE_URL}favicon.png`} alt="" /> MajoChef
        </a>
        <nav className="tabs" aria-label="Secciones">
          {VIEWS.map((v, i) => (
            <Fragment key={v.id}>
              {/* En el móvil, el botón redondo de «Nueva receta» va en el centro de la barra */}
              {i === 2 && (
                <button className="tab-add" onClick={() => onEdit(null)} aria-label="Nueva receta" title="Nueva receta">
                  <Icon name="plus" size={22} />
                </button>
              )}
              <a href={`#/${v.id}`} className={v.id === view ? 'tab active' : 'tab'} aria-current={v.id === view ? 'page' : undefined}>
                <span className="tab-icon">
                  <Icon name={v.icon} />
                </span>
                <span className="tab-label">{v.label}</span>
              </a>
            </Fragment>
          ))}
        </nav>
      </header>

      {!supabase && (
        <p className="banner">
          {import.meta.env.VITE_PREVIEW
            ? 'Vista previa: puedes probarlo todo, pero lo que cambies aquí no se guarda en vuestras recetas.'
            : 'Modo local: las recetas se guardan solo en este navegador. Configura Supabase (mira el README) para compartirlas.'}
        </p>
      )}

      <main className="content">
        {view === 'recetas' && <RecipesView />}
        {view === 'descubrir' && <DiscoverView />}
        {view === 'semana' && <WeekView />}
        {view === 'cuenta' && <AccountView email={email} />}
      </main>

      <RecipeModals openId={openId} onCloseDetail={() => setOpenId(null)} editing={editing} onCloseForm={() => setEditing(undefined)} />
    </DataProvider>
  );
}

function RecipeModals(props: {
  openId: string | null;
  onCloseDetail(): void;
  editing: Recipe | null | undefined;
  onCloseForm(): void;
}) {
  const { recipes, openRecipe } = useData();
  const open = recipes.find((r) => r.id === props.openId);
  return (
    <>
      {open && (
        <Modal onClose={props.onCloseDetail} label={open.title}>
          <RecipeDetail recipe={open} onDeleted={props.onCloseDetail} />
        </Modal>
      )}
      {props.editing !== undefined && (
        <Modal onClose={props.onCloseForm} label={props.editing ? 'Editar receta' : 'Nueva receta'}>
          <RecipeForm
            recipe={props.editing}
            onDone={(saved) => {
              props.onCloseForm();
              if (saved) openRecipe(saved);
            }}
          />
        </Modal>
      )}
    </>
  );
}
