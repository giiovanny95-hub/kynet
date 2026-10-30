import { describe, expect, it } from 'vitest';

import { fonts, radius, space, tokens, type } from './tokens';

describe('tokens de diseño (spec-diseno §3)', () => {
  it('la escala tipográfica usa solo familias cargadas y nunca fontWeight', () => {
    const families = new Set<string>(Object.values(fonts));
    for (const [name, style] of Object.entries(type)) {
      expect(families.has(style.fontFamily), name).toBe(true);
      expect('fontWeight' in style, name).toBe(false);
      expect(style.lineHeight, name).toBeGreaterThan(style.fontSize);
    }
  });

  it('escala de tema.md: hero 56/64, body 16/24 y label en mayúsculas espaciadas', () => {
    expect(type.displayHero).toMatchObject({ fontSize: 56, lineHeight: 64 });
    expect(type.body).toMatchObject({ fontSize: 16, lineHeight: 24 });
    expect(type.labelCaps).toMatchObject({ fontSize: 12, lineHeight: 16, letterSpacing: 0.72 });
  });

  it('espaciado en múltiplos de 4 y radios de la spec', () => {
    for (const v of Object.values(space)) expect(v % 4).toBe(0);
    expect(radius).toEqual({ chip: 6, control: 12, card: 16, pill: 9999 });
  });

  it('colores nuevos derivados del teal, sin colores fuera de la paleta', () => {
    expect(tokens.tealSoft.slice(0, 7).toUpperCase()).toBe(tokens.accent);
    expect(tokens.teal45.slice(0, 7).toUpperCase()).toBe(tokens.accent);
    expect(tokens.hud).toBe('rgba(30,44,58,0.85)');
  });
});
