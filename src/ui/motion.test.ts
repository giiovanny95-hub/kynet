import { describe, expect, it } from 'vitest';

import { DURATION, motionTokens, SPRING, stagger } from './motion';

describe('sistema de movimiento (spec-diseno §4)', () => {
  it('escalonado de 40 ms hasta el sexto elemento; del séptimo en adelante sin retraso', () => {
    expect([0, 1, 5].map((i) => stagger(i))).toEqual([0, 40, 200]);
    expect(stagger(6)).toBe(0);
    expect(stagger(20)).toBe(0);
  });

  it('valores de la spec', () => {
    expect(DURATION).toEqual({ fast: 120, base: 220, emphasis: 360, celebrate: 700 });
    expect(SPRING.snappy).toEqual({ damping: 20, stiffness: 300 });
    expect(SPRING.gentle).toEqual({ damping: 18, stiffness: 160 });
    expect(SPRING.bouncy).toEqual({ damping: 10, stiffness: 180 });
  });

  it('con "reducir movimiento" todo dura 0, no hay escalonado ni bucles', () => {
    const m = motionTokens(true);
    expect(Object.values(m.duration).every((d) => d === 0)).toBe(true);
    expect(m.stagger(3)).toBe(0);
    expect(m.loops).toBe(false);
    expect(m.reduced).toBe(true);
    const n = motionTokens(false);
    expect(n.duration.base).toBe(220);
    expect(n.stagger(2)).toBe(80);
    expect(n.loops).toBe(true);
  });
});
