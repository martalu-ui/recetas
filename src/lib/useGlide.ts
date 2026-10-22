import { useEffect, useRef } from 'react';

const ACTIVE = '.on, .active, [aria-selected="true"]';

/**
 * Resaltado que se desliza (como en Fluid Functionalism): en un grupo de opciones (`.segmented`, las pestañas),
 * la pastilla de la opción elegida viaja hasta la nueva en vez de saltar, y otra más suave sigue al ratón.
 * Coloca variables CSS en el contenedor; los estilos están en `.glide` (styles.css).
 * `items` elige qué hijos cuentan como opciones.
 */
export function useGlide<T extends HTMLElement>(items = ':scope > button, :scope > a') {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.add('glide');

    const place = (prefix: 'glide' | 'hover', target: HTMLElement) => {
      el.style.setProperty(`--${prefix}-x`, `${target.offsetLeft}px`);
      el.style.setProperty(`--${prefix}-y`, `${target.offsetTop}px`);
      el.style.setProperty(`--${prefix}-w`, `${target.offsetWidth}px`);
      el.style.setProperty(`--${prefix}-h`, `${target.offsetHeight}px`);
    };

    const update = () => {
      const active = [...el.querySelectorAll<HTMLElement>(items)].find((i) => i.matches(ACTIVE));
      el.style.setProperty('--glide-on', active ? '1' : '0');
      if (active) place('glide', active);
    };

    update();
    // Un fotograma después ya se puede animar: la primera colocación no se ve deslizarse
    const ready = requestAnimationFrame(() => el.setAttribute('data-glide-ready', ''));

    // La opción elegida cambia de clase o de atributo: la seguimos sin que el componente tenga que avisar
    const mo = new MutationObserver(update);
    mo.observe(el, { subtree: true, attributes: true, attributeFilter: ['class', 'aria-selected', 'aria-pressed'] });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(el);

    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const item = (e.target as Element).closest<HTMLElement>(items.replace(/:scope > /g, ''));
      if (!item || item.parentElement !== el) return;
      // Si el ratón entra desde fuera, aparece donde está en vez de deslizarse desde la última opción
      if (!el.hasAttribute('data-hovering')) {
        el.removeAttribute('data-glide-ready');
        place('hover', item);
        requestAnimationFrame(() => el.setAttribute('data-glide-ready', ''));
      } else {
        place('hover', item);
      }
      el.setAttribute('data-hovering', '');
    };
    const onLeave = () => el.removeAttribute('data-hovering');

    el.addEventListener('pointerover', onOver);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(ready);
      mo.disconnect();
      ro?.disconnect();
      el.removeEventListener('pointerover', onOver);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [items]);

  return ref;
}
