import { describe, expect, it } from 'vitest';
import { toPose } from '../landmarks/adapter';
import { BLAZEPOSE33 } from '../landmarks/models/blazepose33';
import { pushUpFrontalSignals } from '../signals/pushUpFrontal';
import { genPushUp } from '../tools/gen/pushUp';

const cam = { heightM: 0.15, distanceM: 1.25 };
const sig = (o: object, i: number) => {
  const fr = genPushUp({ reps: 1, bottomsDeg: 90, periodS: 2, sigma: 0, seed: 1, fps: 30, plankHoldS: 1, camera: cam, ...o });
  const f = fr[i];
  if (!f) throw new Error('sin cuadro');
  return pushUpFrontalSignals(toPose(f, BLAZEPOSE33));
};

describe('señales de flexión de frente (F3.1)', () => {
  it('en plancha arriba: plankOk, delta positivo y scale = w', () => {
    const s = sig({}, 0);
    expect(s.plankOk).toBe(true);
    expect(s.delta ?? 0).toBeGreaterThan(0.5);
    expect(s.scale).toBe(s.w);
  });

  it('delta baja en el fondo; flare y headDrop suben con las faltas', () => {
    expect(sig({}, 60).delta ?? 9).toBeLessThan((sig({}, 0).delta ?? 0) * 0.75);
    expect(sig({ elbowFlareDeg: 90 }, 60).flare ?? 0).toBeGreaterThan((sig({}, 60).flare ?? 1) + 0.4);
    expect((sig({ headDropDeg: 25 }, 60).headDrop ?? 0) - (sig({ headDropDeg: 25 }, 0).headDrop ?? 0)).toBeGreaterThan(0.3);
  });

  it('de pie no hay plancha', () => {
    const fr = genPushUp({ reps: 1, bottomsDeg: 90, periodS: 2, sigma: 0, seed: 1, fps: 30, plankHoldS: 1, camera: { heightM: 0.15, distanceM: 2 }, standUpAfter: true });
    const last = fr[fr.length - 1];
    if (!last) throw new Error('sin cuadro');
    expect(pushUpFrontalSignals(toPose(last, BLAZEPOSE33)).plankOk).toBe(false);
  });
});
