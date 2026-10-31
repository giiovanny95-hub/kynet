import { describe, expect, it } from 'vitest';
import { createPlacement, placementStep, type PlacementState } from './placement';

/** Llama cada 100 ms de 0 a `untilMs`; `ok(t)` dice si la persona está bien colocada. */
function run(untilMs: number, ok: (t: number) => boolean) {
  let s: PlacementState = createPlacement();
  const ticks: [number, 3 | 2 | 1 | 'go'][] = [];
  for (let t = 0; t <= untilMs; t += 100) {
    const r = placementStep(s, ok(t), t);
    s = r.s;
    if (r.tick !== null) ticks.push([t, r.tick]);
  }
  return { s, ticks };
}

describe('arranque sin tocar (colocación y cuenta atrás)', () => {
  it('bien colocado: cuenta atrás a los 1500 ms y go a los 4500 ms, cada tick una vez', () => {
    const { s, ticks } = run(6000, () => true);
    expect(ticks).toEqual([[1500, 3], [2500, 2], [3500, 1], [4500, 'go']]);
    expect(s.phase).toBe('go');
  });

  it('colocación intermitente nunca empieza la cuenta', () => {
    const { s, ticks } = run(10_000, (t) => t % 400 !== 0);
    expect(ticks).toEqual([]);
    expect(s.phase).toBe('placing');
  });

  it('salir del encuadre más de 500 ms durante la cuenta vuelve a colocación sin go', () => {
    const { ticks, s } = run(4500, (t) => t < 2000 || t > 2600);
    expect(ticks.some(([, k]) => k === 'go')).toBe(false);
    expect(s.phase).not.toBe('go');
  });

  it('un hueco de 300 ms durante la cuenta no la cancela', () => {
    const { ticks } = run(6000, (t) => t < 2000 || t >= 2300);
    expect(ticks.map(([, k]) => k)).toEqual([3, 2, 1, 'go']);
  });
});
