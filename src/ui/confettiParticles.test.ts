import { describe, expect, it } from 'vitest';

import { CONFETTI_COUNT, CONFETTI_MAX_LIFE_MS, confettiParticles, particleAt } from './confettiParticles';
import { tokens } from './tokens';

const COLORS = [tokens.accent, tokens.secondary, tokens.text];

describe('Confetti: partículas (diseño E1.5)', () => {
  it('60 partículas, solo colores de tokens y vida máxima de 1,2 s', () => {
    const ps = confettiParticles(7, COLORS);
    expect(ps).toHaveLength(CONFETTI_COUNT);
    expect(CONFETTI_COUNT).toBe(60);
    for (const p of ps) {
      expect(COLORS).toContain(p.color);
      expect(p.lifeMs).toBeGreaterThan(0);
      expect(p.lifeMs).toBeLessThanOrEqual(CONFETTI_MAX_LIFE_MS);
    }
    expect(CONFETTI_MAX_LIFE_MS).toBe(1200);
  });

  it('determinista con la semilla', () => {
    expect(confettiParticles(7, COLORS)).toEqual(confettiParticles(7, COLORS));
    expect(confettiParticles(8, COLORS)).not.toEqual(confettiParticles(7, COLORS));
  });

  it('sale hacia arriba, cae por la gravedad y desaparece al acabar su vida', () => {
    const [p] = confettiParticles(3, COLORS, 1);
    if (p === undefined) throw new Error('sin partícula');
    expect(p.vy).toBeLessThan(0);
    const late = particleAt(p, p.lifeMs - 1);
    expect(particleAt(p, 0)).toMatchObject({ x: p.x0, y: p.y0, alpha: 1 });
    expect(late.alpha).toBeLessThan(0.05);
    expect(particleAt(p, p.lifeMs).alpha).toBe(0);
    expect(particleAt(p, 5000).alpha).toBe(0);
  });
});
