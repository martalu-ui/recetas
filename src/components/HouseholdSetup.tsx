import { useState, type FormEvent } from 'react';
import { clearPendingCode, normalizeCode, takePendingCode } from '../lib/household';
import { store } from '../lib/store';
import { supabase } from '../lib/supabase';

/** Primera vez que alguien entra: crea el espacio de la pareja o se une al de su pareja con el código */
export default function HouseholdSetup({ author, onDone }: { author: string | null; onDone(): void }) {
  const [code, setCode] = useState(() => takePendingCode() ?? '');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState<'crear' | 'unirse' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: 'crear' | 'unirse', action: () => Promise<void>) {
    setBusy(kind);
    setError(null);
    try {
      await action();
      clearPendingCode();
      window.location.hash = '#/recetas';
      onDone();
    } catch (e) {
      const message = (e as Error).message;
      setError(/no existe|not found|código/i.test(message) ? 'Ese código no existe. Revísalo con tu pareja.' : message);
      setBusy(null);
    }
  }

  function create(e: FormEvent) {
    e.preventDefault();
    if (name.trim()) run('crear', () => store.createHousehold(name, author));
  }

  function join(e: FormEvent) {
    e.preventDefault();
    const c = normalizeCode(code);
    if (c.length >= 6) run('unirse', () => store.joinHousehold(c, author));
  }

  return (
    <div className="center-screen">
      <div className="card login household-setup">
        <img className="login-logo" src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" />
        <h1>Vuestro espacio</h1>
        <p className="muted small">Las recetas, el menú y la despensa son de vuestro espacio. Solo lo veis quienes estéis en él.</p>

        <form className="household-option" onSubmit={join}>
          <h2>Unirme al de mi pareja</h2>
          <label className="field">
            <span>Código</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="AB3K9X"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              className="code-input"
            />
          </label>
          <button className="btn primary" disabled={busy !== null || normalizeCode(code).length < 6}>
            {busy === 'unirse' ? 'Uniéndome…' : 'Unirme'}
          </button>
        </form>

        <div className="household-or">
          <span>o</span>
        </div>

        <form className="household-option" onSubmit={create}>
          <h2>Crear uno nuevo</h2>
          <label className="field">
            <span>Nombre</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ana y Leo" maxLength={60} />
          </label>
          <button className="btn" disabled={busy !== null || !name.trim()}>
            {busy === 'crear' ? 'Creando…' : 'Crear espacio'}
          </button>
        </form>

        {error && <p className="error">{error}</p>}
        {supabase && (
          <button type="button" className="btn ghost small forgot" onClick={() => supabase!.auth.signOut()}>
            Salir
          </button>
        )}
      </div>
    </div>
  );
}
