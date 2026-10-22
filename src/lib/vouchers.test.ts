import { describe, expect, it } from 'vitest';
import { oweText, VOUCHERS } from './vouchers';

describe('vales', () => {
  it('el aviso dice qué le debes y a quién', () => {
    expect(oweText('masaje', 'Vale por un masaje', 'marta')).toBe('Le debes un masaje a marta');
    expect(oweText('raro', 'Vale por un paseo', null)).toBe('Le debes un paseo a tu pareja');
  });

  it('el catálogo va de más barato a más caro y sin ids repetidos', () => {
    const costs = VOUCHERS.map((v) => v.cost);
    expect([...costs].sort((a, b) => a - b)).toEqual(costs);
    expect(new Set(VOUCHERS.map((v) => v.id)).size).toBe(VOUCHERS.length);
  });
});
