import type { CalibrationProfile } from '../calibration/profile';
import { createEngine, step, type EngineEvent, type EngineExercise } from '../engine';
import { BLAZEPOSE33 } from '../landmarks/models/blazepose33';
import type { Landmark, PoseFrame } from '../types';

/**
 * Reproductor de fixtures (solo herramienta; no corre en el teléfono): pasa los cuadros de un fixture por el motor
 * y devuelve los eventos con su tiempo. Lo usa `npm run replay` (scripts/replay.mjs) y los tests.
 */
export interface Fixture {
  readonly exercise: EngineExercise;
  readonly view?: 'lateral' | 'frontal';
  readonly width: number;
  readonly height: number;
  readonly frames: readonly { readonly t: number; readonly p: readonly number[] }[];
  readonly profile?: CalibrationProfile | null;
  readonly labels?: { readonly realReps?: number };
}

export interface ReplayOptions {
  readonly view?: 'lateral' | 'frontal';
  readonly profile?: CalibrationProfile | null;
}

export interface ReplayResult {
  readonly events: readonly EngineEvent[];
  readonly valid: number;
  readonly incomplete: number;
  readonly fault: number;
}

export function fixtureFrames(fx: Fixture): PoseFrame[] {
  return fx.frames.map((f) => {
    const raw: Landmark[] = [];
    for (let i = 0; i + 3 < f.p.length; i += 4) {
      raw.push({ x: f.p[i] ?? 0, y: f.p[i + 1] ?? 0, z: f.p[i + 2] ?? 0, v: f.p[i + 3] ?? 0 });
    }
    return {
      meta: { tMs: f.t, width: fx.width, height: fx.height, rotation: 0, mirrored: false },
      model: 'blazepose33',
      raw,
    };
  });
}

export function replayFrames(exercise: EngineExercise, frames: readonly PoseFrame[], o: ReplayOptions = {}): ReplayResult {
  let s = createEngine({ exercise, model: BLAZEPOSE33, view: o.view, profile: o.profile ?? null });
  const events: EngineEvent[] = [];
  for (const f of frames) {
    const r = step(s, f);
    s = r.s;
    events.push(...r.events);
  }
  const count = (outcome: 'valid' | 'incomplete' | 'fault'): number =>
    events.filter((e) => e.type === 'REP' && e.outcome === outcome).length;
  return { events, valid: count('valid'), incomplete: count('incomplete'), fault: count('fault') };
}

export function replayFixture(fx: Fixture, o: ReplayOptions = {}): ReplayResult {
  return replayFrames(fx.exercise, fixtureFrames(fx), { view: o.view ?? fx.view, profile: o.profile ?? fx.profile });
}

/** Una línea por evento: `  12.34 s  REP valid [SQ_KNEES_IN]`, `FEEDBACK <código>`, `PAUSE <causa>`. */
export function formatEvent(e: EngineEvent, t0Ms: number): string {
  const t = (((e.type === 'REP' ? e.tEndMs : e.tMs) - t0Ms) / 1000).toFixed(2).padStart(7);
  switch (e.type) {
    case 'REP':
      return `${t} s  REP ${e.outcome}${e.faults.length > 0 ? ` [${e.faults.join(', ')}]` : ''}`;
    case 'FEEDBACK':
      return `${t} s  FEEDBACK ${e.code} (${e.severity}${e.escalated ? ', escalado' : ''})`;
    case 'PAUSE':
      return `${t} s  PAUSE${e.cause ? ` ${e.cause}` : ''}`;
    default:
      return `${t} s  ${e.type}`;
  }
}
