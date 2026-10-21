/**
 * Porción de pizza en pixel art que baila (tres fotogramas que se alternan con CSS).
 * Con `dancing={false}` se queda quieta en el primer fotograma.
 */
const OUTLINE =
  'M1 0h14v1h-14z M1 1h1v2h-1z M14 1h1v2h-1z M2 3h1v2h-1z M13 3h1v2h-1z M3 5h1v2h-1z M12 5h1v2h-1z M4 7h1v2h-1z M11 7h1v2h-1z M5 9h1v2h-1z M10 9h1v2h-1z M6 11h1v1h-1z M9 11h1v1h-1z M7 12h2v1h-2z M5 4h1v2h-1z M10 4h1v2h-1z M6 6h1v1h-1z M9 6h1v1h-1z M7 7h2v1h-2z';

/** Brazos, piernas y mano levantada de cada fotograma */
const FRAMES = [
  {
    cls: 'pz-a',
    shadow: 'M4 16h8v1h-8z',
    lift: 0,
    limbs:
      'M3 7h1v1h-1z M2 6h1v1h-1z M1 5h1v1h-1z M12 7h1v1h-1z M13 8h1v1h-1z M14 9h1v1h-1z M7 13h1v1h-1z M6 14h1v1h-1z M5 15h1v1h-1z M4 15h1v1h-1z M8 13h1v2h-1z M8 15h2v1h-2z',
    hands: 'M1 4h1v1h-1z M14 10h1v1h-1z',
  },
  {
    cls: 'pz-b',
    shadow: 'M4 16h8v1h-8z',
    lift: 0,
    limbs:
      'M12 7h1v1h-1z M13 6h1v1h-1z M14 5h1v1h-1z M3 7h1v1h-1z M2 8h1v1h-1z M1 9h1v1h-1z M8 13h1v1h-1z M9 14h1v1h-1z M10 15h1v1h-1z M11 15h1v1h-1z M7 13h1v2h-1z M6 15h2v1h-2z',
    hands: 'M14 4h1v1h-1z M1 10h1v1h-1z',
  },
  {
    cls: 'pz-c',
    shadow: 'M6 16h4v1h-4z',
    lift: -1,
    limbs:
      'M3 7h1v1h-1z M2 6h1v1h-1z M1 5h1v1h-1z M12 7h1v1h-1z M13 6h1v1h-1z M14 5h1v1h-1z M7 13h1v1h-1z M6 14h1v1h-1z M5 15h1v1h-1z M4 15h1v1h-1z M8 13h1v1h-1z M9 14h1v1h-1z M10 15h1v1h-1z M11 15h1v1h-1z',
    hands: 'M1 4h1v1h-1z M14 4h1v1h-1z',
  },
];

export default function DancingPizza({ size = 120, dancing = true }: { size?: number; dancing?: boolean }) {
  return (
    <svg
      className={dancing ? 'pizza dancing' : 'pizza'}
      role="img"
      aria-label={dancing ? 'Pizza bailando mientras elige receta' : 'Pizza esperando'}
      viewBox="-2 -1 20 18"
      width={size}
      height={(size * 18) / 20}
      shapeRendering="crispEdges"
    >
      <g fill="#ffe14d" className="pz-spark">
        <path d="M-1 0h1v3h-1z M-2 1h3v1h-3z" />
      </g>
      <g fill="#7fe3ff" className="pz-spark pz-spark-2">
        <path d="M16 1h1v3h-1z M15 2h3v1h-3z" />
      </g>
      {FRAMES.map((f) => (
        <g key={f.cls} className={f.cls}>
          <path fill="#2b1608" opacity="0.35" d={f.shadow} />
          <g transform={`translate(0 ${f.lift})`}>
            <path fill="#f4b64f" d="M2 1h12v1h-12z" />
            <path fill="#d98a2b" d="M2 2h12v1h-12z" />
            <path fill="#ffd93d" d="M3 3h10v2h-10z M4 5h8v2h-8z M5 7h6v2h-6z M6 9h4v2h-4z M7 11h2v1h-2z" />
            <path fill="#e04a3a" d="M7 3h2v2h-2z M3 3h2v1h-2z M11 3h2v1h-2z M7 9h2v2h-2z" />
            <path fill="#ff8fa3" d="M4 6h1v1h-1z M11 6h1v1h-1z" />
            <path fill="#4a2410" d={OUTLINE} />
            <path fill="#4a2410" d={f.limbs} />
            <path fill="#f4b64f" d={f.hands} />
          </g>
        </g>
      ))}
    </svg>
  );
}
