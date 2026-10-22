import { describe, expect, it } from 'vitest';
import { byCost, DEFAULT_VOUCHERS, oweText, voucherTitle } from './vouchers';

describe('vales', () => {
  it('el título y el aviso salen de lo que se regala', () => {
    expect(voucherTitle(' un masaje ')).toBe('Vale por un masaje');
    expect(oweText('Vale por un masaje', 'marta')).toBe('Le debes un masaje a marta');
    expect(oweText('Vale por un paseo', null)).toBe('Le debes un paseo a tu pareja');
  });

  it('el catálogo inicial va de más barato a más caro y sin ids repetidos', () => {
    expect([...DEFAULT_VOUCHERS].sort(byCost)).toEqual(DEFAULT_VOUCHERS);
    expect(new Set(DEFAULT_VOUCHERS.map((v) => v.id)).size).toBe(DEFAULT_VOUCHERS.length);
  });
});
