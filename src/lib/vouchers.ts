/** Vale del catálogo (lo editáis los dos): qué es y cuántas comidas cuesta */
export interface VoucherKind {
  id: string;
  /** Lo que se regala: «un masaje». El vale dice «Vale por un masaje» */
  what: string;
  cost: number;
}

/** Catálogo inicial (en Supabase se crea igual en la tabla voucher_kinds) */
export const DEFAULT_VOUCHERS: VoucherKind[] = [
  { id: 'peli', what: 'elegir la peli', cost: 3 },
  { id: 'masaje', what: 'un masaje', cost: 6 },
  { id: 'desayuno', what: 'un desayuno en la cama', cost: 8 },
  { id: 'cine', what: 'un día de cine', cost: 10 },
  { id: 'cena', what: 'una cena fuera', cost: 15 },
];

export const voucherTitle = (what: string) => `Vale por ${what.trim()}`;

/** «Le debes un masaje a Marta» */
export function oweText(title: string, author: string | null): string {
  return `Le debes ${title.replace(/^Vale por /, '')} a ${author ?? 'tu pareja'}`;
}

/** Ordena el catálogo de más barato a más caro */
export const byCost = (a: VoucherKind, b: VoucherKind) => a.cost - b.cost || a.what.localeCompare(b.what, 'es');

export interface Voucher {
  id: string;
  /** Quien lo ha canjeado (y a quien se lo deben) */
  userId: string | null;
  author: string | null;
  /** Id del vale del catálogo cuando se canjeó (puede haberse editado o borrado después) */
  kind: string;
  title: string;
  cost: number;
  status: 'pendiente' | 'cumplido';
  seenAt: string | null;
  doneAt: string | null;
  createdAt: string;
  /** Lo he canjeado yo (me lo deben) o mi pareja (lo debo yo) */
  mine: boolean;
}
