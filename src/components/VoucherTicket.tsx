import type { ReactNode } from 'react';

/** Vale con forma de entrada: título, lo que cuesta o a quién se le debe, y una acción */
export default function VoucherTicket({
  title,
  detail,
  done = false,
  children,
}: {
  title: string;
  detail: ReactNode;
  done?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className={['ticket', done && 'done', children && 'with-stub'].filter(Boolean).join(' ')}>
      <div className="ticket-body">
        <span className="ticket-kicker">Vale</span>
        <strong className="ticket-title">{title.replace(/^Vale por /, 'por ')}</strong>
        <span className="ticket-detail">{detail}</span>
      </div>
      {children && <div className="ticket-stub">{children}</div>}
    </div>
  );
}
