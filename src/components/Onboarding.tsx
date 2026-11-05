import { useState } from 'react';
import Chef from './Chef';
import { Sprite, type SpriteName } from './FoodSprite';
import Modal from './Modal';
import Avatar from './Avatar';
import Icon from './Icon';
import VoucherTicket from './VoucherTicket';

/** Recorrido de bienvenida: sale una vez (por dispositivo) a quien abre la app por primera vez.
 *  Cambia la versión para volver a enseñarlo cuando cambie mucho la app. */
const SEEN_KEY = 'majochef.bienvenida';
const VERSION = '1';
/** Quien ya vio el aviso de novedades de la despensa ya conoce la app: no le enseñamos el recorrido */
const OLD_NEWS_KEY = 'majochef.novedades';

const RAIN: SpriteName[] = ['tomato', 'fries', 'egg', 'carrot', 'cheese', 'bread', 'fish'];

const STEPS = [
  {
    title: 'Hi chef!',
    text: 'MajoChef es vuestro recetario: las recetas de los dos, el menú de la semana y una despensa con premios por cocinar.',
    art: (
      <div className="onb-art" aria-hidden>
        <Chef size={130} />
      </div>
    ),
  },
  {
    title: 'Subid vuestras recetas',
    text: 'Con el botón + añades una receta: foto, ingredientes, tiempo y si es para comer, para cenar o las dos.',
    art: (
      <div className="onb-art onb-recipes" aria-hidden>
        {(['pot', 'fish', 'broccoli'] as SpriteName[]).map((name) => (
          <span key={name} className="onb-card">
            <Sprite name={name} size={44} />
          </span>
        ))}
        <span className="onb-plus">
          <Icon name="plus" size={22} />
        </span>
      </div>
    ),
  },
  {
    title: '¿Qué cocinamos hoy?',
    text: 'En Descubrir el chef os elige una receta al azar, o la que mejor encaja con lo que tenéis en la nevera.',
    art: (
      <div className="onb-art" aria-hidden>
        <Chef size={120} />
        <span className="onb-dice">
          <Icon name="dice" size={40} />
        </span>
      </div>
    ),
  },
  {
    title: 'Planead la semana',
    text: 'En Semana elegís la comida y la cena de cada día. «Rellenar huecos al azar» lo hace por vosotros, cuidando que el menú sea equilibrado.',
    art: (
      <div className="onb-art onb-week" aria-hidden>
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => (
          <span key={d} className={i === 3 ? 'today' : undefined}>
            {d}
          </span>
        ))}
      </div>
    ),
  },
  {
    title: 'Cocina y gana comidas',
    text: 'Cuando hagas un plato del menú, pulsa «¿La has hecho?» debajo. Cae una comida en tu despensa (en Cuenta) y cruza un unicornio.',
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
    title: 'Canjéalas por vales',
    text: 'Gasta las comidas en vales para tu pareja: un masaje, una cena fuera… Le llega un aviso de que te lo debe.',
    art: (
      <div className="onb-art onb-tickets" aria-hidden>
        <VoucherTicket title="Vale por un masaje" detail="6 comidas" />
        <VoucherTicket title="Vale por un día de cine" detail="Le debes un día de cine" />
      </div>
    ),
  },
  {
    title: 'Invita a tu pareja',
    text: 'En Cuenta está el código de vuestro espacio: compártelo para que tu pareja se una y lo veáis todo juntos. Nadie más lo ve.',
    art: (
      <div className="onb-art onb-couple" aria-hidden>
        <span className="avatar">
          <Avatar value="pizza" size={44} />
        </span>
        <span className="avatar">
          <Avatar value="egg" size={44} />
        </span>
      </div>
    ),
  },
];

function alreadySeen() {
  try {
    return localStorage.getItem(SEEN_KEY) === VERSION || localStorage.getItem(OLD_NEWS_KEY) !== null;
  } catch {
    return false;
  }
}

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
    <Modal label="Cómo funciona MajoChef" onClose={close} centered>
      <div className="onboarding">
        {s.art}
        <div className="onb-text">
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
              location.hash = '#/recetas';
            }}
          >
            {last ? 'Empezar' : 'Siguiente'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
