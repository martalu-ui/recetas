/** Unicornio pixel art que galopa (dos fotogramas de patas que se alternan con CSS) */
export default function Unicorn({ size = 240 }: { size?: number }) {
  const stroke = { stroke: '#4a2a5a', strokeWidth: 2, paintOrder: 'stroke' } as const;
  return (
    <svg
      className="unicorn"
      role="img"
      aria-label="Unicornio galopando"
      viewBox="-6 -3 30 25"
      width={size}
      height={(size * 25) / 30}
      shapeRendering="crispEdges"
    >
      <path fill="#4a2a5a" opacity="0.2" d="M3 21h12v1h-12z" />
      <g fill="#ffd24a" className="uni-spark">
        <path d="M-3 4h1v3h-1z M-4 5h3v1h-3z" />
      </g>
      <g fill="#7fdcff" className="uni-spark uni-spark-2">
        <path d="M-2 11h1v3h-1z M-3 12h3v1h-3z" />
      </g>
      <g fill="#ff8fc7" className="uni-spark uni-spark-2">
        <path d="M-5 9h1v1h-1z" />
      </g>

      {/* Patas: dos fotogramas */}
      <g className="uni-legs-a">
        <path fill="#ffffff" {...stroke} d="M4 16h2v4h-2z M13 16h2v4h-2z M8 16h2v3h-2z M11 16h2v3h-2z" />
        <path fill="#ffb6d9" d="M4 19h2v1h-2z M13 19h2v1h-2z M8 18h2v1h-2z M11 18h2v1h-2z" />
      </g>
      <g className="uni-legs-b">
        <path fill="#ffffff" {...stroke} d="M7 16h2v4h-2z M10 16h2v4h-2z M5 16h2v3h-2z M14 16h2v3h-2z" />
        <path fill="#ffb6d9" d="M7 19h2v1h-2z M10 19h2v1h-2z M5 18h2v1h-2z M14 18h2v1h-2z" />
      </g>

      <g className="uni-bob">
        {/* Cola arcoíris */}
        <path fill="#ff8fc7" {...stroke} d="M2 7h2v1h-2z M1 8h3v1h-3z M0 9h4v1h-4z M0 10h3v4h-3z M1 14h2v1h-2z" />
        <path fill="#b69cff" d="M0 10h3v2h-3z" />
        <path fill="#7fdcff" d="M0 12h3v2h-3z M1 14h2v1h-2z" />
        {/* Cuerno */}
        <path fill="#ffd24a" {...stroke} d="M19 -2h1v2h-1z M18 0h2v3h-2z" />
        <path fill="#ffa21f" d="M19 -1h1v1h-1z M18 1h2v1h-2z" />
        {/* Cuerpo y cabeza */}
        <path
          fill="#ffffff"
          {...stroke}
          d="M14 3h7v8h-7z M13 4h9v6h-9z M21 7h2v3h-2z M12 7h3v4h-3z M15 1h2v2h-2z M4 9h10v7h-10z M3 10h12v5h-12z"
        />
        <path fill="#e9e3f7" d="M4 15h10v1h-10z M3 14h1v1h-1z M14 14h1v1h-1z" />
        <path fill="#ffb6d9" d="M16 2h1v1h-1z M15 9h2v1h-2z" />
        <path fill="#4a2a5a" d="M17 6h2v3h-2z M22 7h1v1h-1z M21 9h1v1h-1z" />
        <path fill="#ffffff" d="M17 6h1v1h-1z M18 8h1v1h-1z" />
        {/* Crin arcoíris */}
        <path fill="#ff8fc7" {...stroke} d="M13 3h4v2h-4z M12 5h2v3h-2z M11 8h2v3h-2z" />
        <path fill="#b69cff" d="M12 5h2v2h-2z" />
        <path fill="#7fdcff" d="M12 7h2v1h-2z M11 8h2v3h-2z" />
      </g>
    </svg>
  );
}
