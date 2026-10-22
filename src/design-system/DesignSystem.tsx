import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { StaticDataProvider } from '../data';
import { addDays, startOfWeek, toISODate, weekDays } from '../lib/dates';
import { emptyGroupCounts } from '../lib/planner';
import { EATING_OUT, LEFTOVERS, type MealType, type PlanPosition } from '../lib/types';
import Avatar, { AVATARS } from '../components/Avatar';
import DancingPizza from '../components/DancingPizza';
import { Sprite, SPRITE_NAMES } from '../components/FoodSprite';
import Icon, { ICON_NAMES } from '../components/Icon';
import RecipeCard, { MealTags } from '../components/RecipeCard';
import MealFilter, { type MealFilterValue } from '../views/MealFilter';
import RandomView from '../views/RandomView';
import { DayStrip, Slot, WeekBalance } from '../views/WeekView';
import { SAMPLE_RECIPES } from './sample';
import { applyTheme, isColor, readTokens, type Token } from './tokens';

type Theme = 'sistema' | 'claro' | 'oscuro';

/** Grupos de colores por nombre de token; lo que no está aquí sale en «Otros» */
const COLOR_GROUPS: { title: string; hint: string; names: string[] }[] = [
  { title: 'Superficies', hint: 'Fondo de la app, tarjetas y bordes', names: ['--bg', '--surface', '--surface-2', '--border'] },
  { title: 'Texto', hint: 'Texto principal y secundario', names: ['--text', '--muted'] },
  { title: 'Marca', hint: 'Amarillo mostaza: botones principales, hoy, selección', names: ['--accent', '--accent-hover', '--on-accent', '--today'] },
  { title: 'Tierra', hint: 'Barras del equilibrio de la semana', names: ['--brown', '--olive', '--taupe', '--terracotta', '--sand'] },
  {
    title: 'Pastel',
    hint: 'Etiquetas y atajos: comida (rosa), cena (lila), acompañamiento (arena), Thermomix (verde)',
    names: ['--pink', '--pink-ink', '--lilac', '--lilac-ink', '--beige', '--beige-ink', '--green-soft', '--green-ink'],
  },
  { title: 'Estado', hint: 'Errores y confirmaciones', names: ['--danger', '--ok'] },
];

const SECTIONS = [
  ['colores', 'Colores'],
  ['tipografia', 'Tipografía'],
  ['forma', 'Forma'],
  ['iconos', 'Iconos'],
  ['ilustraciones', 'Ilustraciones'],
  ['botones', 'Botones'],
  ['controles', 'Controles'],
  ['etiquetas', 'Etiquetas'],
  ['recetas', 'Tarjeta de receta'],
  ['semana', 'Semana'],
  ['descubrir', 'Descubrir'],
] as const;

export default function DesignSystem() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [theme, setTheme] = useState<Theme>('sistema');

  useEffect(() => setTokens(readTokens()), []);
  useEffect(() => {
    if (tokens.length) applyTheme(tokens, theme);
  }, [tokens, theme]);

  return (
    <StaticDataProvider recipes={SAMPLE_RECIPES}>
      <div className="ds">
        <header className="ds-top">
          <a className="brand" href="./index.html">
            <img className="brand-icon" src={`${import.meta.env.BASE_URL}favicon.png`} alt="" /> MajoChef
          </a>
          <span className="ds-top-label">Sistema de diseño</span>
          <div className="ds-theme segmented" role="group" aria-label="Tema">
            {(['sistema', 'claro', 'oscuro'] as Theme[]).map((t) => (
              <button key={t} className={t === theme ? 'on' : ''} aria-pressed={t === theme} onClick={() => setTheme(t)}>
                {t === 'sistema' ? 'Auto' : t === 'claro' ? 'Claro' : 'Oscuro'}
              </button>
            ))}
          </div>
        </header>

        <div className="ds-layout">
          <nav className="ds-nav" aria-label="Secciones">
            {SECTIONS.map(([id, label]) => (
              <a key={id} href={`#${id}`}>
                {label}
              </a>
            ))}
          </nav>

          <main className="ds-main">
            <section className="ds-intro">
              <h1>Sistema de diseño</h1>
              <p className="muted">
                Todo lo que ves aquí sale del código de la app: los colores se leen de <code>src/styles.css</code> y cada ejemplo es el
                componente real con recetas de ejemplo. Si cambias algo en el código, esta página cambia con él.
              </p>
            </section>

            <Colors tokens={tokens} />
            <Typography />
            <Shape tokens={tokens} />
            <Icons />
            <Illustrations />
            <Buttons />
            <Controls />
            <Tags />
            <Recipes />
            <Week />
            <Discover />
          </main>
        </div>
      </div>
    </StaticDataProvider>
  );
}

function Section({ id, title, children, intro }: { id: string; title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="ds-section">
      <h2>{title}</h2>
      {intro && <p className="muted ds-section-intro">{intro}</p>}
      {children}
    </section>
  );
}

/** Ejemplo en vivo + de dónde sale en el código */
function Specimen({ name, source, code, children, wide }: { name: string; source: string; code?: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={wide ? 'ds-specimen wide' : 'ds-specimen'}>
      <div className="ds-preview">{children}</div>
      <div className="ds-specimen-info">
        <strong>{name}</strong>
        <code className="ds-source">{source}</code>
        {code && <pre className="ds-code">{code}</pre>}
      </div>
    </div>
  );
}

function CopyName({ name }: { name: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(`var(${name})`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // sin portapapeles: el nombre se puede seleccionar a mano
    }
  }
  return (
    <button className="ds-token-name" onClick={copy} title="Copiar var(…)">
      {copied ? 'Copiado' : name}
    </button>
  );
}

function Colors({ tokens }: { tokens: Token[] }) {
  const colors = tokens.filter((t) => isColor(t.light));
  const grouped = new Set(COLOR_GROUPS.flatMap((g) => g.names));
  const others = colors.filter((t) => !grouped.has(t.name));
  const groups = [...COLOR_GROUPS, ...(others.length ? [{ title: 'Otros', hint: 'Tokens nuevos sin grupo', names: others.map((t) => t.name) }] : [])];

  return (
    <Section id="colores" title="Colores" intro="Pulsa un nombre para copiar var(--token). Cada color tiene su valor en tema claro y oscuro.">
      {groups.map((g) => {
        const items = g.names.map((n) => colors.find((t) => t.name === n)).filter((t): t is Token => !!t);
        if (!items.length) return null;
        return (
          <div key={g.title} className="ds-group">
            <h3>{g.title}</h3>
            <p className="muted small">{g.hint}</p>
            <div className="ds-swatches">
              {items.map((t) => (
                <div key={t.name} className="ds-swatch">
                  <div className="ds-chip-pair" aria-hidden>
                    <span style={{ background: t.light }} title={`Claro: ${t.light}`} />
                    <span style={{ background: t.dark ?? t.light }} title={`Oscuro: ${t.dark ?? t.light}`} />
                  </div>
                  <CopyName name={t.name} />
                  <span className="ds-values">
                    {t.light}
                    {t.dark && <> · {t.dark}</>}
                  </span>
                  <span className="muted ds-uses">{t.uses === 1 ? '1 uso' : `${t.uses} usos`}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </Section>
  );
}

function Typography() {
  const samples: { el: ReactNode; label: string }[] = [
    { el: <h1 style={{ margin: 0 }}>Nuestras recetas</h1>, label: 'h1 · títulos de sección' },
    { el: <h2 style={{ margin: 0 }}>¿Qué cocinamos hoy?</h2>, label: 'h2 · títulos de tarjeta' },
    { el: <h3 style={{ margin: 0 }}>Lentejas con verduras</h3>, label: 'h3 · nombre de receta' },
    { el: <p style={{ margin: 0 }}>Marca lo que tenéis y te decimos qué receta se parece más.</p>, label: 'Texto' },
    { el: <p className="muted small" style={{ margin: 0 }}>Platos principales según las recomendaciones de la AESAN</p>, label: '.muted .small · notas' },
  ];
  return (
    <Section id="tipografia" title="Tipografía" intro={<>Una sola familia, Inconsolata, en <code>--font</code>. La jerarquía sale del tamaño y el peso.</>}>
      <div className="ds-type">
        {samples.map((s) => (
          <TypeRow key={s.label} label={s.label}>
            {s.el}
          </TypeRow>
        ))}
      </div>
    </Section>
  );
}

/** Enseña el tamaño y peso reales (calculados por el navegador) de cada muestra */
function TypeRow({ label, children }: { label: string; children: ReactNode }) {
  const [info, setInfo] = useState('');
  const ref = (el: HTMLDivElement | null) => {
    const target = el?.firstElementChild;
    if (!target || info) return;
    const cs = getComputedStyle(target);
    setInfo(`${Math.round(parseFloat(cs.fontSize))}px · ${cs.fontWeight}`);
  };
  return (
    <div className="ds-type-row">
      <div ref={ref} className="ds-type-sample">
        {children}
      </div>
      <span className="muted small">
        {label}
        {info && <> · {info}</>}
      </span>
    </div>
  );
}

function Shape({ tokens }: { tokens: Token[] }) {
  const radii = tokens.filter((t) => t.name.startsWith('--radius'));
  return (
    <Section id="forma" title="Forma" intro="Esquinas muy redondeadas y sin sombras: las tarjetas se separan del fondo por color.">
      <div className="ds-radii">
        {radii.map((t) => (
          <div key={t.name} className="ds-radius">
            <span style={{ borderRadius: `var(${t.name})` }} />
            <CopyName name={t.name} />
            <span className="ds-values">{t.light}</span>
          </div>
        ))}
        <div className="ds-radius">
          <span style={{ borderRadius: 999 }} />
          <code>999px</code>
          <span className="ds-values">Píldoras: botones, etiquetas, chips</span>
        </div>
      </div>
    </Section>
  );
}

function Icons() {
  return (
    <Section id="iconos" title="Iconos" intro={<>Pixel art de 16×16 dibujado a mano; toman el color del texto. <code>&lt;Icon name="…" /&gt;</code></>}>
      <div className="ds-icons">
        {ICON_NAMES.map((n) => (
          <div key={n} className="ds-icon">
            <Icon name={n} size={32} />
            <code>{n}</code>
          </div>
        ))}
      </div>
      <p className="muted small">src/components/Icon.tsx</p>
    </Section>
  );
}

function Illustrations() {
  return (
    <Section id="ilustraciones" title="Ilustraciones" intro="Comidas cuquis para recetas sin foto, la pizza que baila y los avatares.">
      <div className="ds-grid-2">
        <Specimen name="Comidas cuquis" source="src/components/FoodSprite.tsx" code={'<Sprite name="egg" />\n<FoodSprite recipe={receta} />'}>
          <div className="ds-row">
            {SPRITE_NAMES.map((n) => (
              <div key={n} className="ds-icon">
                <Sprite name={n} size={56} />
                <code>{n}</code>
              </div>
            ))}
          </div>
        </Specimen>
        <Specimen name="Pizza que baila" source="src/components/DancingPizza.tsx" code={'<DancingPizza />\n<DancingPizza dancing={false} />'}>
          <div className="ds-row">
            <DancingPizza size={110} />
            <DancingPizza size={110} dancing={false} />
          </div>
        </Specimen>
        <Specimen name="Avatares" source="src/components/Avatar.tsx" code={'<Avatar value="pizza" />'} wide>
          <div className="ds-row">
            {AVATARS.map((a) => (
              <span key={a.id} className="avatar" title={a.label}>
                <Avatar value={a.id} size={40} />
              </span>
            ))}
          </div>
        </Specimen>
      </div>
    </Section>
  );
}

function Buttons() {
  return (
    <Section id="botones" title="Botones" intro="Siempre en píldora. Amarillo para la acción principal de la pantalla; blanco para el resto.">
      <div className="ds-grid-2">
        <Specimen name="Botón" source="src/styles.css · .btn" code={'<button className="btn primary">\n<button className="btn">\n<button className="btn ghost">\n<button className="btn danger">'}>
          <div className="ds-row">
            <button className="btn primary">+ Nueva receta</button>
            <button className="btn">Editar</button>
            <button className="btn ghost">Vaciar semana</button>
            <button className="btn danger">Borrar</button>
          </div>
        </Specimen>
        <Specimen name="Tamaños" source="src/styles.css · .btn.small / .btn.big" code={'<button className="btn small">\n<button className="btn primary big">'}>
          <div className="ds-row">
            <button className="btn small">
              <Icon name="dice" size={18} /> Rellenar huecos al azar
            </button>
            <button className="btn primary big">¡Dame una!</button>
          </div>
        </Specimen>
        <Specimen name="Botón de icono" source="src/styles.css · .icon-btn" code={'<button className="icon-btn"><Icon name="dice" /></button>'}>
          <div className="ds-row">
            <button className="icon-btn" aria-label="Al azar">
              <Icon name="dice" />
            </button>
            <button className="icon-btn" aria-label="Quitar">
              ×
            </button>
          </div>
        </Specimen>
        <Specimen name="Botón de crear (móvil)" source="src/App.tsx · .tab-add" code={'<button className="tab-add">'}>
          <div className="ds-row">
            <button className="ds-tab-add" aria-label="Nueva receta">
              <Icon name="plus" size={22} />
            </button>
          </div>
        </Specimen>
      </div>
    </Section>
  );
}

function Controls() {
  const [meal, setMeal] = useState<MealFilterValue>('todas');
  const [chip, setChip] = useState(true);
  const [toggle, setToggle] = useState(true);
  return (
    <Section id="controles" title="Controles" intro="Campos sobre fondo blanco o gris claro, siempre muy redondeados.">
      <div className="ds-grid-2">
        <Specimen name="Control segmentado" source="src/views/MealFilter.tsx" code={'<MealFilter value={…} onChange={…} />'}>
          <MealFilter value={meal} onChange={setMeal} />
        </Specimen>
        <Specimen name="Chips" source="src/styles.css · .chip" code={'<button className="chip">\n<button className="chip on">'}>
          <div className="chips">
            <button className={chip ? 'chip on' : 'chip'} onClick={() => setChip((c) => !c)}>
              Calabaza ×
            </button>
            <button className="chip">Arroz</button>
            <button className="chip">Champiñones</button>
          </div>
        </Specimen>
        <Specimen name="Interruptores" source="src/styles.css · .toggle" code={'<button className="toggle on">'}>
          <div className="toggle-group">
            <button className={toggle ? 'toggle on' : 'toggle'} onClick={() => setToggle((t) => !t)}>
              Principal
            </button>
            <button className="toggle">Acompañamiento</button>
            <button className="toggle on tag-thermomix">✓ Sí, la tenemos</button>
          </div>
        </Specimen>
        <Specimen name="Campos" source="src/styles.css · input, select, .field" code={'<label className="field"><span>…</span><input /></label>'}>
          <div className="ds-fields">
            <label className="field" htmlFor="ds-name">
              <span>Nombre</span>
              <input id="ds-name" placeholder="Lentejas de la abuela" />
            </label>
            <label className="field" htmlFor="ds-select">
              <span>Orden</span>
              <select id="ds-select" defaultValue="recientes">
                <option value="recientes">Más recientes</option>
                <option value="nombre">Por nombre</option>
              </select>
            </label>
          </div>
        </Specimen>
      </div>
    </Section>
  );
}

function Tags() {
  const [lentejas, salmon, , crema] = SAMPLE_RECIPES;
  return (
    <Section id="etiquetas" title="Etiquetas" intro="Pastel con texto del mismo tono. Comida en rosa, cena en lila, acompañamiento en arena y Thermomix en verde.">
      <div className="ds-grid-2">
        <Specimen name="Etiquetas de receta" source="src/components/RecipeCard.tsx · <MealTags />" code={'<MealTags recipe={receta} />'}>
          <div className="ds-stack">
            <div className="meta">
              <MealTags recipe={lentejas} />
            </div>
            <div className="meta">
              <MealTags recipe={salmon} />
            </div>
            <div className="meta">
              <MealTags recipe={crema} />
            </div>
          </div>
        </Specimen>
        <Specimen name="Avisos" source="src/styles.css · .best / .today-badge" code={'<span className="best">\n<span className="today-badge">'}>
          <div className="ds-row">
            <span className="best">La más parecida</span>
            <span className="today-badge ds-on-yellow">Hoy</span>
          </div>
        </Specimen>
      </div>
    </Section>
  );
}

function Recipes() {
  return (
    <Section id="recetas" title="Tarjeta de receta" intro="Todas igual de altas. Si no hay foto, sale la comida cuqui de su tipo de alimento.">
      <Specimen name="RecipeCard" source="src/components/RecipeCard.tsx" code={'<RecipeCard recipe={receta} onClick={…} />'} wide>
        <div className="grid">
          {SAMPLE_RECIPES.slice(0, 4).map((r) => (
            <RecipeCard key={r.id} recipe={r} onClick={() => {}} />
          ))}
        </div>
      </Specimen>
    </Section>
  );
}

function Week() {
  const monday = useMemo(() => startOfWeek(new Date()), []);
  const days = useMemo(() => weekDays(monday), [monday]);
  const today = toISODate(new Date());
  const [values, setValues] = useState<Record<string, [string, string]>>({
    comida: ['lentejas', 'crema'],
    cena: [LEFTOVERS, ''],
  });
  const counts = { ...emptyGroupCounts(), legumbres: 2, pescado: 3, carne: 4, verdura: 1, cereales: 2 };

  function change(slot: MealType, position: PlanPosition, value: string | null) {
    setValues((v) => {
      const next: [string, string] = [...v[slot]] as [string, string];
      next[position - 1] = value ?? '';
      return { ...v, [slot]: next };
    });
  }

  return (
    <Section id="semana" title="Semana" intro="Piezas del menú semanal, con datos de ejemplo. Puedes tocarlas: no se guarda nada.">
      <div className="ds-grid-2">
        <Specimen name="Fila de días" source="src/views/WeekView.tsx · <DayStrip />" code={'<DayStrip days={…} today={…} hasPlan={…} />'} wide>
          <DayStrip days={days} today={today} hasPlan={(d) => d <= toISODate(addDays(monday, 3))} />
        </Specimen>
        <Specimen name="Tarjeta de día (hoy)" source="src/views/WeekView.tsx · .day + <Slot />" code={'<div className="day today">\n  <Slot … />'}>
          <div className="day today ds-day">
            <div className="day-head">
              <strong>Hoy</strong>
              <span className="today-badge">Hoy</span>
            </div>
            {(['comida', 'cena'] as MealType[]).map((slot) => (
              <Slot
                key={slot}
                slot={slot}
                recipes={SAMPLE_RECIPES}
                values={values[slot]}
                onChange={(p, v) => change(slot, p, v)}
                onRandom={() => {}}
                onOpen={() => {}}
              />
            ))}
          </div>
        </Specimen>
        <Specimen name="Tarjeta de día" source="src/views/WeekView.tsx · .day" code={'<div className="day">'}>
          <div className="day ds-day">
            <div className="day-head">
              <strong>Viernes</strong>
              <span className="muted day-date">24 oct</span>
            </div>
            <Slot slot="comida" recipes={SAMPLE_RECIPES} values={['salmon', '']} onChange={() => {}} onRandom={() => {}} onOpen={() => {}} />
            <Slot slot="cena" recipes={SAMPLE_RECIPES} values={[EATING_OUT, '']} onChange={() => {}} onRandom={() => {}} onOpen={() => {}} />
          </div>
        </Specimen>
        <Specimen name="Equilibrio de la semana" source="src/views/WeekView.tsx · <WeekBalance />" code={'<WeekBalance counts={…} repeated={…} />'} wide>
          <WeekBalance counts={counts} repeated={1} />
        </Specimen>
      </div>
    </Section>
  );
}

function Discover() {
  return (
    <Section id="descubrir" title="Descubrir" intro="La tarjeta de «¿Qué cocinamos hoy?» real, con recetas de ejemplo. «Para hoy» aquí no guarda nada.">
      <Specimen name="¿Qué cocinamos hoy?" source="src/views/RandomView.tsx" code={'<RandomView />'} wide>
        <RandomView demo />
      </Specimen>
    </Section>
  );
}
