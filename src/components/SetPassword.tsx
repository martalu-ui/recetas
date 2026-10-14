import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { Fries } from './Pixel';

/** Tras entrar desde una invitación o un enlace de "he olvidado mi contraseña" */
export default function SetPassword({ email, onDone }: { email: string | null; onDone(): void }) {
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) return setError('La contraseña tiene que tener al menos 6 caracteres');
    if (password !== repeat) return setError('Las dos contraseñas no coinciden');
    setBusy(true);
    setError(null);
    const { error } = await supabase!.auth.updateUser({ password });
    if (error) {
      setError(`No se ha podido guardar: ${error.message}`);
      setBusy(false);
    } else {
      onDone();
    }
  }

  return (
    <div className="center-screen">
      <form className="card login panel" onSubmit={submit}>
        <Fries size={80} className="login-logo" />
        <h1>Elige tu contraseña</h1>
        {email && <p className="muted">Para entrar en MajoChef con {email}</p>}
        <label className="field">
          <span>Contraseña nueva</span>
          <input type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        </label>
        <label className="field">
          <span>Repite la contraseña</span>
          <input type="password" autoComplete="new-password" required value={repeat} onChange={(e) => setRepeat(e.target.value)} />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn primary" disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar y entrar'}
        </button>
      </form>
    </div>
  );
}
