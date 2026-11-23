import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** `children` puede ser una función que recibe `close` para cerrar con la animación. `centered`: ventana en el centro también en el móvil (en vez de hoja que sube desde abajo), para avisos cortos */
export default function Modal({ label, onClose, children, centered = false, className }: { label: string; onClose(): void; children: ReactNode | ((close: () => void) => ReactNode); centered?: boolean; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [closing, setClosing] = useState(false);

  // Al cerrar, primero se va con su animación (--motion-exit) y luego se desmonta
  const close = useCallback(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return onClose();
    setClosing(true);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    const unlock = lockScroll();
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      unlock();
    };
  }, [close]);

  // En el body: dentro de una vista con animación (transform) el fondo fijo no taparía toda la pantalla
  return createPortal(
    <div
      className={['modal-backdrop', centered && 'centered', closing && 'closing'].filter(Boolean).join(' ')}
      onMouseDown={(e) => e.target === e.currentTarget && close()}
      onAnimationEnd={(e) => closing && e.target === e.currentTarget && onClose()}
    >
      <div className={className ? `modal ${className}` : 'modal'} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} ref={ref}>
        <button className="modal-close" onClick={close} aria-label="Cerrar">
          ×
        </button>
        {typeof children === 'function' ? children(close) : children}
      </div>
    </div>,
    document.body,
  );
}

/**
 * Bloquea el scroll de la página de fondo. En el iPhone no basta con overflow: hidden (la página
 * de detrás se sigue moviendo al deslizar dentro de la hoja): se fija el body donde estaba y al cerrar se vuelve ahí.
 * Lleva la cuenta por si hay dos ventanas abiertas a la vez.
 */
let locks = 0;
let savedY = 0;

function lockScroll(): () => void {
  const body = document.body;
  if (locks++ === 0) {
    savedY = window.scrollY;
    body.classList.add('no-scroll');
    body.style.top = `-${savedY}px`;
  }
  return () => {
    if (--locks > 0) return;
    body.classList.remove('no-scroll');
    body.style.top = '';
    window.scrollTo(0, savedY);
  };
}
