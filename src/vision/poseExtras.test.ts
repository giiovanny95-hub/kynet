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

  it('una antigüedad no válida se trata como 0', () => {
    expect(readPoseExtras(buffer([Number.NaN, 20]), 500)).toEqual({ resultTMs: 500, ageMs: 0, inferMs: 20 });
    expect(readPoseExtras(buffer([-5, 20]), 500)).toEqual({ resultTMs: 500, ageMs: 0, inferMs: 20 });
  });
});
