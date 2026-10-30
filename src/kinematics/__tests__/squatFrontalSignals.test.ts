import { describe, expect, it } from 'vitest';
import { squatFrontalSignals } from '../signals/squatFrontal';
import type { JointId, Landmark, Pose } from '../types';

const lm = (x: number, y: number, v = 0.95): Landmark => ({ x, y, z: 0, v });
const pose = (joints: Partial<Record<JointId, Landmark>>): Pose => ({ tMs: 0, joints, torso: null });
const standing = {
  lShoulder: lm(0.6, 0.3), rShoulder: lm(0.4, 0.3), lHip: lm(0.58, 0.6), rHip: lm(0.42, 0.6),
  lKnee: lm(0.58, 0.75), rKnee: lm(0.42, 0.75), lAnkle: lm(0.58, 0.9), rAnkle: lm(0.42, 0.9),
};

describe('señales de sentadilla de frente (F2.1)', () => {
  it('de pie: rho, lambda, kappa y kneeRatio', () => {
    const s = squatFrontalSignals(pose(standing));
    expect(s.rho).toBeCloseTo(0.3, 9);
    expect(s.lambda).toBeCloseTo(0.15, 9);
    expect(s.kappa).toBeCloseTo(0.3, 9);
    expect(s.kneeRatio).toBeCloseTo(1, 9);
    expect(s.scale).toBe(s.kappa);
  });

  it('rodillas hacia dentro bajan kneeRatio', () => {
    const s = squatFrontalSignals(pose({ ...standing, lKnee: lm(0.54, 0.75), rKnee: lm(0.46, 0.75) }));
    expect(s.kneeRatio).toBeCloseTo(0.5, 9);
  });

  it('null si falta una articulación de un lado o tiene visibilidad baja', () => {
    const { lAnkle: _a, ...sinTobillo } = standing;
    const s = squatFrontalSignals(pose(sinTobillo));
    expect(s.rho).toBeNull();
    expect(s.kneeRatio).toBeNull();
    expect(s.lambda).not.toBeNull();
    expect(squatFrontalSignals(pose({ ...standing, rShoulder: lm(0.4, 0.3, 0.1) })).kappa).toBeNull();
  });
});
