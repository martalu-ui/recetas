import { useState, type FormEvent } from 'react';
import { usePantry } from '../pantry';
import { oweText, voucherTitle, type Voucher, type VoucherKind } from '../lib/vouchers';
import Modal from './Modal';
import VoucherTicket from './VoucherTicket';

const comidas = (n: number) => (n === 1 ? '1 comida' : `${n} comidas`);

/** Cuenta: canjear comidas por vales (y editar el catálogo entre los dos) */
export function VouchersCard() {
  const pantry = usePantry()!;
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const balance = pantry.available.length;

  async function redeem(kind: VoucherKind) {
    const title = voucherTitle(kind.what);
    if (!confirm(`¿Canjear «${title}» por ${comidas(kind.cost)}? Le avisaremos a tu pareja.`)) return;
    setBusy(kind.id);
    setMessage(null);
    try {
      await pantry.redeem(kind);
      setMessage({ ok: true, text: `¡Canjeado! Tu pareja ya sabe que te debe ${kind.what}.` });
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="account-card">
      <div className="card-head">
        <h2>Vales para tu pareja</h2>
        <button className="btn small" onClick={() => setEditing((e) => !e)} aria-pressed={editing}>
          {editing ? 'Listo' : 'Editar'}
        </button>
      </div>
      <p className="muted small">
        {editing ? (
          'Cambia lo que regala cada vale y lo que cuesta. Los cambios son para los dos.'
        ) : (
          <>
            Tienes <strong>{comidas(balance)}</strong> para gastar.
          </>
        )}
      </p>
      {message && !editing && <p className={message.ok ? 'ok' : 'error'}>{message.text}</p>}
      {editing ? (
        <KindsEditor />
      ) : (
        <div className="tickets">
          {pantry.kinds.map((v) => {
            const missing = v.cost - balance;
            return (
              <VoucherTicket key={v.id} title={voucherTitle(v.what)} detail={comidas(v.cost)}>
                <button className="btn small primary" disabled={missing > 0 || busy !== null} onClick={() => redeem(v)}>
                  {busy === v.id ? 'Canjeando…' : missing > 0 ? `Faltan ${missing}` : 'Canjear'}
                </button>
              </VoucherTicket>
            );
          })}
          {pantry.kinds.length === 0 && <p className="muted small">No hay vales. Pulsa «Editar» para crear el primero.</p>}
        </div>
      )}
      {!editing && <NotifyButton />}
    </div>
  );
}

/** Editar el catálogo: cada vale es «Vale por …» y su precio en comidas; se guarda al salir del campo */
function KindsEditor() {
  const pantry = usePantry()!;
  const [error, setError] = useState<string | null>(null);
  const [what, setWhat] = useState('');
  const [cost, setCost] = useState('5');

  async function run(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(`No se ha podido guardar: ${(e as Error).message}`);
    }
  }

  async function add(e: FormEvent) {
    e.preventDefault();
    const n = Number(cost);
    if (!what.trim() || !(n >= 1)) return;
    await run(() => pantry.saveKind({ what, cost: n }));
    setWhat('');
  }

  return (
    <div className="kinds-editor">
      {pantry.kinds.map((k) => (
        <KindRow key={k.id} kind={k} onSave={(changes) => run(() => pantry.saveKind({ id: k.id, ...changes }))} onDelete={() => run(() => pantry.deleteKind(k))} />
      ))}
      <form className="kind-row new" onSubmit={add}>
        <label className="kind-what">
          <span>Vale por</span>
          <input value={what} onChange={(e) => setWhat(e.target.value)} placeholder="un paseo por la playa" aria-label="Nuevo vale: qué regala" />
        </label>
        <label className="kind-cost">
          <input type="number" min={1} max={999} value={cost} onChange={(e) => setCost(e.target.value)} aria-label="Nuevo vale: comidas que cuesta" />
          <span>comidas</span>
        </label>
        <button className="btn small primary" disabled={!what.trim() || !(Number(cost) >= 1)}>
          Añadir
        </button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

function KindRow({ kind, onSave, onDelete }: { kind: VoucherKind; onSave(changes: { what: string; cost: number }): void; onDelete(): void }) {
  const [what, setWhat] = useState(kind.what);
  const [cost, setCost] = useState(String(kind.cost));

  function save() {
    const n = Number(cost);
    if (!what.trim() || !(n >= 1)) {
      // Lo que no vale vuelve a como estaba
      setWhat(kind.what);
      setCost(String(kind.cost));
      return;
    }
    if (what.trim() !== kind.what || n !== kind.cost) onSave({ what, cost: n });
  }

  return (
    <div className="kind-row">
      <label className="kind-what">
        <span>Vale por</span>
        <input value={what} onChange={(e) => setWhat(e.target.value)} onBlur={save} aria-label={`Qué regala: ${kind.what}`} />
      </label>
      <label className="kind-cost">
        <input type="number" min={1} max={999} value={cost} onChange={(e) => setCost(e.target.value)} onBlur={save} aria-label={`Comidas que cuesta: ${kind.what}`} />
        <span>comidas</span>
      </label>
      <button
        className="icon-btn"
        onClick={() => confirm(`¿Borrar «${voucherTitle(kind.what)}»? Los vales ya canjeados se quedan.`) && onDelete()}
        aria-label={`Borrar ${kind.what}`}
        title="Borrar"
      >
        ×
      </button>
    </div>
  );
}

/** Los vales pendientes: los que te deben y los que debes tú */
export function OwedCard() {
  const pantry = usePantry()!;
  const owedToMe = pantry.vouchers.filter((v) => v.mine);
  const iOwe = pantry.vouchers.filter((v) => !v.mine);
  if (owedToMe.length === 0 && iOwe.length === 0) return null;

  const list = (vouchers: Voucher[], owe: boolean) => (
    <div className="tickets">
      {vouchers.map((v) => (
        <VoucherTicket
          key={v.id}
          title={v.title}
          done={v.status === 'cumplido'}
          detail={v.status === 'cumplido' ? 'Cumplido' : owe ? oweText(v.title, v.author) : 'Pendiente'}
        >
          {owe && v.status === 'pendiente' && (
            <button className="btn small" onClick={() => pantry.complete(v)}>
              ¡Cumplido!
            </button>
          )}
        </VoucherTicket>
      ))}
    </div>
  );

  return (
    <div className="account-card">
      {iOwe.length > 0 && (
        <>
          <h2>Debes tú</h2>
          {list(iOwe, true)}
        </>
      )}
      {owedToMe.length > 0 && (
        <>
          <h2 className={iOwe.length > 0 ? 'owed-second' : undefined}>Te deben</h2>
          {list(owedToMe, false)}
        </>
      )}
    </div>
  );
}

/** Notificaciones del sistema para cuando la app está abierta en segundo plano */
function NotifyButton() {
  const [permission, setPermission] = useState(() => ('Notification' in window ? Notification.permission : 'denied'));
  if (permission !== 'default') return null;
  return (
    <button className="btn small ghost notify-btn" onClick={() => Notification.requestPermission().then(setPermission)}>
      Avisarme también con notificaciones
    </button>
  );
}

/** Aviso a la pareja: sale al abrir la app (o al momento) cuando te han canjeado un vale */
export function VoucherNotice() {
  const pantry = usePantry();
  const v = pantry?.incoming[0];
  if (!pantry || !v) return null;
  return (
    <Modal label="Vale canjeado" onClose={() => pantry.markSeen(v)}>
      <div className="voucher-notice">
        <span className="onb-kicker">{v.author ?? 'Tu pareja'} ha canjeado un vale</span>
        <VoucherTicket title={v.title} detail={`${v.cost} comidas de su despensa`} />
        <h2>{oweText(v.title, v.author)}</h2>
        <div className="onb-actions">
          <button className="btn ghost" onClick={() => pantry.markSeen(v)}>
            Vale, lo cumpliré
          </button>
          <button
            className="btn primary"
            onClick={async () => {
              await pantry.complete(v);
            }}
          >
            ¡Ya está cumplido!
          </button>
        </div>
      </div>
    </Modal>
  );
}
