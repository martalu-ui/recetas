/** Fecha local en formato YYYY-MM-DD (sin pasar por UTC para no cambiar de día). */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

/** Lunes de la semana de `d`, a las 00:00. */
export function startOfWeek(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const offset = (r.getDay() + 6) % 7; // lunes = 0
  return addDays(r, -offset);
}

export function weekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function weekdayName(d: Date): string {
  const name = d.toLocaleDateString('es-ES', { weekday: 'long' });
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function shortDate(d: Date): string {
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export function formatMinutes(min: number | null): string {
  if (min == null) return '';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
