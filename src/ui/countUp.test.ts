import { describe, expect, it } from 'vitest';

import { countUpValue } from './countUp';

const steps = (from: number, to: number) => Array.from({ length: 61 }, (_, i) => countUpValue(from, to, i / 60));

describe('AnimatedNumber: interpolación (diseño E1.2)', () => {
  it('enteros, exacta en los extremos y monótona al subir', () => {
    const s = steps(0, 115);
    expect(s[0]).toBe(0);
    expect(s.at(-1)).toBe(115);
    for (const v of s) expect(Number.isInteger(v)).toBe(true);
    for (let i = 1; i < s.length; i++) expect(s[i]!).toBeGreaterThanOrEqual(s[i - 1]!);
  });

  it('monótona al bajar y sin pasarse del destino', () => {
    const s = steps(40, 12);
    expect(s[0]).toBe(40);
    expect(s.at(-1)).toBe(12);
    for (let i = 1; i < s.length; i++) expect(s[i]!).toBeLessThanOrEqual(s[i - 1]!);
    expect(Math.min(...s)).toBe(12);
  });

  it('el progreso fuera de rango se recorta', () => {
    expect(countUpValue(3, 9, -1)).toBe(3);
    expect(countUpValue(3, 9, 2)).toBe(9);
  });
});
