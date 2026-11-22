/** Espacio: lo que comparte una pareja (recetas, menú, despensa, vales). Cada persona está en uno. */
export interface Household {
  id: string;
  name: string;
  /** Código para que la pareja se una (6 caracteres, sin letras que se confundan) */
  inviteCode: string;
  members: { name: string; me: boolean }[];
  /** El marcador de «¿Quién cocina más?» cuenta desde aquí (null = desde siempre) */
  scoresSince: string | null;
  settings: HouseholdSettings;
}

/** Ajustes del espacio, los mismos para los dos */
export interface HouseholdSettings {
  /** Si tenéis Thermomix: sin ella no sale en recetas, filtros ni formulario */
  thermomix: boolean;
}

export const DEFAULT_SETTINGS: HouseholdSettings = { thermomix: true };

/** Lo guardado puede venir a medias o de una versión anterior: completa con lo de por defecto */
export function readSettings(raw: unknown): HouseholdSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<HouseholdSettings>;
  return { thermomix: typeof r.thermomix === 'boolean' ? r.thermomix : DEFAULT_SETTINGS.thermomix };
}

export type HouseholdPatch = Partial<Pick<Household, 'scoresSince' | 'settings'>>;

/** Lo que se escribe a mano: sin espacios ni guiones y en mayúsculas */
export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Enlace de invitación: …/recetas/#/unirse/ABC123 */
export function inviteLink(baseUrl: string, code: string): string {
  return `${baseUrl}#/unirse/${code}`;
}

/** El código de un enlace de invitación, si la dirección es una */
export function codeFromHash(hash: string): string | null {
  const m = hash.match(/^#\/unirse\/([A-Za-z0-9-]+)$/);
  return m ? normalizeCode(m[1]) : null;
}

/** Un enlace de invitación sobrevive a crear la cuenta y confirmar el email: se guarda aquí hasta usarlo */
const LS_PENDING = 'majochef.unirse';

export function savePendingCode(code: string) {
  try {
    localStorage.setItem(LS_PENDING, code);
  } catch {
    // sin almacenamiento habrá que escribir el código a mano
  }
}

export function takePendingCode(): string | null {
  try {
    return localStorage.getItem(LS_PENDING);
  } catch {
    return null;
  }
}

export function clearPendingCode() {
  try {
    localStorage.removeItem(LS_PENDING);
  } catch {
    // nada que borrar
  }
}
