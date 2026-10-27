import { describe, expect, it } from 'vitest';
import { codeFromHash, inviteLink, normalizeCode } from './household';

describe('espacios', () => {
  it('el código se puede escribir con espacios, guiones o en minúsculas', () => {
    expect(normalizeCode(' ab3-k9 x ')).toBe('AB3K9X');
  });

  it('el enlace de invitación lleva el código y se puede leer de vuelta', () => {
    const link = inviteLink('https://martalu-ui.github.io/recetas/', 'AB3K9X');
    expect(link).toBe('https://martalu-ui.github.io/recetas/#/unirse/AB3K9X');
    expect(codeFromHash('#/unirse/ab3k9x')).toBe('AB3K9X');
    expect(codeFromHash('#/recetas')).toBeNull();
  });
});
