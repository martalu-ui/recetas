import { useState } from 'react';
import { useData } from '../data';
import { appUrl, supabase } from '../lib/supabase';
import Avatar, { AVATARS } from '../components/Avatar';
import HouseholdCard from '../components/HouseholdCard';
import PantryJar from '../components/PantryJar';
import SettingsCard from '../components/SettingsCard';
import { useHousehold } from '../household';
import { shortDate } from '../lib/dates';
import type { Household } from '../lib/household';
import { OwedCard, VouchersCard } from '../components/Vouchers';
import { usePantry } from '../pantry';
import type { Score } from '../lib/store';

export default function AccountView(props: {
  email: string | null;
  avatar: string | null;
  household: Household;
  onChooseAvatar(value: string): Promise<void>;
}) {
  const { email, avatar, household } = props;
  const { recipes } = useData();
  const pantry = usePantry();
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  async function choose(value: string) {
    setAvatarError(null);
    try {
      await props.onChooseAvatar(value);
    } catch (e) {
      setAvatarError(`No se ha podido guardar el avatar: ${(e as Error).message}`);
    }
  }

  async function changePassword() {
    if (!email) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase!.auth.resetPasswordForEmail(email, { redirectTo: appUrl() });
    if (error) setError(`No se ha podido enviar el email: ${error.message}`);
    else setInfo(`Te hemos enviado un email a ${email} para elegir una contraseña nueva.`);
    setBusy(false);
  }

  return (
    <section className="account">
      <h1>Cuenta</h1>

      {pantry && (
        <div className="account-card">
          <div className="card-head">
            <h2>Mi despensa</h2>
            <span className="muted">{pantry.available.length === 1 ? '1 comida' : `${pantry.available.length} comidas`}</span>
          </div>
          {pantry.items.length === 0 && <p className="muted small">Se ganan marcando los platos de la semana con «¿La has hecho?».</p>}
          <PantryJar items={pantry.available} />
        </div>
      )}

      {pantry && <OwedCard />}
      {pantry && <VouchersCard />}

      {pantry && pantry.scores.length > 0 && <ScoreCard scores={pantry.scores} />}

      <HouseholdCard household={household} />

      <SettingsCard />

      <div className="account-card">
        {supabase && email ? (
          <>
            <div className="account-who">
              <span className="avatar" aria-hidden>
                {avatar ? <Avatar value={avatar} size={40} /> : email.charAt(0).toUpperCase()}
              </span>
              <div>
                <p className="muted small">Has entrado como</p>
                <p className="account-email">{email}</p>
              </div>
            </div>
            <p className="muted small">
              {recipes.length === 1 ? '1 receta' : `${recipes.length} recetas`} en {household.name}.
            </p>
            {info && <p className="ok">{info}</p>}
            {error && <p className="error">{error}</p>}
            <div className="account-actions">
              <button className="btn" onClick={changePassword} disabled={busy}>
                Cambiar contraseña
              </button>
              <button className="btn danger" onClick={() => supabase!.auth.signOut()}>
                Salir
              </button>
            </div>
          </>
        ) : (
          <p className="muted">
            {import.meta.env.VITE_PREVIEW
              ? 'En la vista previa no hay cuenta: aquí verás con qué email has entrado y el botón para salir.'
              : 'Modo local: no hay cuenta porque las recetas se guardan solo en este navegador.'}
          </p>
        )}
      </div>

      <div className="account-card">
        <h2>Tu avatar</h2>
        <div className="avatar-picker" role="radiogroup" aria-label="Avatar de comida">
          {AVATARS.map((a) => (
            <button
              key={a.id}
              role="radio"
              aria-checked={avatar === a.id}
              className={avatar === a.id ? 'avatar-option on' : 'avatar-option'}
              onClick={() => choose(a.id)}
            >
              <Avatar value={a.id} size={48} />
              <span>{a.label}</span>
            </button>
          ))}
        </div>
        {avatarError && <p className="error">{avatarError}</p>}
      </div>
    </section>
  );
}

/** El marcador con su botón para empezar de cero (las comidas de la despensa no se tocan) */
function ScoreCard({ scores }: { scores: Score[] }) {
  const ctx = useHousehold();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const since = ctx?.household.scoresSince;
  const total = scores.reduce((n, s) => n + s.count, 0);

  async function reset() {
    setError(null);
    try {
      await ctx!.update({ scoresSince: new Date().toISOString() });
      setConfirming(false);
    } catch (e) {
      setError(`No se ha podido reiniciar: ${(e as Error).message}`);
    }
  }

  return (
    <div className="account-card">
      <div className="card-head">
        <h2>¿Quién cocina más?</h2>
        {ctx && !confirming && total > 0 && (
          <button className="btn small" onClick={() => setConfirming(true)}>
            Reiniciar
          </button>
        )}
      </div>
      {since && <p className="muted small">Desde el {shortDate(new Date(since))}</p>}
      {confirming ? (
        <div className="confirm-reset">
          <p className="small">El marcador vuelve a 0 para los dos. Las comidas de la despensa y los vales se quedan.</p>
          <div className="confirm-reset-actions">
            <button className="btn small danger" onClick={reset}>
              Poner a 0
            </button>
            <button className="btn small" onClick={() => setConfirming(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <Scoreboard scores={scores} />
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}

/** Marcador: una barra por persona, la que más ha cocinado con corona */
function Scoreboard({ scores }: { scores: Score[] }) {
  const max = Math.max(1, ...scores.map((s) => s.count));
  return (
    <ol className="scoreboard">
      {scores.map((s, i) => (
        <li key={`${s.author}-${i}`} className={s.me ? 'score me' : 'score'}>
          <span className="score-name">
            {s.me && s.author !== 'Tú' ? `${s.author} (tú)` : s.author}
          </span>
          <span className="score-bar" aria-hidden>
            <span style={{ width: `${(s.count / max) * 100}%` }} />
          </span>
          <strong className="score-count">{s.count}</strong>
        </li>
      ))}
    </ol>
  );
}
