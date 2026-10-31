import { describe, expect, it } from 'vitest';
import { genPushUp } from '../tools/gen/pushUp';
import { genSquat } from '../tools/gen/squat';
import type { PoseFrame } from '../types';

const digest = (frames: readonly PoseFrame[]): number => {
  let h = 0;
  for (const f of frames) for (const lm of f.raw) h = (h * 31 + Math.round(lm.x * 1e6) * 7 + Math.round(lm.y * 1e6)) % 2147483647;
  return h;
};

const at = (f: PoseFrame | undefined, i: number) => f?.raw[i] ?? { x: Number.NaN, y: Number.NaN, z: 0, v: 0 };
const mid = (f: PoseFrame | undefined, l: number, r: number) => (at(f, l).y + at(f, r).y) / 2;
/** ρ sin referencia: tobillo medio − cadera media, en alto de cuadro. */
const rhoRaw = (f: PoseFrame | undefined) => mid(f, 27, 28) - mid(f, 23, 24);

describe('generadores de frente (F1.2)', () => {
  it('sin camera la salida lateral no cambia (misma semilla)', () => {
    const frames = genSquat({ reps: 2, bottomsDeg: 88, periodS: 2, sigma: 0.004, seed: 7, fps: 30, jitterMs: 3 });
    expect(frames).toHaveLength(165);
    expect(digest(frames)).toMatchInlineSnapshot(`598622690`);
  });

  it('de frente, los lados se separan en x y ρ baja en el fondo', () => {
    const frames = genSquat({ reps: 1, bottomsDeg: 90, periodS: 2, sigma: 0, seed: 1, fps: 30, camera: { heightM: 0.9, distanceM: 2.5 } });
    const top = frames[0];
    const bottom = frames[Math.round(2 * 30)];
    expect(at(top, 11).x).toBeGreaterThan(at(top, 12).x);
    expect(rhoRaw(bottom) / rhoRaw(top)).toBeLessThan(0.8);
    expect(frames[0]?.meta.width).toBe(480);
  });
});

describe('flexión de frente desde el suelo (F1.3)', () => {
  const cam = { heightM: 0.15, distanceM: 1.25 };
  const w = (f: PoseFrame | undefined) => Math.abs(at(f, 11).x - at(f, 12).x) * (480 / 640);
  const delta = (f: PoseFrame | undefined) => ((at(f, 15).y + at(f, 16).y) / 2 - mid(f, 11, 12)) / w(f);

  it('sin camera la salida lateral no cambia (misma semilla)', () => {
    const frames = genPushUp({ reps: 2, bottomsDeg: 85, periodS: 2, sigma: 0.004, seed: 7, fps: 30, hipDeviationDeg: -10 });
    expect(digest(frames)).toBe(358754642);
  });

  it('δ baja en el fondo y las caderas salen con visibilidad baja', () => {
    const fr = genPushUp({ reps: 1, bottomsDeg: 90, periodS: 2, sigma: 0, seed: 1, fps: 30, plankHoldS: 1, camera: cam });
    expect(delta(fr[60]) / delta(fr[0])).toBeLessThan(0.75);
    expect(at(fr[0], 23).v).toBeLessThan(0.5);
    expect(at(fr[0], 0).y).toBeLessThan(at(fr[0], 15).y);
  });

  it('codos abiertos y cabeza caída se ven en el fondo', () => {
    const flare = (f: PoseFrame | undefined) => (Math.abs(at(f, 13).x - at(f, 11).x) + Math.abs(at(f, 14).x - at(f, 12).x)) * (480 / 640) / (2 * w(f));
    const run = (o: object) => genPushUp({ reps: 1, bottomsDeg: 90, periodS: 2, sigma: 0, seed: 1, fps: 30, plankHoldS: 1, camera: cam, ...o });
    expect(flare(run({ elbowFlareDeg: 90 })[60])).toBeGreaterThan(flare(run({})[60]) + 0.4);
    const hd = run({ headDropDeg: 25 });
    const head = (f: PoseFrame | undefined) => (at(f, 0).y - mid(f, 11, 12)) / w(f);
    expect(head(hd[60]) - head(hd[0])).toBeGreaterThan(0.3);
  });

  it('standUpAfter termina de pie (torso largo, muñecas por encima de las caderas)', () => {
    const fr = genPushUp({ reps: 1, bottomsDeg: 90, periodS: 2, sigma: 0, seed: 1, fps: 30, plankHoldS: 1, camera: { heightM: 0.15, distanceM: 2 }, standUpAfter: true });
    const last = fr[fr.length - 1];
    expect(mid(last, 23, 24) - mid(last, 11, 12)).toBeGreaterThan(0.7 * w(last));
    expect(fr.length).toBe(Math.round((1 + 2 + 1.5 + 1) * 30));
  });
});
