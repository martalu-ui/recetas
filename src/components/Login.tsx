import { useState, type FormEvent } from 'react';
import { codeFromHash, savePendingCode, takePendingCode } from '../lib/household';
import { appUrl, authLinkError, supabase } from '../lib/supabase';

export default function Login() {
  // Si se llega desde un enlace de invitación, se guarda el código para después de crear la cuenta
  const [invited] = useState(() => {
    const code = codeFromHash(window.location.hash) ?? takePendingCode();
    if (code) savePendingCode(code);
    return Boolean(code);
  });
  const [mode, setMode] = useState<'entrar' | 'crear'>(invited ? 'crear' : 'entrar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(
    authLinkError ? 'El enlace del email ha caducado o ya se ha usado. Pide otro.' : null,
  );
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    if (mode === 'entrar') {
      const { error } = await supabase!.auth.signInWithPassword({ email, password });
      if (error) setError('Email o contraseña incorrectos');
    } else if (password.length < 6) {
      setError('La contraseña tiene que tener al menos 6 caracteres');
    } else {
      const { data, error } = await supabase!.auth.signUp({ email, password, options: { emailRedirectTo: appUrl() } });
      if (error) setError(`No se ha podido crear la cuenta: ${error.message}`);
      // Con confirmación por email no hay sesión todavía: se entra desde el enlace del email
      else if (!data.session) setInfo(`Te hemos enviado un email a ${email}. Ábrelo para confirmar tu cuenta y entrar.`);
    }
    setBusy(false);
  }

  async function forgot() {
    if (!email) return setError('Escribe tu email y vuelve a pulsar «¿Has olvidado tu contraseña?»');
    setBusy(true);
    setError(null);
    const { error } = await supabase!.auth.resetPasswordForEmail(email, { redirectTo: appUrl() });
    if (error) setError(`No se ha podido enviar el email: ${error.message}`);
    else setInfo(`Te hemos enviado un email a ${email} para elegir una contraseña nueva.`);
    setBusy(false);
  }

  const creating = mode === 'crear';

  return (
    <div className="center-screen">
      <form className="card login" onSubmit={submit}>
        <img className="login-logo" src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" />
        <h1>MajoChef</h1>
        {invited && <p className="muted small">Te han invitado a un espacio. Crea tu cuenta (o entra) y te unirás.</p>}
        <label className="field">
          <span>Email</span>
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>Contraseña</span>
          <input
            type="password"
            autoComplete={creating ? 'new-password' : 'current-password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="error">{error}</p>}
        {info && <p className="ok">{info}</p>}
        <button className="btn primary" disabled={busy}>
          {busy ? (creating ? 'Creando…' : 'Entrando…') : creating ? 'Crear cuenta' : 'Entrar'}
        </button>
        <button
          type="button"
          className="btn ghost small forgot"
          onClick={() => {
            setMode(creating ? 'entrar' : 'crear');
            setError(null);
            setInfo(null);
          }}
          disabled={busy}
        >
          {creating ? 'Ya tengo cuenta' : 'Crear una cuenta'}
        </button>
        {!creating && (
          <button type="button" className="btn ghost small forgot" onClick={forgot} disabled={busy}>
            ¿Has olvidado tu contraseña?
          </button>
        )}
      </form>
    </div>
  );
}
