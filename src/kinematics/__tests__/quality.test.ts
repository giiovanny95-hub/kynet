import { describe, expect, it } from 'vitest';
import { createGuard, guardStep } from '../quality/subjectGuard';
import { classifyView } from '../quality/viewClassifier';
import { createVisState, visibilityStep, type VisState } from '../quality/visibility';
import type { Landmark, Pose } from '../types';

function runVis(s: VisState, values: readonly number[]) {
  let state = s;
  const results: { paused: boolean; event: string | null }[] = [];
  values.forEach((v, i) => {
    const r = visibilityStep(state, v, i * 33);
    state = r.s;
    results.push({ paused: r.paused, event: r.event });
  });
  return { state, results };
}

describe('visibilityStep', () => {
  it('pausa tras 3 cuadros seguidos por debajo de 0,65', () => {
    const { results } = runVis(createVisState(), [0.9, 0.6, 0.6, 0.6]);
    expect(results.map((r) => r.paused)).toEqual([false, false, false, true]);
    expect(results[3]?.event).toBe('PAUSE');
  });

  it('estando en pausa, 0,68 no reanuda (histéresis) y 5 cuadros con 0,75 sí', () => {
    const paused = runVis(createVisState(), [0.6, 0.6, 0.6]).state;
    const still = runVis(paused, Array.from({ length: 10 }, () => 0.68));
    expect(still.results.every((r) => r.paused)).toBe(true);
    const resumed = runVis(paused, Array.from({ length: 5 }, () => 0.75));
    expect(resumed.results.map((r) => r.paused)).toEqual([true, true, true, true, false]);
    expect(resumed.results[4]?.event).toBe('RESUME');
  });
});

const lm = (x: number, y: number): Landmark => ({ x, y, z: 0, v: 0.9 });

/** Pose con torso vertical de 0,3 y hombros/caderas separados `0,8·0,3·cos(guiñada)`. */
function bodyPose(yawDeg: number, hipX = 0.3, tMs = 0, torso = 0.3): Pose {
  const half = (0.8 * torso * Math.cos((yawDeg * Math.PI) / 180)) / 2;
  return {
    tMs,
    torso,
    joints: {
      lShoulder: lm(hipX - half, 0.3), rShoulder: lm(hipX + half, 0.3),
      lHip: lm(hipX - half, 0.3 + torso), rHip: lm(hipX + half, 0.3 + torso),
    },
  };
}

describe('classifyView', () => {
  it('de frente es frontal y con guiñada de 70° es lateral', () => {
    expect(classifyView(bodyPose(0))).toBe('frontal');
    expect(classifyView(bodyPose(70))).toBe('lateral');
    expect(classifyView(bodyPose(50))).toBe('ambiguous');
  });

  it('sin hombros devuelve null', () => {
    expect(classifyView({ tMs: 0, torso: null, joints: {} })).toBeNull();
  });
});

describe('guardStep', () => {
  it('rechaza un salto de cadera de 0,6 torsos y tras 3 seguidos acepta como sujeto nuevo', () => {
    let g = guardStep(createGuard(), bodyPose(0, 0.3, 0)).g;
    const outcomes: { accept: boolean; event: string | null }[] = [];
    for (let i = 1; i <= 3; i++) {
      const r = guardStep(g, bodyPose(0, 0.3 + 0.6 * 0.3, i * 33));
      g = r.g;
      outcomes.push({ accept: r.accept, event: r.event });
    }
    expect(outcomes).toEqual([
      { accept: false, event: null },
      { accept: false, event: null },
      { accept: true, event: 'SUBJECT_CHANGED' },
    ]);
  });

  it('rechaza un cambio de torso mayor al 30 %', () => {
    const g = guardStep(createGuard(), bodyPose(0, 0.3, 0, 0.3)).g;
    expect(guardStep(g, bodyPose(0, 0.3, 33, 0.4)).accept).toBe(false);
    expect(guardStep(g, bodyPose(0, 0.3, 33, 0.33)).accept).toBe(true);
  });
});
