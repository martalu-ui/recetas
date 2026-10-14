import { useState, type FormEvent } from 'react';
import { appUrl, authLinkError, supabase } from '../lib/supabase';
import { Fries } from './Pixel';

export default function Login() {
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
    const { error } = await supabase!.auth.signInWithPassword({ email, password });
    if (error) setError('Email o contraseña incorrectos');
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

  return (
    <div className="center-screen">
      <form className="card login panel" onSubmit={submit}>
        <Fries size={80} className="login-logo" />
        <h1>MajoChef</h1>
        <label className="field">
          <span>Email</span>
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>Contraseña</span>
          <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="error">{error}</p>}
        {info && <p className="ok">{info}</p>}
        <button className="btn primary" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
        <button type="button" className="btn ghost small forgot" onClick={forgot} disabled={busy}>
          ¿Has olvidado tu contraseña?
        </button>
      </form>
    </div>
  );
}
