import { describe, expect, it } from 'vitest';
import { DEFAULT_ONE_EURO } from '../filter/oneEuro';
import { createFilterBank, filterPose } from '../filter/landmarkFilter';
import { jjStep } from '../fsm/exercises/jumpingJack';
import { createFsm, type RepEvent } from '../fsm/machine';
import { toPose } from '../landmarks/adapter';
import { BLAZEPOSE33 } from '../landmarks/models/blazepose33';
import { jjSignals } from '../signals/jumpingJack';
import { genJumpingJack } from '../tools/gen/jumpingJack';
import type { PoseFrame } from '../types';

function run(frames: readonly PoseFrame[]): RepEvent[] {
  let fsm = createFsm();
  let bank = createFilterBank();
  const events: RepEvent[] = [];
  for (const f of frames) {
    const filtered = filterPose(bank, toPose(f, BLAZEPOSE33), DEFAULT_ONE_EURO, 0.3);
    bank = filtered.bank;
    const { alpha, rhoF } = jjSignals(filtered.pose);
    const r = jjStep(fsm, { tMs: f.meta.tMs, alpha, rhoF, paused: false });
    fsm = r.s;
    events.push(...r.events);
  }
  return events;
}

const valid = (events: readonly RepEvent[]) => events.filter((e) => e.outcome === 'valid').length;

describe('jumping jack con fixtures sintéticos', () => {
  for (const periodS of [0.5, 0.6, 0.7, 1.0]) {
    for (const sigma of [0, 0.004, 0.008]) {
      it(`15 repeticiones con periodo ${periodS} s y σ=${sigma} dan 15 válidas`, () => {
        expect(valid(run(genJumpingJack({ reps: 15, periodS, sigma, seed: 2, fps: 30 })))).toBe(15);
      });
    }
  }

  it('solo brazos durante 30 s no cuenta repeticiones válidas', () => {
    expect(valid(run(genJumpingJack({ reps: 30, periodS: 1.0, sigma: 0.004, seed: 4, fps: 30, mode: 'armsOnly' })))).toBe(0);
  });

  it('solo pies durante 30 s no cuenta repeticiones válidas', () => {
    expect(valid(run(genJumpingJack({ reps: 30, periodS: 1.0, sigma: 0.004, seed: 4, fps: 30, mode: 'feetOnly' })))).toBe(0);
  });

  it('solo brazos marca las repeticiones como incompletas por pies cerrados', () => {
    const events = run(genJumpingJack({ reps: 5, periodS: 1.0, sigma: 0, seed: 4, fps: 30, mode: 'armsOnly' }));
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((e) => e.outcome === 'incomplete' && e.code === 'JJ_FEET_NARROW')).toBe(true);
  });
});
