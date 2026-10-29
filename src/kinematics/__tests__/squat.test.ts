import { describe, expect, it } from 'vitest';
import { DEFAULT_ONE_EURO } from '../filter/oneEuro';
import { createFilterBank, filterPose } from '../filter/landmarkFilter';
import { SQUAT_SPEC } from '../fsm/exercises/squat';
import { createFsm, fsmStep, type RepEvent } from '../fsm/machine';
import { toPose } from '../landmarks/adapter';
import { BLAZEPOSE33 } from '../landmarks/models/blazepose33';
import { squatSignals } from '../signals/squat';
import { genSquat } from '../tools/gen/squat';
import type { PoseFrame } from '../types';

function runFrames(frames: readonly PoseFrame[]): RepEvent[] {
  let fsm = createFsm();
  let bank = createFilterBank();
  const events: RepEvent[] = [];
  for (const f of frames) {
    const filtered = filterPose(bank, toPose(f, BLAZEPOSE33), DEFAULT_ONE_EURO, 0.3);
    bank = filtered.bank;
    const { thetaK } = squatSignals(filtered.pose, 'l');
    const r = fsmStep(fsm, { tMs: f.meta.tMs, value: thetaK, paused: false }, SQUAT_SPEC);
    fsm = r.s;
    events.push(...r.events);
  }
  return events;
}

const count = (events: readonly RepEvent[], outcome: RepEvent['outcome']) => events.filter((e) => e.outcome === outcome).length;

describe('sentadilla con fixtures sintéticos', () => {
  for (const sigma of [0.004, 0.008]) {
    for (const seed of [1, 2, 3, 4, 5]) {
      it(`10 repeticiones de 2,5 s a 88° con σ=${sigma} (semilla ${seed}) dan 10 válidas`, () => {
        const events = runFrames(genSquat({ reps: 10, bottomsDeg: 88, periodS: 2.5, sigma, seed, fps: 30 }));
        expect(count(events, 'valid')).toBe(10);
        expect(count(events, 'incomplete')).toBe(0);
      });
    }
  }

  it('fondos [88,120,88,125,88,140,88] dan 4 válidas y 2 incompletas; la de 140 no emite evento', () => {
    const events = runFrames(genSquat({ reps: 7, bottomsDeg: [88, 120, 88, 125, 88, 140, 88], periodS: 2.5, sigma: 0.004, seed: 11, fps: 30 }));
    expect(count(events, 'valid')).toBe(4);
    expect(count(events, 'incomplete')).toBe(2);
    expect(events).toHaveLength(6);
  });

  it('8 repeticiones de 1,2 s con jitter de 6 ms dan 8 válidas', () => {
    const events = runFrames(genSquat({ reps: 8, bottomsDeg: 88, periodS: 1.2, sigma: 0.004, seed: 3, fps: 30, jitterMs: 6 }));
    expect(count(events, 'valid')).toBe(8);
  });

  it('60 s de pie con σ=0,008 no dan eventos', () => {
    const events = runFrames(genSquat({ reps: 0, bottomsDeg: 88, periodS: 2.5, sigma: 0.008, seed: 5, fps: 30, standS: 60 }));
    expect(events).toHaveLength(0);
  });
});

describe('FSM sobre la señal', () => {
  function feed(samples: ReadonlyArray<readonly [number, number | null, boolean?]>): RepEvent[] {
    let fsm = createFsm();
    const events: RepEvent[] = [];
    for (const [tMs, value, paused] of samples) {
      const r = fsmStep(fsm, { tMs, value, paused: paused ?? false }, SQUAT_SPEC);
      fsm = r.s;
      events.push(...r.events);
    }
    return events;
  }

  /** De pie 1 s, luego `segments` de [duración ms, ángulo final], interpolando a 30 FPS. */
  function path(segments: ReadonlyArray<readonly [number, number]>, pauseFrom?: number, pauseTo?: number) {
    const out: [number, number, boolean][] = [];
    let t = 0;
    let v = 170;
    for (; t < 1000; t += 33) out.push([t, v, false]);
    for (const [dur, target] of segments) {
      const start = v;
      const t0 = t;
      for (; t < t0 + dur; t += 33) {
        const k = (t - t0) / dur;
        v = start + (target - start) * k;
        out.push([t, v, pauseFrom !== undefined && pauseTo !== undefined && t >= pauseFrom && t < pauseTo]);
      }
      v = target;
    }
    for (let i = 0; i < 20; i++, t += 33) out.push([t, v, false]);
    return out;
  }

  it('una bajada sostenida de 7 s sin llegar al fondo produce 1 fault y ninguna válida', () => {
    const events = feed(path([[600, 130], [7000, 128], [600, 170]]));
    expect(count(events, 'fault')).toBe(1);
    expect(count(events, 'valid')).toBe(0);
  });

  it('una pausa de 1 s a mitad de repetición no duplica el conteo y la duración la excluye', () => {
    // Baja a 125°, se mantiene 1 s (pausa de 1700 a 2500 ms dentro de esa meseta), llega a 88° y sube.
    const events = feed(path([[600, 125], [1000, 125], [600, 88], [1200, 170]], 1700, 2500));
    expect(count(events, 'valid')).toBe(1);
    expect(events).toHaveLength(1);
    const rep = events.find((e) => e.outcome === 'valid');
    // Real: cruza 150° en ~1300 ms y vuelve a 160° en ~4250 ms (≈2950 ms); sin los 800 ms de pausa ≈ 2150 ms.
    expect(rep?.durationMs).toBeGreaterThan(1900);
    expect(rep?.durationMs).toBeLessThan(2400);
  });
});
