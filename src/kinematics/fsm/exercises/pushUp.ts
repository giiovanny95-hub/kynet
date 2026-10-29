import { enterPhase, fsmStep, repEvent, type ExerciseSpec, type FsmState, type RepEvent } from '../machine';

/** Flexión lateral, señal = ángulo de codo (spec-cinematica §4.5). */
export const PUSHUP_SPEC: ExerciseSpec = {
  startThr: 155,
  exitThr: 145,
  extremeThr: 100,
  revDeg: 8,
  armMs: 500,
  confirmFrames: 2,
  tNoiseMs: 500,
  stallMs: { desc: 6000, infl: 4000, asc: 6000 },
  tMaxMs: 12000,
  attemptMax: 130,
};

export const PU_MAX_IOTA = 30;
export const PU_MIN_BODY_ARM = 150;
const PU_POSITION_MS = 1000;

/** Seguimiento de postura durante una repetición: desde cuándo el cuerpo no está horizontal. */
export interface PushUpTrack {
  readonly iotaBadSinceMs: number | null;
}

export const PUSHUP_TRACK0: PushUpTrack = { iotaBadSinceMs: null };

export interface PushUpSample {
  readonly tMs: number;
  readonly thetaE: number | null;
  readonly thetaB: number | null;
  readonly iota: number | null;
  readonly paused: boolean;
}

/**
 * Envuelve la máquina genérica: solo arma con el cuerpo horizontal (`ι ≤ 30°`) y alineado (`θb ≥ 150°`);
 * en una repetición, `ι > 30°` durante más de 1 s es una falta `PU_POSITION`.
 */
export function pushUpStep(
  s0: FsmState,
  t0: PushUpTrack,
  sample: PushUpSample,
  spec: ExerciseSpec = PUSHUP_SPEC,
): { s: FsmState; track: PushUpTrack; events: RepEvent[] } {
  'worklet';
  const plankOk = sample.iota !== null && sample.iota <= PU_MAX_IOTA && sample.thetaB !== null && sample.thetaB >= PU_MIN_BODY_ARM;
  if (s0.phase === 'IDLE' && !plankOk) {
    // Sin postura de plancha la señal no sirve: el reloj avanza congelado y el armado se pierde.
    const r = fsmStep(s0, { tMs: sample.tMs, value: null, paused: sample.paused }, spec);
    return { s: { ...r.s, armed: false, armSinceMs: null, crossCount: 0 }, track: PUSHUP_TRACK0, events: r.events };
  }
  const r = fsmStep(s0, { tMs: sample.tMs, value: sample.thetaE, paused: sample.paused }, spec);
  const inRep = r.s.phase === 'DESCENDING' || r.s.phase === 'INFLECTION' || r.s.phase === 'ASCENDING';
  if (!inRep || sample.paused) return { s: r.s, track: PUSHUP_TRACK0, events: r.events };
  const tEff = sample.tMs - r.s.pausedMs;
  const bad = sample.iota !== null && sample.iota > PU_MAX_IOTA;
  const since = bad ? (t0.iotaBadSinceMs ?? tEff) : null;
  if (since !== null && tEff - since > PU_POSITION_MS) {
    const ev = repEvent(r.s, 'fault', sample.tMs, tEff, 'PU_POSITION');
    return { s: { ...enterPhase(r.s, 'FAULT', tEff), armSinceMs: null }, track: PUSHUP_TRACK0, events: [...r.events, ev] };
  }
  return { s: r.s, track: { iotaBadSinceMs: since }, events: r.events };
}
