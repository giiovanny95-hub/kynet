import { describe, expect, it } from 'vitest';
import { appendFrame, armRecording, createRecording, takeArmedRecording, toFixtureJson } from './fixtureRecorder';
import { genSquat } from '@/kinematics/tools/gen/squat';
import { formatEvent, replayFixture, replayFrames, type Fixture } from '@/kinematics/tools/replay';

describe('reproductor de fixtures', () => {
  it('un fixture sintético de 3 repeticiones da exactamente 3 REP valid', () => {
    let rec = createRecording();
    for (const f of genSquat({ reps: 3, bottomsDeg: 88, periodS: 2.5, sigma: 0.004, seed: 1, fps: 30 })) {
      rec = appendFrame(rec, f);
    }
    const fx = JSON.parse(toFixtureJson(rec, { exercise: 'squat', view: 'lateral', profile: null, realReps: 3 })) as Fixture;
    const r = replayFixture(fx);
    expect(r.valid).toBe(3);
    const reps = r.events.filter((e) => e.type === 'REP');
    expect(reps).toHaveLength(3);
    const first = reps[0];
    expect(first && formatEvent(first, 0)).toMatch(/^ +\d+\.\d\d s {2}REP valid/);
  });
});

describe('causa de PAUSE', () => {
  it('la pausa por visibilidad baja lleva cause VIS_LOW', () => {
    const frames = genSquat({ reps: 1, bottomsDeg: 88, periodS: 2.5, sigma: 0, seed: 1, fps: 30 });
    const last = frames[frames.length - 1];
    if (!last) throw new Error('sin cuadros');
    const dark = Array.from({ length: 60 }, (_, i) => ({
      ...last,
      meta: { ...last.meta, tMs: last.meta.tMs + (i + 1) * 33 },
      raw: last.raw.map((lm) => ({ ...lm, v: 0.05 })),
    }));
    const pause = replayFrames('squat', [...frames, ...dark]).events.find((e) => e.type === 'PAUSE');
    expect(pause).toMatchObject({ type: 'PAUSE', cause: 'VIS_LOW' });
    expect(pause && formatEvent(pause, 0)).toMatch(/PAUSE VIS_LOW$/);
  });
});

describe('formato del fixture (F0.2)', () => {
  it('guarda vista, perfil y realReps, y solo landmarks', () => {
    const rec = appendFrame(createRecording(), genSquat({ reps: 1, bottomsDeg: 88, periodS: 2.5, sigma: 0, seed: 1, fps: 30 })[0]!);
    const fx = JSON.parse(toFixtureJson(rec, { exercise: 'pushUp', view: 'frontal', profile: null, realReps: -1 })) as Record<string, unknown>;
    expect(fx).toMatchObject({ schemaVersion: 1, exercise: 'pushUp', view: 'frontal', profile: null, labels: { realReps: -1 } });
    expect(Object.keys(fx).sort()).toEqual(['exercise', 'fps', 'frames', 'height', 'labels', 'meta', 'model', 'profile', 'schemaVersion', 'view', 'width']);
    expect((fx.frames as { p: number[] }[])[0]?.p).toHaveLength(33 * 4);
  });

  it('el armado se consume una sola vez', () => {
    armRecording(true);
    expect(takeArmedRecording()).toBe(true);
    expect(takeArmedRecording()).toBe(false);
  });
});
