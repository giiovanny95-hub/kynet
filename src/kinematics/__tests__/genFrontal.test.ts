import { describe, expect, it } from 'vitest';
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
