import { describe, expect, it } from 'vitest';
import { POSE_FLOATS, readPoseExtras } from './poseExtras';

function buffer(extras: readonly number[]): Float32Array {
  const f = new Float32Array(POSE_FLOATS + extras.length);
  f.set(extras, POSE_FLOATS);
  return f;
}

describe('readPoseExtras', () => {
  it('lee la antigüedad y el tiempo de inferencia tras los 33 landmarks', () => {
    expect(readPoseExtras(buffer([33, 28.5]), 1000)).toEqual({ resultTMs: 967, ageMs: 33, inferMs: 28.5 });
  });

  it('sin extras (modo síncrono) el resultado es del propio cuadro', () => {
    expect(readPoseExtras(new Float32Array(POSE_FLOATS), 1000)).toEqual({ resultTMs: 1000, ageMs: 0, inferMs: null });
  });

  it('el mismo resultado visto en dos cuadros da la misma marca aunque el cuadro tenga decimales', () => {
    // Kotlin trunca la marca a ms enteros; frame.timestamp / 1e6 trae decimales. Medido en el S26 Ultra: sin
    // truncar, cada repetición parecía un resultado nuevo y los descartes deducidos llegaban a millones.
    const a = readPoseExtras(buffer([33, 28]), 1000.7);
    const b = readPoseExtras(buffer([66, 28]), 1033.2);
    expect(a.resultTMs).toBe(967);
    expect(b.resultTMs).toBe(967);
  });

  it('una antigüedad no válida se trata como 0', () => {
    expect(readPoseExtras(buffer([Number.NaN, 20]), 500)).toEqual({ resultTMs: 500, ageMs: 0, inferMs: 20 });
    expect(readPoseExtras(buffer([-5, 20]), 500)).toEqual({ resultTMs: 500, ageMs: 0, inferMs: 20 });
  });
});
