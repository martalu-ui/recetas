import { useEffect, useRef, useState } from 'react';
import type { PantryItem } from '../lib/types';
import { isSpriteName, Sprite, SPRITE_LABEL } from './FoodSprite';

/**
 * Bote de «Mi despensa»: cada comida ganada cae con gravedad, rebota y se apila.
 * Física sencilla de círculos hecha a mano: se puede coger una comida y lanzarla, o sacudir el bote.
 */

const SIZE = 44; // px de cada comida
const R = SIZE / 2 - 2; // radio de choque entre comidas (un poco menor que el dibujo, para que se apilen juntitas)
const EDGE = SIZE / 2 + 2; // distancia a paredes y suelo: el dibujo entero (y girado) cabe dentro
const GRAVITY = 2200; // px/s²
const BOUNCE = 0.35;
const FRICTION = 0.985;
const STEPS = 3; // subpasos por fotograma para que no se atraviesen

interface Body {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
}

/** Alto del bote según cuántas comidas hay, para que siempre quepan */
function jarHeight(count: number, width: number) {
  const perRow = Math.max(1, Math.floor(width / (R * 2)));
  const rows = Math.ceil(count / perRow);
  return Math.max(260, rows * R * 1.9 + 140);
}

export default function PantryJar({ items }: { items: PantryItem[] }) {
  const jarRef = useRef<HTMLDivElement>(null);
  const bodies = useRef<Map<string, Body>>(new Map());
  const els = useRef<Map<string, HTMLDivElement>>(new Map());
  const frame = useRef<number>(0);
  const size = useRef({ w: 320, h: 260 });
  const grab = useRef<{ id: string; dx: number; dy: number; lastX: number; lastY: number; lastT: number; moved: boolean } | null>(null);
  const [height, setHeight] = useState(260);
  const reducedMotion = useRef(false);

  // Bucle de física: corre mientras algo se mueve y se duerme cuando todo está quieto
  const wake = useRef<() => void>(() => {});

  useEffect(() => {
    reducedMotion.current = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let last = 0;
    let calm = 0; // fotogramas seguidos casi sin movimiento
    let started = 0;

    function step(dt: number) {
      const { w, h } = size.current;
      const list = [...bodies.current.values()];
      const held = grab.current?.id;
      for (const b of list) {
        if (b.id === held) continue;
        b.vy += GRAVITY * dt;
        b.vx *= FRICTION;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        // Paredes y suelo del bote (por arriba está abierto: las comidas entran cayendo)
        if (b.x < EDGE) {
          b.x = EDGE;
          b.vx = Math.abs(b.vx) * BOUNCE;
        } else if (b.x > w - EDGE) {
          b.x = w - EDGE;
          b.vx = -Math.abs(b.vx) * BOUNCE;
        }
        if (b.y > h - EDGE) {
          b.y = h - EDGE;
          b.vy = -Math.abs(b.vy) * BOUNCE;
          if (Math.abs(b.vy) < 40) b.vy = 0;
          b.vx *= 0.9; // roce con el suelo
        }
      }
      // Choques entre comidas: se separan y se reparten el golpe
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i];
          const b = list[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist2 = dx * dx + dy * dy;
          const min = R * 2;
          if (dist2 >= min * min || dist2 === 0) continue;
          const dist = Math.sqrt(dist2);
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = min - dist;
          const aFixed = a.id === held;
          const bFixed = b.id === held;
          const share = aFixed || bFixed ? 1 : 0.5;
          if (!aFixed) {
            a.x -= nx * overlap * share;
            a.y -= ny * overlap * share;
          }
          if (!bFixed) {
            b.x += nx * overlap * share;
            b.y += ny * overlap * share;
          }
          const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (rel < 0) {
            const impulse = (-(1 + BOUNCE) * rel) / (aFixed || bFixed ? 1 : 2);
            if (!aFixed) {
              a.vx -= impulse * nx;
              a.vy -= impulse * ny;
            }
            if (!bFixed) {
              b.vx += impulse * nx;
              b.vy += impulse * ny;
            }
          }
        }
      }
      // Ruedan un poco según se mueven de lado
      for (const b of list) b.angle += (b.vx * dt) / R;
    }

    function draw() {
      for (const b of bodies.current.values()) {
        const el = els.current.get(b.id);
        if (el) el.style.transform = `translate(${b.x - SIZE / 2}px, ${b.y - SIZE / 2}px) rotate(${b.angle}rad)`;
      }
    }

    function tick(t: number) {
      const dt = Math.min((t - last) / 1000 || 1 / 60, 1 / 30);
      last = t;
      for (let i = 0; i < STEPS; i++) step(dt / STEPS);
      draw();
      const moving = [...bodies.current.values()].some((b) => Math.abs(b.vx) > 25 || Math.abs(b.vy) > 25 || b.y < 0);
      calm = moving ? 0 : calm + 1;
      // Se duerme cuando lleva un rato quieto (o a los 8 s, por si algo tiembla sin parar)
      const keepGoing = grab.current || (calm < 30 && t - started < 8000);
      frame.current = keepGoing ? requestAnimationFrame(tick) : 0;
    }

    wake.current = () => {
      started = performance.now();
      calm = 0;
      if (frame.current) return;
      last = started;
      frame.current = requestAnimationFrame(tick);
    };

    return () => cancelAnimationFrame(frame.current);
  }, []);

  // Medimos el bote y lo ajustamos al número de comidas
  useEffect(() => {
    const jar = jarRef.current;
    if (!jar) return;
    const measure = () => {
      const w = jar.clientWidth;
      const h = jarHeight(items.length, w);
      size.current = { w, h };
      setHeight(h);
      wake.current();
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(jar);
    return () => ro?.disconnect();
  }, [items.length]);

  // Comidas nuevas: entran cayendo desde arriba (al abrir la despensa caen todas, una detrás de otra)
  useEffect(() => {
    const map = bodies.current;
    const ids = new Set(items.map((i) => i.id));
    for (const id of [...map.keys()]) if (!ids.has(id)) map.delete(id);
    const { w, h } = size.current;
    // De la más antigua a la más nueva, para que la última quede arriba
    const fresh = [...items].reverse().filter((i) => !map.has(i.id));
    fresh.forEach((item, n) => {
      const settled = reducedMotion.current;
      map.set(item.id, {
        id: item.id,
        x: EDGE + Math.random() * Math.max(1, w - 2 * EDGE),
        y: settled ? h - EDGE - Math.floor(n / Math.max(1, Math.floor(w / (2 * R)))) * 2 * R : -R - n * R * 0.9,
        vx: (Math.random() - 0.5) * 120,
        vy: 0,
        angle: (Math.random() - 0.5) * 0.6,
      });
    });
    wake.current();
  }, [items]);

  function shake() {
    for (const b of bodies.current.values()) {
      b.vx += (Math.random() - 0.5) * 700;
      b.vy -= 500 + Math.random() * 600;
    }
    wake.current();
  }

  function local(e: React.PointerEvent) {
    const rect = jarRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onItemDown(e: React.PointerEvent, id: string) {
    const b = bodies.current.get(id);
    if (!b) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const p = local(e);
    grab.current = { id, dx: b.x - p.x, dy: b.y - p.y, lastX: p.x, lastY: p.y, lastT: performance.now(), moved: false };
    b.vx = b.vy = 0;
    wake.current();
  }

  function onItemMove(e: React.PointerEvent) {
    const g = grab.current;
    const b = g && bodies.current.get(g.id);
    if (!g || !b) return;
    const p = local(e);
    const now = performance.now();
    const dt = Math.max((now - g.lastT) / 1000, 1 / 240);
    const { w, h } = size.current;
    b.x = Math.min(w - EDGE, Math.max(EDGE, p.x + g.dx));
    b.y = Math.min(h - EDGE, p.y + g.dy);
    b.vx = (p.x - g.lastX) / dt;
    b.vy = (p.y - g.lastY) / dt;
    if (Math.abs(p.x - g.lastX) + Math.abs(p.y - g.lastY) > 2) g.moved = true;
    g.lastX = p.x;
    g.lastY = p.y;
    g.lastT = now;
  }

  function onItemUp() {
    const g = grab.current;
    const b = g && bodies.current.get(g.id);
    if (b && g && !g.moved) {
      // Un toque sin arrastrar: la comida da un saltito
      b.vy = -700;
      b.vx = (Math.random() - 0.5) * 300;
    }
    if (b) {
      // Que no salga disparada a la luna
      b.vx = Math.max(-1500, Math.min(1500, b.vx));
      b.vy = Math.max(-1500, Math.min(1500, b.vy));
    }
    grab.current = null;
    wake.current();
  }

  return (
    <div className="jar-wrap">
      <div ref={jarRef} className="jar" style={{ height }} role="list" aria-label="Comidas de la despensa">
        {items.length === 0 && <p className="jar-empty muted small">Todavía está vacío.</p>}
        {items.map((item) => {
          const name = isSpriteName(item.sprite) ? item.sprite : 'pot';
          return (
            <div
              key={item.id}
              ref={(el) => {
                if (el) els.current.set(item.id, el);
                else els.current.delete(item.id);
              }}
              className="jar-item"
              role="listitem"
              title={`${SPRITE_LABEL[name]} · ${item.recipeTitle}`}
              aria-label={`${SPRITE_LABEL[name]}, por cocinar ${item.recipeTitle}`}
              style={{ width: SIZE, height: SIZE, transform: 'translate(-100px, -100px)' }}
              onPointerDown={(e) => onItemDown(e, item.id)}
              onPointerMove={onItemMove}
              onPointerUp={onItemUp}
              onPointerCancel={onItemUp}
            >
              <Sprite name={name} size={SIZE} />
            </div>
          );
        })}
      </div>
      {items.length > 0 && (
        <button className="btn small" onClick={shake}>
          Sacudir el bote
        </button>
      )}
    </div>
  );
}
