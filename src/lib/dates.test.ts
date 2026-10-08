import { describe, expect, it } from 'vitest';
import { formatMinutes, startOfWeek, toISODate, weekDays } from './dates';

describe('fechas', () => {
  it('la semana empieza en lunes', () => {
    expect(toISODate(startOfWeek(new Date(2026, 9, 8)))).toBe('2026-10-05'); // jueves → lunes
    expect(toISODate(startOfWeek(new Date(2026, 9, 11)))).toBe('2026-10-05'); // domingo → lunes anterior
    expect(weekDays(new Date(2026, 9, 5)).map(toISODate).at(-1)).toBe('2026-10-11');
  });

  it('formatea minutos', () => {
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(90)).toBe('1 h 30 min');
    expect(formatMinutes(120)).toBe('2 h');
  });
});
