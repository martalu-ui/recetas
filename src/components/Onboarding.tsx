import { useState } from 'react';
import Chef from './Chef';
import { Sprite, type SpriteName } from './FoodSprite';
import Modal from './Modal';
import Unicorn from './Unicorn';
import VoucherTicket from './VoucherTicket';

/** Cambia la versión para volver a enseñar el onboarding cuando haya otra novedad */
const SEEN_KEY = 'majochef.novedades';
const VERSION = 'despensa-2'; // 2: añade los vales

const RAIN: SpriteName[] = ['tomato', 'fries', 'egg', 'carrot', 'cheese', 'bread', 'fish'];

const STEPS = [
  {
    title: 'Novedad: tu despensa',
    text: 'Cada receta que cocines te da una comida pixel art para tu bote. Caen con gravedad y puedes lanzarlas.',
    art: (
      <div className="onb-rain" aria-hidden>
        {RAIN.map((name, i) => (
          <span key={name} style={{ animationDelay: `${i * 0.12}s` }}>
            <Sprite name={name} size={44} />
          </span>
        ))}
      </div>
    ),
  },
  {
    title: 'Márcalo al cocinar',
    text: 'En el menú de la semana, pulsa «¿La has hecho?» debajo de cada plato que hayas cocinado. Y atento al unicornio.',
    art: (
      <div className="onb-art" aria-hidden>
        <Unicorn size={170} />
      </div>
    ),
  },
  {
    title: 'Canjéalas por vales',
    text: 'Gasta las comidas de tu bote en vales para tu pareja: un masaje, un día de cine, una cena fuera… Le llegará un aviso de que te lo debe.',
    art: (
      <div className="onb-art onb-tickets" aria-hidden>
        <VoucherTicket title="Vale por un masaje" detail="6 comidas" />
        <VoucherTicket title="Vale por un día de cine" detail="Le debes un día de cine" />
      </div>
    ),
  },
  {
    title: '¿Quién cocina más?',
    text: 'En Cuenta tienes el marcador con tu pareja: a ver quién llena antes su despensa.',
    art: (
      <div className="onb-art" aria-hidden>
        <Chef size={130} />
      </div>
    ),
  },
];

function alreadySeen() {
  try {
    return localStorage.getItem(SEEN_KEY) === VERSION;
  } catch {
    return false;
  }
}

/** Aviso de novedades: sale una sola vez (por dispositivo) la primera vez que se abre la app tras lanzarlas */
export default function Onboarding() {
  const [open, setOpen] = useState(() => !alreadySeen());
  const [step, setStep] = useState(0);

  function close() {
    try {
      localStorage.setItem(SEEN_KEY, VERSION);
    } catch {
      // sin almacenamiento: volverá a salir la próxima vez, no pasa nada
    }
    setOpen(false);
  }

  if (!open) return null;
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <Modal label="Novedades" onClose={close}>
      <div className="onboarding">
        {s.art}
        <div className="onb-text">
          <span className="onb-kicker">Novedad · {step + 1}/{STEPS.length}</span>
          <h2>{s.title}</h2>
          <p className="muted">{s.text}</p>
        </div>
        <div className="onb-dots" aria-hidden>
          {STEPS.map((_, i) => (
            <span key={i} className={i === step ? 'on' : ''} />
          ))}
        </div>
        <div className="onb-actions">
          {!last && (
            <button className="btn ghost" onClick={close}>
              Saltar
            </button>
          )}
          <button
            className="btn primary"
            onClick={() => {
              if (!last) return setStep(step + 1);
              close();
              location.hash = '#/cuenta';
            }}
          >
            {last ? '¡A cocinar!' : 'Siguiente'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
