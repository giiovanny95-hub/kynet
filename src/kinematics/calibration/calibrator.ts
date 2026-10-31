import { JJ_ZONES } from '../fsm/exercises/jumpingJack';
import type { RepEvent } from '../fsm/machine';
import { clamp, median } from '../math/stats';
import type { ScoredExercise } from '../scoring/tempo';
import type { ModelSpec } from '../types';
import { defaultView, type CalibrationProfile } from './profile';

interface CalSample {
  readonly extreme: number;
  readonly extreme2: number | null;
  readonly start: number;
  readonly tau: number | null;
  readonly durS: number;
}

export interface CalibratorState {
  readonly exercise: ScoredExercise;
  readonly view: 'lateral' | 'frontal';
  readonly modelId: ModelSpec['id'];
  readonly side: 'l' | 'r' | null;
  readonly samples: readonly CalSample[];
}

export type CalStatus = 'collecting' | 'done' | 'fail';
export type CalCode = 'CAL_ROM_TOO_SMALL' | 'CAL_INCONSISTENT';

const CAL_REPS = 3;
const MAX_EXTRA = 2;
const MAX_DEV_DEG = 10;
const MIN_ROM_DEG = 25;
const EXTREME_LIMITS: Readonly<Record<'squat' | 'pushUp', readonly [number, number]>> = { squat: [90, 120], pushUp: [80, 115] };

export function createCalibrator(
  exercise: ScoredExercise,
  meta: { readonly view?: 'lateral' | 'frontal'; readonly modelId?: ModelSpec['id']; readonly side?: 'l' | 'r' | null } = {},
): CalibratorState {
  'worklet';
  return { exercise, view: meta.view ?? defaultView(exercise), modelId: meta.modelId ?? 'blazepose33', side: meta.side ?? null, samples: [] };
}

/** Las 3 muestras cuyo extremo está más cerca de la mediana de todas. */
function best3(samples: readonly CalSample[]): CalSample[] {
  'worklet';
  const m = median(samples.map((x) => x.extreme));
  return [...samples].sort((a, b) => Math.abs(a.extreme - m) - Math.abs(b.extreme - m)).slice(0, CAL_REPS);
}

function consistent(xs: readonly number[]): boolean {
  'worklet';
  const m = median(xs);
  return xs.every((x) => Math.abs(x - m) <= MAX_DEV_DEG);
}

/**
 * Una repetición de calibración (spec §5): perfil = mediana de 3; si algún ángulo se aleja más de 10°
 * de la mediana se piden hasta 2 extra y se usan las 3 mejores. `startValue` = valor de la señal en la
 * zona de inicio antes de la repetición.
 */
export function calibratorStep(
  c: CalibratorState,
  rep: RepEvent & { readonly tau?: number | null },
  startValue: number,
): { c: CalibratorState; status: CalStatus; profile: CalibrationProfile | null; code: CalCode | null } {
  'worklet';
  if (rep.outcome !== 'valid') return { c, status: 'collecting', profile: null, code: null };
  const sample: CalSample = { extreme: rep.extreme, extreme2: rep.extreme2, start: startValue, tau: rep.tau ?? null, durS: rep.durationMs / 1000 };
  const next = { ...c, samples: [...c.samples, sample] };
  if (next.samples.length < CAL_REPS) return { c: next, status: 'collecting', profile: null, code: null };

  const best = best3(next.samples);
  const jj = c.exercise === 'jumpingJack';
  const ok = consistent(best.map((x) => x.extreme)) && (jj || consistent(best.map((x) => x.start)));
  if (!ok) {
    const status: CalStatus = next.samples.length >= CAL_REPS + MAX_EXTRA ? 'fail' : 'collecting';
    return { c: next, status, profile: null, code: 'CAL_INCONSISTENT' };
  }

  const taus = best.flatMap((x) => (x.tau === null ? [] : [x.tau]));
  const base = {
    v: 1 as const, exercise: c.exercise, view: c.view, modelId: c.modelId, side: c.side,
    tauCal: taus.length > 0 ? median(taus) : null, dCalS: median(best.map((x) => x.durS)),
  };
  if (jj) {
    const alphaU = clamp(median(best.map((x) => x.extreme)) - 10, 110, 150);
    const rhoU = clamp(0.85 * median(best.map((x) => x.extreme2 ?? 0)), 1.2, 1.8);
    const profile: CalibrationProfile = { ...base, extremeThr: alphaU, startThr: JJ_ZONES.closedAlpha, exitThr: JJ_ZONES.openingAlpha, alphaU, rhoU };
    return { c: next, status: 'done', profile, code: null };
  }
  const [lo, hi] = EXTREME_LIMITS[c.exercise === 'pushUp' ? 'pushUp' : 'squat'];
  const extremeThr = clamp(median(best.map((x) => x.extreme)) + 10, lo, hi);
  const startThr = clamp(median(best.map((x) => x.start)) - 10, 150, 170);
  const exitThr = startThr - 10;
  if (exitThr - extremeThr < MIN_ROM_DEG) return { c: next, status: 'fail', profile: null, code: 'CAL_ROM_TOO_SMALL' };
  return { c: next, status: 'done', profile: { ...base, extremeThr, startThr, exitThr }, code: null };
}
