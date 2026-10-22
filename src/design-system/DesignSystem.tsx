import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { StaticDataProvider } from '../data';
import { addDays, startOfWeek, toISODate, weekDays } from '../lib/dates';
import { emptyGroupCounts } from '../lib/planner';
import { EATING_OUT, LEFTOVERS, type MealType, type PlanPosition } from '../lib/types';
import Avatar, { AVATARS } from '../components/Avatar';
import Chef from '../components/Chef';
import { Sprite, SPRITE_LABEL, SPRITE_NAMES } from '../components/FoodSprite';
import Icon, { ICON_NAMES } from '../components/Icon';
import PantryJar from '../components/PantryJar';
import RecipeCard, { MealTags } from '../components/RecipeCard';
import MealFilter, { type MealFilterValue } from '../views/MealFilter';
import { Greeting } from '../views/DiscoverView';
import RandomView from '../views/RandomView';
import { DayStrip, Slot, WeekBalance } from '../views/WeekView';
import { SAMPLE_RECIPES } from './sample';
import { applyTheme, isColor, readTokens, type Token } from './tokens';

type Theme = 'sistema' | 'claro' | 'oscuro';

/** Color groups by token name; anything not listed here goes under «Other» */
const COLOR_GROUPS: { title: string; hint: string; names: string[] }[] = [
  { title: 'Surfaces', hint: 'App background, cards and borders', names: ['--bg', '--surface', '--surface-2', '--border'] },
  { title: 'Text', hint: 'Primary and secondary text', names: ['--text', '--muted'] },
  { title: 'Brand', hint: 'Mustard yellow: primary buttons, today, selection', names: ['--accent', '--accent-hover', '--on-accent', '--today'] },
  { title: 'Earth', hint: 'Bars in the weekly balance', names: ['--brown', '--olive', '--taupe', '--terracotta', '--sand'] },
  {
    title: 'Pastel',
    hint: 'Tags and shortcuts: lunch (pink), dinner (lilac), side dish (sand), Thermomix (green)',
    names: ['--pink', '--pink-ink', '--lilac', '--lilac-ink', '--beige', '--beige-ink', '--green-soft', '--green-ink'],
  },
  { title: 'Status', hint: 'Errors and confirmations', names: ['--danger', '--ok'] },
];

const SECTIONS = [
  ['colors', 'Colors'],
  ['typography', 'Typography'],
  ['shape', 'Shape'],
  ['icons', 'Icons'],
  ['illustrations', 'Illustrations'],
  ['buttons', 'Buttons'],
  ['controls', 'Controls'],
  ['tags', 'Tags'],
  ['recipe-card', 'Recipe card'],
  ['week', 'Week'],
  ['discover', 'Discover'],
  ['pantry', 'Pantry'],
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
          <span className="ds-top-label">Design system</span>
          <div className="ds-theme segmented" role="group" aria-label="Theme">
            {(['sistema', 'claro', 'oscuro'] as Theme[]).map((t) => (
              <button key={t} className={t === theme ? 'on' : ''} aria-pressed={t === theme} onClick={() => setTheme(t)}>
                {t === 'sistema' ? 'Auto' : t === 'claro' ? 'Light' : 'Dark'}
              </button>
            ))}
          </div>
        </header>

        <div className="ds-layout">
          <nav className="ds-nav" aria-label="Sections">
            {SECTIONS.map(([id, label]) => (
              <a key={id} href={`#${id}`}>
                {label}
              </a>
            ))}
          </nav>

          <main className="ds-main">
            <section className="ds-intro">
              <h1>Design system</h1>
              <p className="muted">
                Everything here comes from the app's code: colors are read from <code>src/styles.css</code> and every example is the
                real component, filled with sample recipes. Change something in the code and this page changes with it.
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
            <Pantry />
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

/** Live example + where it lives in the code */
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
      // no clipboard: the name can still be selected by hand
    }
  }
  return (
    <button className="ds-token-name" onClick={copy} title="Copy var(…)">
      {copied ? 'Copied' : name}
    </button>
  );
}

function Colors({ tokens }: { tokens: Token[] }) {
  const colors = tokens.filter((t) => isColor(t.light));
  const grouped = new Set(COLOR_GROUPS.flatMap((g) => g.names));
  const others = colors.filter((t) => !grouped.has(t.name));
  const groups = [...COLOR_GROUPS, ...(others.length ? [{ title: 'Other', hint: 'New tokens without a group', names: others.map((t) => t.name) }] : [])];

  return (
    <Section id="colors" title="Colors" intro="Click a name to copy var(--token). Each color shows its light and dark theme value.">
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
                    <span style={{ background: t.light }} title={`Light: ${t.light}`} />
                    <span style={{ background: t.dark ?? t.light }} title={`Dark: ${t.dark ?? t.light}`} />
                  </div>
                  <CopyName name={t.name} />
                  <span className="ds-values">
                    {t.light}
                    {t.dark && <> · {t.dark}</>}
                  </span>
                  <span className="muted ds-uses">{t.uses === 1 ? '1 use' : `${t.uses} uses`}</span>
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
    { el: <h1 style={{ margin: 0 }}>Nuestras recetas</h1>, label: 'h1 · section titles' },
    { el: <h2 style={{ margin: 0 }}>¿Qué cocinamos hoy?</h2>, label: 'h2 · card titles' },
    { el: <h3 style={{ margin: 0 }}>Lentejas con verduras</h3>, label: 'h3 · recipe name' },
    { el: <p style={{ margin: 0 }}>Marca lo que tenéis y te decimos qué receta se parece más.</p>, label: 'Body' },
    { el: <p className="muted small" style={{ margin: 0 }}>Platos principales según las recomendaciones de la AESAN</p>, label: '.muted .small · notes' },
  ];
  return (
    <Section id="typography" title="Typography" intro={<>A single family, Inconsolata, in <code>--font</code>. Hierarchy comes from size and weight.</>}>
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

/** Shows the real size and weight (computed by the browser) of each sample */
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
    <Section id="shape" title="Shape" intro="Very round corners and no shadows: cards stand out from the background by color.">
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
          <span className="ds-values">Bars in the weekly balance</span>
        </div>
      </div>
    </Section>
  );
}

function Icons() {
  return (
    <Section id="icons" title="Icons" intro={<>Hand-drawn 16×16 pixel art; they take the text color. <code>&lt;Icon name="…" /&gt;</code></>}>
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
    <Section id="illustrations" title="Illustrations" intro="Cute food for recipes without a photo, the cooking chef and the avatars.">
      <div className="ds-grid-2">
        <Specimen name="Food sprites" source="src/components/FoodSprite.tsx" code={'<Sprite name="egg" />\n<FoodSprite recipe={recipe} />'}>
          <div className="ds-row">
            {SPRITE_NAMES.map((n) => (
              <div key={n} className="ds-icon">
                <Sprite name={n} size={56} />
                <code>{n}</code>
              </div>
            ))}
          </div>
        </Specimen>
        <Specimen name="Cooking chef" source="src/components/Chef.tsx" code={'<Chef />\n<Chef cooking={false} />'}>
          <div className="ds-row">
            <Chef size={110} />
            <Chef size={110} cooking={false} />
          </div>
        </Specimen>
        <Specimen name="Avatars" source="src/components/Avatar.tsx" code={'<Avatar value="pizza" />'} wide>
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
    <Section id="buttons" title="Buttons" intro={<>Slightly rounded corners with <code>--radius-btn</code>. Yellow for the main action on the screen; white for everything else.</>}>
      <div className="ds-grid-2">
        <Specimen name="Button" source="src/styles.css · .btn" code={'<button className="btn primary">\n<button className="btn">\n<button className="btn ghost">\n<button className="btn danger">'}>
          <div className="ds-row">
            <button className="btn primary">+ Nueva receta</button>
            <button className="btn">Editar</button>
            <button className="btn ghost">Vaciar semana</button>
            <button className="btn danger">Borrar</button>
          </div>
        </Specimen>
        <Specimen name="Sizes" source="src/styles.css · .btn.small / .btn.big" code={'<button className="btn small">\n<button className="btn primary big">'}>
          <div className="ds-row">
            <button className="btn small">
              <Icon name="dice" size={18} /> Rellenar huecos al azar
            </button>
            <button className="btn primary big">¡Dame una!</button>
          </div>
        </Specimen>
        <Specimen name="Icon button" source="src/styles.css · .icon-btn" code={'<button className="icon-btn"><Icon name="dice" /></button>'}>
          <div className="ds-row">
            <button className="icon-btn" aria-label="Al azar">
              <Icon name="dice" />
            </button>
            <button className="icon-btn" aria-label="Quitar">
              ×
            </button>
          </div>
        </Specimen>
        <Specimen name="Create button (mobile)" source="src/App.tsx · .tab-add" code={'<button className="tab-add">'}>
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
    <Section id="controls" title="Controls" intro="Fields on white or light grey, always very rounded.">
      <div className="ds-grid-2">
        <Specimen name="Segmented control" source="src/views/MealFilter.tsx" code={'<MealFilter value={…} onChange={…} />'}>
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
        <Specimen name="Toggles" source="src/styles.css · .toggle" code={'<button className="toggle on">'}>
          <div className="toggle-group">
            <button className={toggle ? 'toggle on' : 'toggle'} onClick={() => setToggle((t) => !t)}>
              Principal
            </button>
            <button className="toggle">Acompañamiento</button>
            <button className="toggle on tag-thermomix">✓ Sí, la tenemos</button>
          </div>
        </Specimen>
        <Specimen name="Fields" source="src/styles.css · input, select, .field" code={'<label className="field"><span>…</span><input /></label>'}>
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
    <Section id="tags" title="Tags" intro={<>Squarish corners with <code>--radius-tag</code>. Pastel with text in the same hue: lunch in pink, dinner in lilac, side dish in sand and Thermomix in green.</>}>
      <div className="ds-grid-2">
        <Specimen name="Recipe tags" source="src/components/RecipeCard.tsx · <MealTags />" code={'<MealTags recipe={recipe} />'}>
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
        <Specimen name="Badges" source="src/styles.css · .best / .today-badge" code={'<span className="best">\n<span className="today-badge">'}>
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
    <Section id="recipe-card" title="Recipe card" intro="All the same height. Without a photo, it shows the food sprite for its food group.">
      <Specimen name="RecipeCard" source="src/components/RecipeCard.tsx" code={'<RecipeCard recipe={recipe} onClick={…} />'} wide>
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
    <Section id="week" title="Week" intro="Pieces of the weekly menu, with sample data. Go ahead and play with them: nothing is saved.">
      <div className="ds-grid-2">
        <Specimen name="Day strip" source="src/views/WeekView.tsx · <DayStrip />" code={'<DayStrip days={…} today={…} hasPlan={…} />'} wide>
          <DayStrip days={days} today={today} hasPlan={(d) => d <= toISODate(addDays(monday, 3))} />
        </Specimen>
        <Specimen name="Day card (today)" source="src/views/WeekView.tsx · .day + <Slot />" code={'<div className="day today">\n  <Slot … />'}>
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
        <Specimen name="Day card" source="src/views/WeekView.tsx · .day" code={'<div className="day">'}>
          <div className="day ds-day">
            <div className="day-head">
              <strong>Viernes</strong>
              <span className="muted day-date">24 oct</span>
            </div>
            <Slot slot="comida" recipes={SAMPLE_RECIPES} values={['salmon', '']} onChange={() => {}} onRandom={() => {}} onOpen={() => {}} />
            <Slot slot="cena" recipes={SAMPLE_RECIPES} values={[EATING_OUT, '']} onChange={() => {}} onRandom={() => {}} onOpen={() => {}} />
          </div>
        </Specimen>
        <Specimen name="Weekly balance" source="src/views/WeekView.tsx · <WeekBalance />" code={'<WeekBalance counts={…} repeated={…} />'} wide>
          <WeekBalance counts={counts} repeated={1} />
        </Specimen>
      </div>
    </Section>
  );
}

function Discover() {
  return (
    <Section id="discover" title="Discover" intro="The «Hi chef!» greeting and the real random recipe card, with sample recipes. «Para hoy» doesn't save anything here.">
      <div className="ds-grid-2">
        <Specimen name="Greeting" source="src/views/DiscoverView.tsx · <Greeting />" code={'<Greeting avatar="pizza" />'}>
          <Greeting avatar="pizza" />
        </Specimen>
        <Specimen name="Greeting (no avatar)" source="src/views/DiscoverView.tsx · <Greeting />" code={'<Greeting avatar={null} />'}>
          <Greeting avatar={null} />
        </Specimen>
        <Specimen name="Random recipe" source="src/views/RandomView.tsx" code={'<RandomView />'} wide>
          <RandomView demo />
        </Specimen>
      </div>
    </Section>
  );
}

function Pantry() {
  const items = useMemo(
    () =>
      SPRITE_NAMES.flatMap((sprite, i) =>
        [0, 1].map((n) => ({
          id: `${sprite}-${n}`,
          recipeId: null,
          recipeTitle: SAMPLE_RECIPES[(i + n) % SAMPLE_RECIPES.length].title,
          sprite,
          day: null,
          slot: null,
          createdAt: '',
        })),
      ),
    [],
  );
  return (
    <Section
      id="pantry"
      title="Pantry"
      intro={
        <>
          Every cooked recipe earns a food sprite ({SPRITE_NAMES.map((n) => SPRITE_LABEL[n]).join(', ')}). They fall into the jar with
          gravity: drag one and throw it, tap it to make it hop, or shake the jar.
        </>
      }
    >
      <Specimen name="Pantry jar" source="src/components/PantryJar.tsx" code={'<PantryJar items={pantry.items} />'} wide>
        <PantryJar items={items} />
      </Specimen>
    </Section>
  );
}
