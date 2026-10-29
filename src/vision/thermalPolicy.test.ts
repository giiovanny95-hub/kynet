import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { missingWorkletExports } from '../../tests/lint/workletCheck';
import { createThermal, frameGate, thermalStep, type ThermalState } from './thermalPolicy';

function feed(steps: readonly [status: number, nowMs: number][]): number[] {
  let s: ThermalState = createThermal();
  return steps.map(([status, now]) => {
    const r = thermalStep(s, status, now);
    s = r.s;
    return r.targetFps;
  });
}

describe('política térmica (arquitectura §7)', () => {
  it('NONE y LIGHT a 30, MODERATE a 25, SEVERE a 20 al instante', () => {
    expect(feed([[0, 0], [1, 1000], [2, 2000], [3, 3000]])).toEqual([30, 30, 25, 20]);
  });

  it('CRITICAL o peor pausa (0)', () => {
    expect(feed([[4, 0]])).toEqual([0]);
    expect(feed([[5, 0]])).toEqual([0]);
  });

  it('-1 (Android < 10) se trata como NONE', () => {
    expect(feed([[-1, 0]])).toEqual([30]);
  });

  it('subir de nuevo exige 30 s estables y una subida intermedia reinicia la espera', () => {
    expect(feed([[3, 0], [0, 1000], [0, 30_000], [0, 31_001]])).toEqual([20, 20, 20, 30]);
    expect(feed([[3, 0], [0, 1000], [2, 20_000], [0, 21_000], [0, 40_000], [0, 51_001]])).toEqual([20, 20, 20, 20, 20, 30]);
  });

  it('changed solo cuando cambia el objetivo', () => {
    let s = createThermal();
    const a = thermalStep(s, 0, 0);
    s = a.s;
    expect(a.changed).toBe(false);
    expect(thermalStep(s, 3, 10).changed).toBe(true);
  });
});

describe('frameGate', () => {
  it('a 20 FPS con cuadros cada 33,3 ms deja pasar unos 20 de 30', () => {
    let due = 0;
    let n = 0;
    for (let i = 0; i < 300; i++) {
      const r = frameGate(due, (i * 1000) / 30, 20);
      due = r.nextDueMs;
      if (r.process) n++;
    }
    expect(n).toBeGreaterThanOrEqual(195);
    expect(n).toBeLessThanOrEqual(205);
  });

  it('a 30 FPS pasan todos y a 0 ninguno', () => {
    let due = 0;
    let n = 0;
    for (let i = 0; i < 30; i++) {
      const r = frameGate(due, (i * 1000) / 30, 30);
      due = r.nextDueMs;
      if (r.process) n++;
    }
    expect(n).toBe(30);
    expect(frameGate(0, 1000, 0).process).toBe(false);
  });

  it('tras un hueco largo no hay ráfaga de recuperación', () => {
    const r = frameGate(0, 10_000, 20);
    expect(r.process).toBe(true);
    expect(frameGate(r.nextDueMs, 10_033, 20).process).toBe(false);
  });

  it('todas las funciones exportadas son worklets', () => {
    expect(missingWorkletExports(readFileSync('src/vision/thermalPolicy.ts', 'utf8'))).toEqual([]);
  });
});
