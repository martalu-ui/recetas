import { useState } from 'react';
import { useData } from '../data';
import { appUrl, supabase } from '../lib/supabase';
import Avatar, { AVATARS } from '../components/Avatar';

export default function AccountView(props: { email: string | null; avatar: string | null; onChooseAvatar(value: string): Promise<void> }) {
  const { email, avatar } = props;
  const { recipes } = useData();
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
              {recipes.length === 1 ? '1 receta' : `${recipes.length} recetas`} compartidas en MajoChef.
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
        <p className="muted small">Elige tu comida. Sale aquí y en la pestaña de Cuenta.</p>
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
