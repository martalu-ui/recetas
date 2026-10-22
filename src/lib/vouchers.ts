/** Catálogo de vales que se compran con las comidas de la despensa */
export interface VoucherKind {
  id: string;
  /** Lo que pone en el vale */
  title: string;
  /** Para el aviso: «Le debes …» */
  owe: string;
  /** Comidas que cuesta */
  cost: number;
}

export const VOUCHERS: VoucherKind[] = [
  { id: 'peli', title: 'Vale por elegir la peli', owe: 'dejarle elegir la peli', cost: 3 },
  { id: 'friego', title: 'Vale por un «hoy friego yo»', owe: 'fregar hoy', cost: 4 },
  { id: 'siesta', title: 'Vale por una siesta sin interrupciones', owe: 'una siesta sin interrupciones', cost: 5 },
  { id: 'masaje', title: 'Vale por un masaje', owe: 'un masaje', cost: 6 },
  { id: 'desayuno', title: 'Vale por un desayuno en la cama', owe: 'un desayuno en la cama', cost: 8 },
  { id: 'cine', title: 'Vale por un día de cine', owe: 'un día de cine', cost: 10 },
  { id: 'cena', title: 'Vale por una cena fuera', owe: 'una cena fuera', cost: 15 },
];

export function voucherKind(id: string): VoucherKind | undefined {
  return VOUCHERS.find((v) => v.id === id);
}

/** «Le debes un masaje a Marta» */
export function oweText(kind: string, title: string, author: string | null): string {
  const what = voucherKind(kind)?.owe ?? title.replace(/^Vale por /, '');
  return `Le debes ${what} a ${author ?? 'tu pareja'}`;
}

export interface Voucher {
  id: string;
  /** Quien lo ha canjeado (y a quien se lo deben) */
  userId: string | null;
  author: string | null;
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
