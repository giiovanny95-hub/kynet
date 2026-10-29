import { createFilterBank, filterPose, type FilterBank } from './filter/landmarkFilter';
import { DEFAULT_ONE_EURO, type OneEuroParams } from './filter/oneEuro';
import { JJ_SPEC, jjStep } from './fsm/exercises/jumpingJack';
import { SQUAT_SPEC } from './fsm/exercises/squat';
import { createFsm, fsmStep, toIdle, type FsmState, type RepEvent } from './fsm/machine';
import { toPose } from './landmarks/adapter';
import { createGuard, guardStep, type GuardState } from './quality/subjectGuard';
import { createVisState, visibilityStep, type VisState } from './quality/visibility';
import { comboStep } from './scoring/combo';
import { formScore, quality, repQ, type Quality } from './scoring/quality';
import { qRomJJ, qRomSquat } from './scoring/rom';
import { qTempo } from './scoring/tempo';
import { jjSignals } from './signals/jumpingJack';
import { squatSignals } from './signals/squat';
import type { JointId, ModelSpec, Pose, PoseFrame } from './types';

export type EngineExercise = 'squat' | 'jumpingJack';

export interface EngineConfig {
  readonly exercise: EngineExercise;
  readonly model: ModelSpec;
  readonly side?: 'l' | 'r';
  readonly oneEuro?: OneEuroParams;
}

export interface EngineState {
  readonly cfg: Required<Omit<EngineConfig, 'side'>> & { readonly side: 'l' | 'r' | null };
  readonly side: 'l' | 'r';
  readonly bank: FilterBank;
  readonly vis: VisState;
  readonly guard: GuardState;
  readonly fsm: FsmState;
  readonly combo: number;
  readonly reps: number;
  readonly lastTMs: number | null;
  readonly pausedSinceMs: number | null;
}

export type ScoredRep = RepEvent & { readonly q?: number; readonly quality?: Quality; readonly formScore?: number; readonly mult?: number };
export type EngineEvent = ScoredRep | { readonly type: 'PAUSE' | 'RESUME' | 'REP_ABANDONED' | 'SUBJECT_CHANGED'; readonly tMs: number };

export interface Hud {
  readonly phase: string;
  readonly value: number | null;
  readonly reps: number;
  readonly paused: boolean;
}

const JOINT_MIN_V = 0.3;
const ABANDON_AFTER_MS = 3000;

export function createEngine(cfg: EngineConfig): EngineState {
  'worklet';
  return {
    cfg: { exercise: cfg.exercise, model: cfg.model, side: cfg.side ?? null, oneEuro: cfg.oneEuro ?? DEFAULT_ONE_EURO },
    side: cfg.side ?? 'l',
    bank: createFilterBank(),
    vis: createVisState(),
    guard: createGuard(),
    fsm: createFsm(),
    combo: 0,
    reps: 0,
    lastTMs: null,
    pausedSinceMs: null,
  };
}

function requiredJoints(exercise: EngineExercise, side: 'l' | 'r'): readonly JointId[] {
  'worklet';
  if (exercise === 'jumpingJack') {
    return ['lShoulder', 'rShoulder', 'lHip', 'rHip', 'lWrist', 'rWrist', 'lAnkle', 'rAnkle'];
  }
  return side === 'l' ? ['lShoulder', 'lHip', 'lKnee', 'lAnkle'] : ['rShoulder', 'rHip', 'rKnee', 'rAnkle'];
}

function meanVisibility(pose: Pose, joints: readonly JointId[]): number {
  'worklet';
  let sum = 0;
  for (const id of joints) sum += pose.joints[id]?.v ?? 0;
  return joints.length > 0 ? sum / joints.length : 0;
}

/** Lado lateral con más visibilidad; solo cambia fuera de una repetición. */
function chooseSide(s: EngineState, pose: Pose): 'l' | 'r' {
  'worklet';
  if (s.cfg.side !== null || s.fsm.phase !== 'IDLE') return s.side;
  const l = meanVisibility(pose, requiredJoints('squat', 'l'));
  const r = meanVisibility(pose, requiredJoints('squat', 'r'));
  return r > l + 0.15 ? 'r' : l > r + 0.15 ? 'l' : s.side;
}

function score(exercise: EngineExercise, rep: RepEvent): number {
  'worklet';
  const downS = (rep.downMs ?? 0) / 1000;
  const upS = (rep.upMs ?? 0) / 1000;
  if (exercise === 'jumpingJack') {
    return repQ(qRomJJ(rep.extreme, rep.extreme2 ?? 0), qTempo('jumpingJack', downS, upS), 1);
  }
  return repQ(qRomSquat(rep.extreme, rep.top ?? rep.extreme), qTempo('squat', downS, upS), 1);
}

/**
 * Un cuadro: guarda de sujeto → adaptador → filtro → visibilidad → señales → FSM → puntuación.
 * Puro y serializable: el estado devuelto se puede guardar y reanudar.
 */
export function step(s0: EngineState, frame: PoseFrame): { s: EngineState; events: EngineEvent[]; hud: Hud } {
  'worklet';
  const hudOf = (st: EngineState, value: number | null): Hud => ({ phase: st.fsm.phase, value, reps: st.reps, paused: st.vis.paused });
  const tMs = frame.meta.tMs;
  if (s0.lastTMs !== null && !(tMs > s0.lastTMs)) return { s: s0, events: [], hud: hudOf(s0, null) };

  const events: EngineEvent[] = [];
  let s: EngineState = { ...s0, lastTMs: tMs };
  const rawPose = toPose(frame, s.cfg.model);

  const guarded = guardStep(s.guard, rawPose);
  s = { ...s, guard: guarded.g };
  if (!guarded.accept) return { s, events, hud: hudOf(s, null) };
  if (guarded.event === 'SUBJECT_CHANGED') {
    s = { ...s, bank: createFilterBank(), vis: createVisState(), fsm: createFsm(), pausedSinceMs: null };
    events.push({ type: 'SUBJECT_CHANGED', tMs });
  }

  const side = s.cfg.exercise === 'squat' ? chooseSide(s, rawPose) : s.side;
  const filtered = filterPose(s.bank, rawPose, s.cfg.oneEuro, JOINT_MIN_V);
  s = { ...s, side, bank: filtered.bank };

  const vis = visibilityStep(s.vis, meanVisibility(rawPose, requiredJoints(s.cfg.exercise, side)), tMs);
  s = { ...s, vis: vis.s, pausedSinceMs: vis.paused ? (s.pausedSinceMs ?? tMs) : null };
  if (vis.event) events.push({ type: vis.event, tMs });

  const inRep = s.fsm.phase !== 'IDLE' && s.fsm.phase !== 'FAULT' && s.fsm.phase !== 'COMPLETED';
  if (vis.paused && inRep && s.pausedSinceMs !== null && tMs - s.pausedSinceMs > ABANDON_AFTER_MS) {
    s = { ...s, fsm: toIdle(s.fsm, tMs - s.fsm.pausedMs, false) };
    events.push({ type: 'REP_ABANDONED', tMs });
  }

  let value: number | null;
  let r: { s: FsmState; events: RepEvent[] };
  if (s.cfg.exercise === 'jumpingJack') {
    const sig = jjSignals(filtered.pose);
    value = sig.alpha;
    r = jjStep(s.fsm, { tMs, alpha: sig.alpha, rhoF: sig.rhoF, paused: vis.paused }, JJ_SPEC);
  } else {
    value = squatSignals(filtered.pose, side).thetaK;
    r = fsmStep(s.fsm, { tMs, value, paused: vis.paused }, SQUAT_SPEC);
  }
  s = { ...s, fsm: r.s };

  for (const rep of r.events) {
    if (rep.outcome !== 'valid') {
      // Spec §6.3: una repetición no contada (incompleta o falta) es Miss y reinicia el combo.
      s = { ...s, combo: 0 };
      events.push({ ...rep, quality: 'Miss', mult: 1 });
      continue;
    }
    const q = score(s.cfg.exercise, rep);
    const qual = quality(q, 0);
    const c = comboStep({ combo: s.combo }, qual);
    s = { ...s, combo: c.combo, reps: s.reps + 1 };
    events.push({ ...rep, q, quality: qual, formScore: formScore(q), mult: c.mult });
  }
  return { s, events, hud: hudOf(s, value) };
}
