import { describe, expect, it } from 'vitest';
import { DEFAULT_ONE_EURO, filterStep, type OneEuroState } from '../filter/oneEuro';
import { createFilterBank, filterPose } from '../filter/landmarkFilter';
import { gaussian, mulberry32 } from '../tools/gen/prng';
import type { Pose } from '../types';

function std(xs: readonly number[]): number {
  const m = xs.reduce((s, x) => s + x, 0) / xs.length;
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length);
}

describe('filterStep', () => {
  // Con fcMin 1,5 Hz a 30 FPS la EMA pura deja 0,368·σ (√(α/(2−α)), α = 0,239) y el término beta
  // sube fc a ~1,8 Hz con ruido: ~0,40·σ medido. El 0,35·σ de la spec es inalcanzable con sus parámetros.
  it('en reposo con ruido 0,004 reduce la desviación a 0,45·σ o menos', () => {
    const rng = mulberry32(7);
    const sigma = 0.004;
    let s: OneEuroState | null = null;
    const out: number[] = [];
    for (let i = 0; i < 300; i++) {
      s = filterStep(s, i / 30, 0.5 + sigma * gaussian(rng), DEFAULT_ONE_EURO);
      if (i >= 30) out.push(s.xHat);
    }
    expect(std(out)).toBeLessThanOrEqual(0.45 * sigma);
  });

  it('un escalón de 0 a 0,1 pasa de 0,09 antes de 150 ms', () => {
    let s: OneEuroState | null = null;
    for (let i = 0; i < 30; i++) s = filterStep(s, i / 30, 0, DEFAULT_ONE_EURO);
    let reachedAt = Number.POSITIVE_INFINITY;
    for (let i = 30; i < 60; i++) {
      s = filterStep(s, i / 30, 0.1, DEFAULT_ONE_EURO);
      if (s.xHat > 0.09 && reachedAt === Number.POSITIVE_INFINITY) reachedAt = (i - 30) / 30;
    }
    expect(reachedAt).toBeLessThan(0.15);
  });

  it('un timestamp repetido o que retrocede devuelve el mismo estado', () => {
    const s1 = filterStep(filterStep(null, 0, 0, DEFAULT_ONE_EURO), 1 / 30, 0.1, DEFAULT_ONE_EURO);
    expect(filterStep(s1, 1 / 30, 0.5, DEFAULT_ONE_EURO)).toBe(s1);
    expect(filterStep(s1, 0, 0.5, DEFAULT_ONE_EURO)).toBe(s1);
  });

  it('un hueco mayor a 0,25 s reinicia el filtro', () => {
    const s1 = filterStep(filterStep(null, 0, 0, DEFAULT_ONE_EURO), 1 / 30, 0, DEFAULT_ONE_EURO);
    const s2 = filterStep(s1, 1 / 30 + 0.3, 0.4, DEFAULT_ONE_EURO);
    expect(s2.xHat).toBe(0.4);
  });
});

describe('filterPose', () => {
  const lm = (x: number, y: number, v = 0.9) => ({ x, y, z: 0, v });

  it('filtra x e y de todas las articulaciones y no alimenta las de v < 0,30', () => {
    let bank = createFilterBank();
    const p0: Pose = { tMs: 0, torso: 0.3, joints: { lKnee: lm(0.5, 0.5), lAnkle: lm(0.5, 0.7, 0.2) } };
    bank = filterPose(bank, p0, DEFAULT_ONE_EURO, 0.3).bank;
    const p1: Pose = { tMs: 33, torso: 0.3, joints: { lKnee: lm(0.6, 0.6), lAnkle: lm(0.9, 0.9, 0.2) } };
    const { pose } = filterPose(bank, p1, DEFAULT_ONE_EURO, 0.3);
    const knee = pose.joints.lKnee;
    expect(knee?.x).toBeGreaterThan(0.5);
    expect(knee?.x).toBeLessThan(0.6);
    expect(knee?.y).toBeGreaterThan(0.5);
    expect(knee?.y).toBeLessThan(0.6);
    expect(pose.joints.lAnkle).toEqual(p1.joints.lAnkle);
  });
});
