import { useState } from 'react';
import { usePantry } from '../pantry';
import { oweText, VOUCHERS, type Voucher } from '../lib/vouchers';
import Modal from './Modal';
import VoucherTicket from './VoucherTicket';

const comidas = (n: number) => (n === 1 ? '1 comida' : `${n} comidas`);

/** Cuenta: canjear comidas por vales y ver los que te deben y los que debes */
export function VouchersCard() {
  const pantry = usePantry()!;
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const balance = pantry.available.length;

  async function redeem(kind: string, title: string, cost: number) {
    if (!confirm(`¿Canjear «${title}» por ${comidas(cost)}? Le avisaremos a tu pareja.`)) return;
    setBusy(kind);
    setMessage(null);
    try {
      await pantry.redeem(kind);
      setMessage({ ok: true, text: `¡Canjeado! Tu pareja ya sabe que te debe ${title.replace(/^Vale por /, '')}.` });
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="account-card">
      <h2>Vales para tu pareja</h2>
      <p className="muted small">
        Canjea las comidas de tu bote por vales. Tienes <strong>{comidas(balance)}</strong> para gastar.
      </p>
      {message && <p className={message.ok ? 'ok' : 'error'}>{message.text}</p>}
      <div className="tickets">
        {VOUCHERS.map((v) => {
          const missing = v.cost - balance;
          return (
            <VoucherTicket key={v.id} title={v.title} detail={comidas(v.cost)}>
              <button className="btn small primary" disabled={missing > 0 || busy !== null} onClick={() => redeem(v.id, v.title, v.cost)}>
                {busy === v.id ? 'Canjeando…' : missing > 0 ? `Faltan ${missing}` : 'Canjear'}
              </button>
            </VoucherTicket>
          );
        })}
      </div>
      <NotifyButton />
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
          detail={v.status === 'cumplido' ? 'Cumplido' : owe ? oweText(v.kind, v.title, v.author) : 'Pendiente'}
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
        <h2>{oweText(v.kind, v.title, v.author)}</h2>
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
