import { useState } from 'react';
import { inviteLink, type Household } from '../lib/household';
import { appUrl } from '../lib/supabase';

/** Cuenta: quién está en vuestro espacio y el código para invitar a la pareja */
export default function HouseholdCard({ household }: { household: Household }) {
  const [copied, setCopied] = useState(false);
  const link = inviteLink(appUrl(), household.inviteCode);

  async function share() {
    const text = `Únete a «${household.name}» en MajoChef con el código ${household.inviteCode}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'MajoChef', text, url: link });
        return;
      }
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // compartir cancelado o sin portapapeles: el código se ve en pantalla
    }
  }

  return (
    <div className="account-card household-card">
      <div className="card-head">
        <h2>{household.name}</h2>
        <span className="muted small">Vuestro espacio</span>
      </div>
      <ul className="members">
        {household.members.map((m, i) => (
          <li key={`${m.name}-${i}`}>{m.me && m.name !== 'Tú' ? `${m.name} (tú)` : m.name}</li>
        ))}
      </ul>
      <div className="invite">
        <span className="muted small">Código para invitar</span>
        <code className="invite-code">{household.inviteCode}</code>
        <button className="btn small" onClick={share}>
          {copied ? 'Enlace copiado' : 'Compartir enlace'}
        </button>
      </div>
    </div>
  );
}
