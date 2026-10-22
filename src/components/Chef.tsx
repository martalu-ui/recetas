/**
 * Chef en pixel art que saltea una tortita en la sartén (animación por pasos con CSS).
 * Con `cooking={false}` se queda quieto.
 */
export default function Chef({ size = 120, cooking = true }: { size?: number; cooking?: boolean }) {
  return (
    <svg
      className={cooking ? 'chef cooking' : 'chef'}
      role="img"
      aria-label={cooking ? 'Chef cocinando mientras elige receta' : 'Chef esperando'}
      viewBox="-1 -1 24 23"
      width={size}
      height={(size * 23) / 24}
      shapeRendering="crispEdges"
    >
      <path fill="#2b1608" opacity="0.25" d="M2 21h10v1h-10z" />

      <g>
        {/* Gorro */}
        <path fill="#ffffff" d="M4 1h6v1h-6z M3 2h8v2h-8z M4 4h6v1h-6z" />
        <path fill="#d9dbe8" d="M3 2h1v2h-1z M7 1h1v3h-1z M4 5h6v1h-6z" />
        <path fill="#3b2a2a" d="M4 0h6v1h-6z M3 1h1v1h-1z M10 1h1v1h-1z M2 2h1v2h-1z M11 2h1v2h-1z M3 4h1v2h-1z M10 4h1v2h-1z M3 6h8v1h-8z" />
        {/* Cara */}
        <path fill="#f6c7a1" d="M4 7h6v3h-6z" />
        <path fill="#3b2a2a" d="M3 7h1v3h-1z M10 7h1v3h-1z M4 10h6v1h-6z M5 7h1v2h-1z M8 7h1v2h-1z" />
        <path fill="#ff9aa8" d="M4 8h1v1h-1z M9 8h1v1h-1z" />
        <path fill="#7a4a24" d="M4 9h6v1h-6z" />
        {/* Chaqueta */}
        <path fill="#ffffff" d="M3 11h8v6h-8z" />
        <path fill="#d9dbe8" d="M9 12h2v5h-2z" />
        <path fill="#d9473c" d="M5 11h4v1h-4z M6 12h2v1h-2z" />
        <path fill="#3b2a2a" d="M2 11h1v6h-1z M11 11h1v6h-1z M1 11h1v1h-1z M5 13h1v1h-1z M8 13h1v1h-1z M5 15h1v1h-1z M8 15h1v1h-1z" />
        {/* Brazo */}
        <path fill="#ffffff" d="M1 12h1v3h-1z" />
        <path fill="#f6c7a1" d="M1 15h1v2h-1z" />
        <path fill="#3b2a2a" d="M0 12h1v5h-1z M1 17h1v1h-1z" />
        {/* Piernas */}
        <path fill="#4f5f94" d="M3 17h8v1h-8z M3 18h3v1h-3z M8 18h3v1h-3z" />
        <path fill="#7a4a2a" d="M3 19h3v1h-3z M8 19h3v1h-3z" />
        <path fill="#3b2a2a" d="M2 17h1v4h-1z M11 17h1v4h-1z M6 18h2v3h-2z M2 20h10v1h-10z" />
      </g>

      <g className="chef-pan">
        <path fill="#ffffff" d="M12 13h2v3h-2z" />
        <path fill="#f6c7a1" d="M14 13h1v3h-1z" />
        <path fill="#3b2a2a" d="M12 12h3v1h-3z M12 16h3v1h-3z M15 13h2v1h-2z M15 15h2v1h-2z" />
        <path fill="#8a5a2b" d="M15 14h2v1h-2z" />
        <path fill="#3b2a2a" d="M17 14h1v2h-1z M22 14h1v2h-1z M18 16h4v1h-4z" />
        <path fill="#b8bec9" d="M18 14h4v1h-4z" />
        <path fill="#4d525e" d="M18 15h4v1h-4z" />
      </g>

      <g className="chef-food">
        <path fill="#3b2a2a" d="M18 11h4v1h-4z M17 12h1v1h-1z M22 12h1v1h-1z M18 13h4v1h-4z" />
        <path fill="#f0b24a" d="M18 12h4v1h-4z" />
        <g className="chef-food-a">
          <path fill="#ffe27a" d="M19 12h2v1h-2z" />
        </g>
        <g className="chef-food-b">
          <path fill="#d98a2b" d="M18 12h4v1h-4z" />
        </g>
      </g>
    </svg>
  );
}
