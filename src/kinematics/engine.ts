import { JOINT_MIN_V } from './config/visibility';
import { arbiterStep, createArbiter, type ArbiterState } from './feedback/arbiter';
import type { FeedbackCode, FeedbackEvent } from './feedback/codes';
import { createFilterBank, filterPose, type FilterBank } from './filter/landmarkFilter';
import { DEFAULT_ONE_EURO, type OneEuroParams } from './filter/oneEuro';
import { JJ_SPEC, jjStep } from './fsm/exercises/jumpingJack';
import { SQUAT_SPEC } from './fsm/exercises/squat';
import { createFsm, fsmStep, toIdle, type FsmState, type RepEvent } from './fsm/machine';
import { toPose } from './landmarks/adapter';
import { createGuard, guardStep, type GuardState } from './quality/subjectGuard';
import { createVisState, visibilityStep, type VisState } from './quality/visibility';
import { comboStep } from './scoring/combo';
import { formScore, pForm, quality, repQ, type Quality } from './scoring/quality';
import { qRomJJ, qRomSquat } from './scoring/rom';
import { qTempo, tempoPlateau } from './scoring/tempo';
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
  readonly arbiter: ArbiterState;
  /** Intentos emitidos (válidas, incompletas y faltas): numeran las repeticiones para el escalado de avisos. */
  readonly attempts: number;
  /** Señales secundarias de la repetición en curso: `τ` en el extremo (sentadilla) y asimetría máxima en el pico (jumping jack). */
  readonly acc: RepAcc;
}

interface RepAcc {
  readonly tauBottom: number | null;
  readonly asymMax: number | null;
}

const EMPTY_ACC: RepAcc = { tauBottom: null, asymMax: null };

export type ScoredRep = RepEvent & {
  readonly q?: number;
  readonly quality?: Quality;
  readonly formScore?: number;
  readonly mult?: number;
  /** Faltas suaves o causa de la incompleta. */
  readonly faults: readonly FeedbackCode[];
};
export type EngineEvent =
  | ScoredRep
  | FeedbackEvent
  | { readonly type: 'PAUSE' | 'RESUME' | 'REP_ABANDONED' | 'SUBJECT_CHANGED'; readonly tMs: number };

export interface Hud {
  readonly phase: string;
  readonly value: number | null;
  readonly reps: number;
  readonly paused: boolean;
}

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
    arbiter: createArbiter(),
    attempts: 0,
    acc: EMPTY_ACC,
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

function score(exercise: EngineExercise, rep: RepEvent, pf: number): number {
  'worklet';
  const downS = (rep.downMs ?? 0) / 1000;
  const upS = (rep.upMs ?? 0) / 1000;
  if (exercise === 'jumpingJack') {
    return repQ(qRomJJ(rep.extreme, rep.extreme2 ?? 0), qTempo('jumpingJack', downS, upS), pf);
  }
  return repQ(qRomSquat(rep.extreme, rep.top ?? rep.extreme), qTempo('squat', downS, upS), pf);
}

const TRUNK_LEAN_MIN_DEG = 55;
const TRUNK_LEAN_MARGIN_DEG = 15;
const JJ_ASYM_DEG = 35;
const P_SOFT_MILD = 0.1;

/** Faltas suaves de una repetición válida (spec §7) y sus penalizaciones para P_form. */
function softFaults(exercise: EngineExercise, rep: RepEvent, acc: RepAcc, tauCal: number): { faults: FeedbackCode[]; penalties: number[] } {
  'worklet';
  const faults: FeedbackCode[] = [];
  const penalties: number[] = [];
  if (exercise === 'squat') {
    if (acc.tauBottom !== null && acc.tauBottom > Math.max(TRUNK_LEAN_MIN_DEG, tauCal + TRUNK_LEAN_MARGIN_DEG)) {
      faults.push('SQ_TRUNK_LEAN');
      penalties.push(P_SOFT_MILD);
    }
    const [lo, hi] = tempoPlateau('squat');
    const d = rep.durationMs / 1000;
    if (d < lo) faults.push('SQ_TOO_FAST');
    else if (d > hi) faults.push('SQ_TOO_SLOW');
  } else if (acc.asymMax !== null && acc.asymMax > JJ_ASYM_DEG) {
    faults.push('JJ_ASYMMETRY');
  }
  return { faults, penalties };
}

/** Causa de una repetición incompleta como código de feedback. */
function incompleteCode(exercise: EngineExercise, code: string | null): FeedbackCode {
  'worklet';
  if (exercise === 'squat') return 'SQ_DEPTH_SHALLOW';
  return code === 'JJ_FEET_NARROW' ? 'JJ_FEET_NARROW' : 'JJ_ARMS_LOW';
}

/**
 * Un cuadro: guarda de sujeto → adaptador → filtro → visibilidad → señales → FSM → puntuación.
 * Puro y serializable: el estado devuelto se puede guardar y reanudar.
 */
export function step(s0: EngineState, frame: PoseFrame): { s: EngineState; events: EngineEvent[]; hud: Hud } {
  'worklet';
  const hudOf = (st: EngineState, value: number | null): Hud => ({ phase: st.fsm.phase, value, reps: st.reps, paused: st.vis.paused });
  const tMs = frame.meta.tMs;
  // Marca de tiempo no finita, repetida o que retrocede: el cuadro se ignora (un NaN no debe congelar el motor).
  if (!Number.isFinite(tMs) || (s0.lastTMs !== null && !(tMs > s0.lastTMs))) return { s: s0, events: [], hud: hudOf(s0, null) };

  const events: EngineEvent[] = [];
  let s: EngineState = { ...s0, lastTMs: tMs };
  const rawPose = toPose(frame, s.cfg.model);

  const guarded = guardStep(s.guard, rawPose);
  s = { ...s, guard: guarded.g };
  if (!guarded.accept) return { s, events, hud: hudOf(s, null) };
  if (guarded.event === 'SUBJECT_CHANGED') {
    // Si estaba en pausa, la visibilidad se reinicia sin pausa: se avisa con RESUME para que la UI no quede bloqueada.
    if (s.vis.paused) events.push({ type: 'RESUME', tMs });
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
  const prevPhase = s.fsm.phase;
  let acc = s.acc;
  if (s.cfg.exercise === 'jumpingJack') {
    const sig = jjSignals(filtered.pose);
    value = sig.alpha;
    r = jjStep(s.fsm, { tMs, alpha: sig.alpha, rhoF: sig.rhoF, paused: vis.paused }, JJ_SPEC);
    if (prevPhase === 'IDLE') acc = EMPTY_ACC;
    if (!vis.paused && sig.asym !== null && (r.s.phase === 'INFLECTION' || r.s.phase === 'ASCENDING' && prevPhase === 'INFLECTION')) {
      acc = { ...acc, asymMax: Math.max(acc.asymMax ?? 0, sig.asym) };
    }
  } else {
    const sig = squatSignals(filtered.pose, side);
    value = sig.thetaK;
    r = fsmStep(s.fsm, { tMs, value, paused: vis.paused }, SQUAT_SPEC);
    if (prevPhase === 'IDLE') acc = EMPTY_ACC;
    // τ en el cuadro del extremo: se actualiza cada vez que la FSM registra un mínimo nuevo.
    const descending = r.s.phase === 'DESCENDING' || r.s.phase === 'INFLECTION';
    if (descending && r.s.tExtremeMs === tMs) acc = { ...acc, tauBottom: sig.tau };
  }
  s = { ...s, fsm: r.s, acc };

  for (const rep of r.events) {
    let faults: FeedbackCode[];
    if (rep.outcome !== 'valid') {
      // Spec §6.3: una repetición no contada (incompleta o falta) es Miss y reinicia el combo.
      faults = rep.outcome === 'incomplete' ? [incompleteCode(s.cfg.exercise, rep.code)] : [];
      s = { ...s, combo: 0 };
      events.push({ ...rep, quality: 'Miss', mult: 1, faults });
    } else {
      const soft = softFaults(s.cfg.exercise, rep, s.acc, 0);
      faults = soft.faults;
      const q = score(s.cfg.exercise, rep, pForm(soft.penalties));
      const qual = quality(q, faults.length);
      const c = comboStep({ combo: s.combo }, qual);
      s = { ...s, combo: c.combo, reps: s.reps + 1 };
      events.push({ ...rep, q, quality: qual, formScore: formScore(q), mult: c.mult, faults });
    }
    const fb = arbiterStep(s.arbiter, faults, rep.tEndMs, s.attempts + 1);
    s = { ...s, arbiter: fb.a, attempts: s.attempts + 1 };
    if (fb.event) events.push(fb.event);
  }
  return { s, events, hud: hudOf(s, value) };
}
