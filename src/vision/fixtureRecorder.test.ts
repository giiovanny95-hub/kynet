import { describe, expect, it } from 'vitest';
import { fromFlat } from '@/kinematics/landmarks/adapter';
import { BLAZEPOSE33 } from '@/kinematics/landmarks/models/blazepose33';
import { genSquat } from '@/kinematics/tools/gen/squat';
import { appendFrame, createRecording, toFixtureJson } from './fixtureRecorder';

describe('grabación de fixtures reales', () => {
  it('3 cuadros dan un JSON que fromFlat vuelve a leer igual (a 4 decimales) con las etiquetas', () => {
    const frames = genSquat({ reps: 1, bottomsDeg: 88, periodS: 2, sigma: 0.004, seed: 1, fps: 30 }).slice(0, 3);
    let rec = createRecording();
    for (const f of frames) rec = appendFrame(rec, f);
    const json = JSON.parse(toFixtureJson(rec, { exercise: 'squat', view: 'lateral', profile: null, realReps: 12 })) as {
      schemaVersion: number; exercise: string; model: string; width: number; height: number; fps: number;
      frames: { t: number; p: number[] }[]; labels: { realReps: number };
    };
    expect(json).toMatchObject({ schemaVersion: 1, exercise: 'squat', model: 'blazepose33', width: 720, height: 1280, labels: { realReps: 12 } });
    expect(json.fps).toBeCloseTo(30, 0);
    expect(json.frames).toHaveLength(3);
    json.frames.forEach((fr, i) => {
      const src = frames[i]!;
      expect(fr.t).toBeCloseTo(src.meta.tMs, 1);
      const back = fromFlat(fr.p, BLAZEPOSE33);
      back.forEach((lm, j) => {
        expect(lm.x).toBeCloseTo(src.raw[j]!.x, 4);
        expect(lm.y).toBeCloseTo(src.raw[j]!.y, 4);
        expect(lm.v).toBeCloseTo(src.raw[j]!.v, 4);
      });
    });
  });

  it('una grabación vacía no falla', () => {
    expect(JSON.parse(toFixtureJson(createRecording(), { exercise: 'pushUp', view: 'lateral', profile: null, realReps: 0 })).frames).toEqual([]);
  });
});
