import { useState } from 'react';
import { useHousehold } from '../household';
import Switch from './Switch';

/** Ajustes del espacio: lo que cambies aquí lo veis los dos */
export default function SettingsCard() {
  const ctx = useHousehold();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!ctx) return null;
  const { settings } = ctx.household;

  async function setThermomix(on: boolean) {
    setBusy(true);
    setError(null);
    try {
      await ctx!.update({ settings: { ...settings, thermomix: on } });
    } catch (e) {
      setError(`No se ha podido guardar: ${(e as Error).message}`);
    }
    setBusy(false);
  }

  return (
    <div className="account-card">
      <h2>Ajustes</h2>
      <div className="setting">
        <div>
          <p className="setting-name">Thermomix</p>
          <p className="muted small">Si no tenéis, se esconde de las recetas, de Descubrir y del formulario.</p>
        </div>
        <Switch checked={settings.thermomix} onChange={setThermomix} label="Tenemos Thermomix" disabled={busy} />
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
