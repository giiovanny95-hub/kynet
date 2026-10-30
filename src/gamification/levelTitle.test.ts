import { describe, expect, it } from 'vitest';

import { levelTitle } from './levelTitle';

describe('títulos de nivel (spec-diseno §7)', () => {
  it('bordes de cada tramo', () => {
    const t = (n: number) => levelTitle(n).titleKey;
    expect([1, 2].map(t)).toEqual(['level.title.novice', 'level.title.novice']);
    expect([3, 5].map(t)).toEqual(['level.title.explorer', 'level.title.explorer']);
    expect([6, 9].map(t)).toEqual(['level.title.athlete', 'level.title.athlete']);
    expect([10, 14].map(t)).toEqual(['level.title.elite', 'level.title.elite']);
    expect([15, 40].map(t)).toEqual(['level.title.legend', 'level.title.legend']);
  });

  it('rango de cada tramo', () => {
    expect(levelTitle(2).rankKey).toBe('level.rank.bronze');
    expect(levelTitle(3).rankKey).toBe('level.rank.silver');
    expect(levelTitle(6).rankKey).toBe('level.rank.gold');
    expect(levelTitle(10).rankKey).toBe('level.rank.platinum');
    expect(levelTitle(15).rankKey).toBe('level.rank.diamond');
  });

  it('un nivel inválido (0, negativo o no entero) cae en el primer tramo', () => {
    expect(levelTitle(0).titleKey).toBe('level.title.novice');
    expect(levelTitle(-3).titleKey).toBe('level.title.novice');
    expect(levelTitle(Number.NaN).titleKey).toBe('level.title.novice');
  });
});
