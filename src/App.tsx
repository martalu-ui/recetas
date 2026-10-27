import { Fragment, useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { DataProvider, useData } from './data';
import { PantryProvider } from './pantry';
import { authLinkType, supabase } from './lib/supabase';
import type { Recipe } from './lib/types';
import Avatar, { isAvatar } from './components/Avatar';
import Icon from './components/Icon';
import { useGlide } from './lib/useGlide';
import Login from './components/Login';
import HouseholdSetup from './components/HouseholdSetup';
import { clearPendingCode, codeFromHash, type Household } from './lib/household';
import { store } from './lib/store';
import SetPassword from './components/SetPassword';
import Modal from './components/Modal';
import RecipeDetail from './components/RecipeDetail';
import RecipeForm from './components/RecipeForm';
import RewardToast from './components/RewardToast';
import Onboarding from './components/Onboarding';
import { VoucherNotice } from './components/Vouchers';
import { usePantry } from './pantry';
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
  // Avatar de comida: en el perfil de Supabase (sigue a la persona en todos sus dispositivos) o, sin Supabase, en este navegador
  const [localAvatar, setLocalAvatar] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LS_AVATAR);
    } catch {
      return null;
    }
  });

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
  const savedAvatar = session ? session.user.user_metadata?.avatar : localAvatar;
  const avatar = isAvatar(savedAvatar) ? savedAvatar : null;

  async function chooseAvatar(value: string) {
    if (supabase && session) {
      const { error } = await supabase.auth.updateUser({ data: { avatar: value } });
      if (error) throw new Error(error.message);
    } else {
      try {
        localStorage.setItem(LS_AVATAR, value);
      } catch {
        // sin almacenamiento solo dura hasta recargar
      }
      setLocalAvatar(value);
    }
  }

  const author = email ? email.split('@')[0] : null;
  return (
    <HouseholdGate key={session?.user.id ?? 'local'} author={author}>
      {(household) => <Shell email={email} author={author} avatar={avatar} household={household} onChooseAvatar={chooseAvatar} />}
    </HouseholdGate>
  );
}

/** Carga el espacio de quien ha entrado; si aún no tiene, le deja crearlo o unirse al de su pareja */
function HouseholdGate({ author, children }: { author: string | null; children(household: Household): JSX.Element }) {
  const [household, setHousehold] = useState<Household | null | undefined>(undefined); // undefined = cargando
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    store.getHousehold(author).then(
      (h) => {
        setHousehold(h);
        setError(null);
        // Ya está en un espacio: un enlace de invitación que quedara pendiente ya no sirve
        if (h) {
          clearPendingCode();
          if (codeFromHash(window.location.hash)) window.location.hash = '#/recetas';
        }
      },
      (e) => setError((e as Error).message),
    );
  }, [author]);

  useEffect(load, [load]);

  if (error)
    return (
      <div className="center-screen">
        <p className="error">No se ha podido cargar vuestro espacio: {error}</p>
        <button className="btn" onClick={load}>
          Reintentar
        </button>
      </div>
    );
  if (household === undefined) return <div className="center-screen">Cargando…</div>;
  if (household === null) return <HouseholdSetup author={author} onDone={load} />;
  return children(household);
}

const LS_AVATAR = 'recetas.avatar';

function Shell(props: {
  email: string | null;
  author: string | null;
  avatar: string | null;
  household: Household;
  onChooseAvatar(value: string): Promise<void>;
}) {
  const { email, author, avatar } = props;
  const [view, setView] = useState<ViewId>(viewFromHash);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Recipe | null | undefined>(undefined); // undefined = cerrado
  const tabsRef = useGlide<HTMLElement>(':scope > a');

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
      <PantryProvider>
        <header className="topbar">
          <a className="brand" href="#/recetas">
            <img className="brand-icon" src={`${import.meta.env.BASE_URL}favicon.png`} alt="" /> MajoChef
          </a>
          <nav ref={tabsRef} className="tabs" aria-label="Secciones">
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
                    {v.id === 'cuenta' && avatar ? <Avatar value={avatar} size={22} /> : <Icon name={v.icon} />}
                  </span>
                  <span className="tab-label">{v.label}</span>
                {v.id === 'cuenta' && <OwedBadge />}
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
          {view === 'descubrir' && <DiscoverView avatar={avatar} />}
          {view === 'semana' && <WeekView />}
          {view === 'cuenta' && <AccountView email={email} avatar={avatar} household={props.household} onChooseAvatar={props.onChooseAvatar} />}
        </main>

        <RecipeModals openId={openId} onCloseDetail={() => setOpenId(null)} editing={editing} onCloseForm={() => setEditing(undefined)} />
        <RewardToast />
        <Onboarding />
        <VoucherNotice />
      </PantryProvider>
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

/** Numerito en la pestaña de Cuenta con los vales que debes y aún no has cumplido */
function OwedBadge() {
  const pantry = usePantry();
  const owed = pantry?.vouchers.filter((v) => !v.mine && v.status === 'pendiente').length ?? 0;
  if (!owed) return null;
  return (
    <span className="tab-badge" aria-label={`${owed} vales pendientes`}>
      {owed}
    </span>
  );
}
