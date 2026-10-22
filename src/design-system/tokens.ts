import stylesSource from '../styles.css?raw';

export type Tier = 'primitive' | 'semantic';

export interface Token {
  name: string;
  tier: Tier;
  /** Valor tal cual está escrito en styles.css (p. ej. `var(--mustard-400)` o `#fbb829`) */
  light: string;
  dark: string | null;
  /** Primitivo al que apunta cada tema, si es un semántico */
  lightRef: string | null;
  darkRef: string | null;
  /** Valor final, con las referencias resueltas */
  lightValue: string;
  darkValue: string;
  /** Cuántas veces aparece var(--nombre) en styles.css */
  uses: number;
}

const refOf = (value: string | null) => value?.match(/^var\((--[a-z0-9-]+)\)$/)?.[1] ?? null;

/**
 * Lee los tokens directamente de las hojas de estilo cargadas (styles.css):
 * los de `:root` son el tema claro y los de `:root` dentro de `prefers-color-scheme: dark`, el oscuro.
 * Un token es semántico si su valor apunta a otro token con var(); si no, es un primitivo.
 * Así el sistema de diseño siempre enseña lo que hay en el código.
 */
export function readTokens(): Token[] {
  const light = new Map<string, string>();
  const dark = new Map<string, string>();

  function walk(rules: CSSRuleList, inDark: boolean) {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule && rule.selectorText === ':root') {
        for (let i = 0; i < rule.style.length; i++) {
          const prop = rule.style[i];
          if (prop.startsWith('--')) (inDark ? dark : light).set(prop, rule.style.getPropertyValue(prop).trim());
        }
      } else if (rule instanceof CSSMediaRule) {
        walk(rule.cssRules, inDark || /prefers-color-scheme:\s*dark/.test(rule.conditionText));
      }
    }
  }

  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules; // las hojas de otros dominios (Google Fonts) no se pueden leer
    } catch {
      continue;
    }
    walk(rules, false);
  }

  function resolve(value: string, theme: Map<string, string>, depth = 0): string {
    const ref = refOf(value);
    if (!ref || depth > 5) return value;
    return resolve(theme.get(ref) ?? light.get(ref) ?? value, theme, depth + 1);
  }

  return [...light.entries()].map(([name, value]) => {
    const darkRaw = dark.get(name) ?? null;
    return {
      name,
      tier: refOf(value) ? 'semantic' : 'primitive',
      light: value,
      dark: darkRaw,
      lightRef: refOf(value),
      darkRef: refOf(darkRaw),
      lightValue: resolve(value, light),
      darkValue: resolve(darkRaw ?? value, dark),
      uses: stylesSource.split(`var(${name})`).length - 1,
    };
  });
}

export function isColor(value: string): boolean {
  return /^(#|rgb|hsl)/i.test(value);
}

/** Cambia el tema del sistema de diseño copiando los valores de un tema sobre :root */
export function applyTheme(tokens: Token[], theme: 'sistema' | 'claro' | 'oscuro') {
  const root = document.documentElement;
  for (const t of tokens) {
    if (theme === 'sistema' || t.tier === 'primitive') root.style.removeProperty(t.name);
    else root.style.setProperty(t.name, theme === 'oscuro' ? t.dark ?? t.light : t.light);
  }
  if (theme === 'sistema') root.style.removeProperty('color-scheme');
  else root.style.setProperty('color-scheme', theme === 'oscuro' ? 'dark' : 'light');
}
