import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { DataProvider, useData } from './data';
import { supabase } from './lib/supabase';
import type { Recipe } from './lib/types';
import Login from './components/Login';
import Modal from './components/Modal';
import RecipeDetail from './components/RecipeDetail';
import RecipeForm from './components/RecipeForm';
import RandomView from './views/RandomView';
import RecipesView from './views/RecipesView';
import SearchView from './views/SearchView';
import WeekView from './views/WeekView';

const VIEWS = [
  { id: 'azar', label: 'Al azar', icon: '🎲' },
  { id: 'recetas', label: 'Recetas', icon: '📖' },
  { id: 'buscador', label: 'Buscador', icon: '🔍' },
  { id: 'semana', label: 'Semana', icon: '📅' },
] as const;

type ViewId = (typeof VIEWS)[number]['id'];

function viewFromHash(): ViewId {
  const id = window.location.hash.replace(/^#\/?/, '');
  return VIEWS.some((v) => v.id === id) ? (id as ViewId) : 'recetas';
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!supabase);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!authReady) return <div className="center-screen">Cargando…</div>;
  if (supabase && !session) return <Login />;

  const email = session?.user.email ?? null;
  return <Shell author={email ? email.split('@')[0] : null} />;
}

function Shell({ author }: { author: string | null }) {
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
          <span aria-hidden>🍳</span> Nuestras recetas
        </a>
        <nav className="tabs" aria-label="Secciones">
          {VIEWS.map((v) => (
            <a key={v.id} href={`#/${v.id}`} className={v.id === view ? 'tab active' : 'tab'} aria-current={v.id === view ? 'page' : undefined}>
              <span className="tab-icon" aria-hidden>
                {v.icon}
              </span>
              <span className="tab-label">{v.label}</span>
            </a>
          ))}
        </nav>
        {supabase && (
          <button className="btn ghost small logout" onClick={() => supabase!.auth.signOut()} title="Cerrar sesión">
            Salir
          </button>
        )}
      </header>

      {!supabase && (
        <p className="banner">
          Modo local: las recetas se guardan solo en este navegador. Configura Supabase (mira el README) para compartirlas.
        </p>
      )}

      <main className="content">
        {view === 'azar' && <RandomView />}
        {view === 'recetas' && <RecipesView />}
        {view === 'buscador' && <SearchView />}
        {view === 'semana' && <WeekView />}
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
