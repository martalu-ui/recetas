import stylesSource from '../styles.css?raw';

export interface Token {
  name: string;
  light: string;
  dark: string | null;
  /** Cuántas veces aparece var(--nombre) en styles.css */
  uses: number;
}

/**
 * Lee los tokens directamente de las hojas de estilo cargadas (styles.css):
 * los de `:root` son el tema claro y los de `:root` dentro de `prefers-color-scheme: dark`, el oscuro.
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

  return [...light.entries()].map(([name, value]) => ({
    name,
    light: value,
    dark: dark.get(name) ?? null,
    uses: stylesSource.split(`var(${name})`).length - 1,
  }));
}

export function isColor(value: string): boolean {
  return /^(#|rgb|hsl)/i.test(value);
}

/** Cambia el tema del sistema de diseño copiando los valores de un tema sobre :root */
export function applyTheme(tokens: Token[], theme: 'sistema' | 'claro' | 'oscuro') {
  const root = document.documentElement;
  for (const t of tokens) {
    if (theme === 'sistema') root.style.removeProperty(t.name);
    else root.style.setProperty(t.name, theme === 'oscuro' ? t.dark ?? t.light : t.light);
  }
  if (theme === 'sistema') root.style.removeProperty('color-scheme');
  else root.style.setProperty('color-scheme', theme === 'oscuro' ? 'dark' : 'light');
}
