import { useEffect, useState } from 'react';
import type { Token } from './tokens';

/**
 * Modo inspeccionar: al pasar el ratón (o tocar, en el móvil) por un componente de los ejemplos
 * enseña sus medidas como las herramientas del navegador: contenido, padding y margin,
 * y qué token usan su radio, su fondo y su color de texto.
 */

interface Box {
  name: string;
  rect: DOMRect;
  padding: [number, number, number, number];
  margin: [number, number, number, number];
  radius: string;
  background: string;
  color: string;
  font: string;
  gap: string | null;
}

const px = (v: string) => parseFloat(v) || 0;

function describe(el: Element): Box {
  const cs = getComputedStyle(el);
  const cls = [...el.classList].filter((c) => !c.startsWith('ds-')).slice(0, 2);
  return {
    name: el.tagName.toLowerCase() + cls.map((c) => `.${c}`).join(''),
    rect: el.getBoundingClientRect(),
    padding: [px(cs.paddingTop), px(cs.paddingRight), px(cs.paddingBottom), px(cs.paddingLeft)],
    margin: [px(cs.marginTop), px(cs.marginRight), px(cs.marginBottom), px(cs.marginLeft)],
    radius: cs.borderTopLeftRadius,
    background: cs.backgroundColor,
    color: cs.color,
    font: `${Math.round(px(cs.fontSize))}px · ${cs.fontWeight}`,
    gap: /flex|grid/.test(cs.display) && cs.gap !== 'normal' && px(cs.gap) > 0 ? cs.gap : null,
  };
}

/** #rrggbb → rgb(r, g, b), como lo devuelve getComputedStyle */
function hexToRgb(hex: string) {
  const m = hex.match(/^#([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

/** Tokens semánticos cuyo valor coincide con el que tiene el elemento, en el tema que se ve */
function matcher(tokens: Token[], dark: boolean) {
  const semantic = tokens.filter((t) => t.tier === 'semantic');
  return {
    color(value: string) {
      return semantic.filter((t) => hexToRgb(dark ? t.darkValue : t.lightValue) === value).map((t) => t.name);
    },
    radius(value: string) {
      return semantic.filter((t) => t.name.startsWith('--radius') && t.lightValue === value).map((t) => t.name);
    },
  };
}

const sides = (v: [number, number, number, number]) =>
  v.every((n) => n === v[0]) ? `${v[0]}` : v[0] === v[2] && v[1] === v[3] ? `${v[0]} ${v[1]}` : v.join(' ');

export default function Inspector({ enabled, tokens, dark }: { enabled: boolean; tokens: Token[]; dark: boolean }) {
  const [box, setBox] = useState<Box | null>(null);

  useEffect(() => {
    if (!enabled) {
      setBox(null);
      return;
    }
    document.body.classList.add('ds-inspecting');
    let target: Element | null = null;

    const pick = (el: EventTarget | null) => {
      const node = el instanceof Element ? el : null;
      const inPreview = node?.closest('.ds-preview');
      target = inPreview && node !== inPreview ? node : null;
      setBox(target ? describe(target) : null);
    };
    const onMove = (e: PointerEvent) => e.pointerType === 'mouse' && pick(e.target);
    // Mientras se inspecciona, un clic o toque elige el elemento en vez de usar el componente
    const onClick = (e: MouseEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest('.ds-preview')) return;
      e.preventDefault();
      e.stopPropagation();
      pick(e.target);
    };
    const onScroll = () => target && setBox(describe(target));

    document.addEventListener('pointermove', onMove);
    document.addEventListener('click', onClick, true);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.body.classList.remove('ds-inspecting');
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [enabled]);

  if (!enabled || !box) return null;

  const { rect: r, padding: p, margin: m } = box;
  const match = matcher(tokens, dark);
  const radiusTokens = match.radius(box.radius);
  const bgTokens = box.background === 'rgba(0, 0, 0, 0)' ? [] : match.color(box.background);
  const colorTokens = match.color(box.color);

  // Tiras de margin (fuera) y padding (dentro), como en las herramientas del navegador
  const strips = (outer: { l: number; t: number; w: number; h: number }, s: number[], cls: string) => [
    <div key={`${cls}t`} className={cls} style={{ left: outer.l, top: outer.t, width: outer.w, height: s[0] }} />,
    <div key={`${cls}b`} className={cls} style={{ left: outer.l, top: outer.t + outer.h - s[2], width: outer.w, height: s[2] }} />,
    <div key={`${cls}l`} className={cls} style={{ left: outer.l, top: outer.t + s[0], width: s[3], height: outer.h - s[0] - s[2] }} />,
    <div key={`${cls}r`} className={cls} style={{ left: outer.l + outer.w - s[1], top: outer.t + s[0], width: s[1], height: outer.h - s[0] - s[2] }} />,
  ];
  const marginBox = { l: r.left - m[3], t: r.top - m[0], w: r.width + m[1] + m[3], h: r.height + m[0] + m[2] };
  const borderBox = { l: r.left, t: r.top, w: r.width, h: r.height };

  // La etiqueta va debajo del elemento, o encima si no cabe
  const below = r.bottom + m[2] + 8;
  const tipTop = below + 150 < window.innerHeight ? below : Math.max(8, r.top - m[0] - 158);
  const tipLeft = Math.min(Math.max(8, r.left), window.innerWidth - 268);

  return (
    <div className="ds-inspector" aria-hidden>
      {strips(marginBox, m, 'ds-ins-margin')}
      {strips(borderBox, p, 'ds-ins-padding')}
      <div
        className="ds-ins-content"
        style={{ left: r.left + p[3], top: r.top + p[0], width: Math.max(0, r.width - p[1] - p[3]), height: Math.max(0, r.height - p[0] - p[2]) }}
      />
      <div className="ds-ins-tip" style={{ left: tipLeft, top: tipTop }}>
        <strong>{box.name}</strong>
        <span>
          {Math.round(r.width)} × {Math.round(r.height)}
        </span>
        <dl>
          <dt className="pad">padding</dt>
          <dd>{sides(p)}</dd>
          <dt className="mar">margin</dt>
          <dd>{sides(m)}</dd>
          {box.gap && (
            <>
              <dt>gap</dt>
              <dd>{box.gap}</dd>
            </>
          )}
          <dt>radius</dt>
          <dd>
            {box.radius}
            {radiusTokens.length > 0 && <em> {radiusTokens.join(', ')}</em>}
          </dd>
          <dt>font</dt>
          <dd>{box.font}</dd>
          {bgTokens.length > 0 && (
            <>
              <dt>bg</dt>
              <dd>
                <em>{bgTokens.join(', ')}</em>
              </dd>
            </>
          )}
          {colorTokens.length > 0 && (
            <>
              <dt>text</dt>
              <dd>
                <em>{colorTokens.join(', ')}</em>
              </dd>
            </>
          )}
        </dl>
      </div>
    </div>
  );
}
