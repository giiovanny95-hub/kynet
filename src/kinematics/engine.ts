import { JOINT_MIN_V } from './config/visibility';
import { arbiterStep, createArbiter, type ArbiterState } from './feedback/arbiter';
import type { FeedbackCode, FeedbackEvent } from './feedback/codes';
import { createFilterBank, filterPose, type FilterBank } from './filter/landmarkFilter';
import { DEFAULT_ONE_EURO, type OneEuroParams } from './filter/oneEuro';
import { applyProfile, type CalibrationProfile } from './calibration/profile';
import { JJ_SPEC, JJ_ZONES, jjStep, type JJZones } from './fsm/exercises/jumpingJack';
import { PU_MAX_IOTA, PUSHUP_SPEC, PUSHUP_TRACK0, pushUpStep, type PushUpTrack } from './fsm/exercises/pushUp';
import { SQUAT_SPEC } from './fsm/exercises/squat';
import { createFsm, fsmStep, toIdle, type ExerciseSpec, type FsmState, type RepEvent } from './fsm/machine';
import { toPose } from './landmarks/adapter';
import { createGuard, guardStep, type GuardState } from './quality/subjectGuard';
import { classifyView } from './quality/viewClassifier';
import { createVisState, visibilityStep, type VisState } from './quality/visibility';
import { comboStep } from './scoring/combo';
import { formScore, pForm, quality, repQ, type Quality } from './scoring/quality';
import { DEFAULT_T, DEFAULT_TTOP, qRomJJ, qRomSquat } from './scoring/rom';
import { qTempo, tempoPlateau } from './scoring/tempo';
import { jjSignals } from './signals/jumpingJack';
import { pushUpSignals } from './signals/pushUp';
import { squatSignals } from './signals/squat';
import type { JointId, ModelSpec, Pose, PoseFrame } from './types';

export type EngineExercise = 'squat' | 'jumpingJack' | 'pushUp';

export interface EngineConfig {
  readonly exercise: EngineExercise;
  readonly model: ModelSpec;
  readonly side?: 'l' | 'r';
  readonly oneEuro?: OneEuroParams;
  /** Vista exigida; por defecto frontal en jumping jack y lateral en el resto. */
  readonly view?: 'lateral' | 'frontal';
  /** Calibración en curso: umbrales permisivos (spec §5.2). */
  readonly calibrating?: boolean;
  /** Umbrales personalizados; la app comprueba antes `isProfileValid`. */
  readonly profile?: CalibrationProfile | null;
}

interface ResolvedConfig {
  readonly exercise: EngineExercise;
  readonly model: ModelSpec;
  readonly side: 'l' | 'r' | null;
  readonly oneEuro: OneEuroParams;
  readonly view: 'lateral' | 'frontal';
  readonly profile: CalibrationProfile | null;
  /** Tabla efectiva de la FSM (con calibración o perfil aplicados) y zonas de jumping jack. */
  readonly spec: ExerciseSpec;
  readonly zones: JJZones;
}

export interface EngineState {
  readonly cfg: ResolvedConfig;
  /** Encuadre: vista incorrecta (desde cuándo), cuadros con una articulación al borde y cuadros correctos seguidos. */
  readonly frameCheck: FrameCheck;
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
  readonly pu: PushUpTrack;
  /** Señales secundarias de la repetición en curso: `τ` en el extremo (sentadilla) y asimetría máxima en el pico (jumping jack). */
  readonly acc: RepAcc;
}

type PauseCause = 'VIS_LOW' | 'VIEW' | 'OUT_OF_FRAME' | 'POSTURE';

interface FrameCheck {
  readonly viewBadSinceMs: number | null;
  /** Flexión: cuerpo no horizontal fuera de una repetición. */
  readonly postureBadSinceMs: number | null;
  readonly edgeRun: number;
  readonly okRun: number;
  /** Causa de encuadre que mantiene la pausa (la visibilidad va aparte en `vis`). */
  readonly issue: 'VIEW' | 'OUT_OF_FRAME' | 'POSTURE' | null;
}

const FRAME_OK: FrameCheck = { viewBadSinceMs: null, postureBadSinceMs: null, edgeRun: 0, okRun: 0, issue: null };
const POSTURE_BAD_MS = 1000;
const VIEW_BAD_MS = 1000;
const EDGE_FRAMES = 3;
const RESUME_FRAMES = 5;
const EDGE_MARGIN = 0.02;

interface RepAcc {
  readonly tauBottom: number | null;
  readonly asymMax: number | null;
  /** Flexión: θb con signo de la peor alineación en el fondo y la subida. */
  readonly bodySigned: number | null;
}

const EMPTY_ACC: RepAcc = { tauBottom: null, asymMax: null, bodySigned: null };

export type ScoredRep = RepEvent & {
  readonly q?: number;
  readonly quality?: Quality;
  readonly formScore?: number;
  readonly mult?: number;
  /** Faltas suaves o causa de la incompleta. */
  readonly faults: readonly FeedbackCode[];
  /** Sentadilla: inclinación del tronco en el fondo (para `τ_cal`). */
  readonly tau?: number | null;
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
    cfg: resolveConfig(cfg),
    frameCheck: FRAME_OK,
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
    pu: PUSHUP_TRACK0,
    acc: EMPTY_ACC,
  };
}

const CAL_EXTREME_THR = 115;
const CAL_JJ_ALPHA = 110;
const CAL_JJ_RHO = 1.2;

function resolveConfig(cfg: EngineConfig): ResolvedConfig {
  'worklet';
  const profile = cfg.calibrating ? null : (cfg.profile ?? null);
  const baseSpec = cfg.exercise === 'jumpingJack' ? JJ_SPEC : cfg.exercise === 'pushUp' ? PUSHUP_SPEC : SQUAT_SPEC;
  let spec = baseSpec;
  let zones: JJZones = JJ_ZONES;
  if (cfg.calibrating) {
    spec = { ...baseSpec, extremeThr: CAL_EXTREME_THR };
    zones = { ...JJ_ZONES, openAlpha: CAL_JJ_ALPHA, openRho: CAL_JJ_RHO };
  } else if (profile !== null) {
    if (cfg.exercise === 'jumpingJack') zones = { ...JJ_ZONES, openAlpha: profile.alphaU ?? JJ_ZONES.openAlpha, openRho: profile.rhoU ?? JJ_ZONES.openRho };
    else spec = applyProfile(baseSpec, profile);
  }
  return {
    exercise: cfg.exercise, model: cfg.model, side: cfg.side ?? profile?.side ?? null, oneEuro: cfg.oneEuro ?? DEFAULT_ONE_EURO,
    view: cfg.view ?? (cfg.exercise === 'jumpingJack' ? 'frontal' : 'lateral'), profile, spec, zones,
  };
}

function requiredJoints(exercise: EngineExercise, side: 'l' | 'r'): readonly JointId[] {
  'worklet';
  if (exercise === 'jumpingJack') {
    return ['lShoulder', 'rShoulder', 'lHip', 'rHip', 'lWrist', 'rWrist', 'lAnkle', 'rAnkle'];
  }
  if (exercise === 'pushUp') {
    return side === 'l'
      ? ['lShoulder', 'lElbow', 'lWrist', 'lHip', 'lKnee', 'lAnkle']
      : ['rShoulder', 'rElbow', 'rWrist', 'rHip', 'rKnee', 'rAnkle'];
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

function score(cfg: ResolvedConfig, rep: RepEvent, pf: number): number {
  'worklet';
  const downS = (rep.downMs ?? 0) / 1000;
  const upS = (rep.upMs ?? 0) / 1000;
  if (cfg.exercise === 'jumpingJack') {
    return repQ(qRomJJ(rep.extreme, rep.extreme2 ?? 0), qTempo('jumpingJack', downS, upS), pf);
  }
  const tempo = qTempo(cfg.exercise === 'pushUp' ? 'pushUp' : 'squat', downS, upS);
  // Con perfil, T = fondo calibrado y Ttop = inicio calibrado (spec §6.1).
  const T = cfg.profile ? cfg.profile.extremeThr - 10 : DEFAULT_T;
  const Ttop = cfg.profile ? cfg.profile.startThr + 10 : DEFAULT_TTOP;
  return repQ(qRomSquat(rep.extreme, rep.top ?? rep.extreme, T, Ttop), tempo, pf);
}

const TRUNK_LEAN_MIN_DEG = 55;
const TRUNK_LEAN_MARGIN_DEG = 15;
const JJ_ASYM_DEG = 35;
const P_SOFT_MILD = 0.1;
const P_SOFT_SEVERE = 0.25;
const PU_HIPS_DEG = 160;

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
  } else if (exercise === 'pushUp') {
    if (acc.bodySigned !== null && Math.abs(acc.bodySigned) < PU_HIPS_DEG) {
      faults.push(acc.bodySigned < 0 ? 'PU_HIPS_SAG' : 'PU_HIPS_PIKE');
      penalties.push(P_SOFT_SEVERE);
    }
    const [lo, hi] = tempoPlateau('pushUp');
    const d = rep.durationMs / 1000;
    if (d < lo) faults.push('PU_TOO_FAST');
    else if (d > hi) faults.push('PU_TOO_SLOW');
  } else if (acc.asymMax !== null && acc.asymMax > JJ_ASYM_DEG) {
    faults.push('JJ_ASYMMETRY');
  }
  return { faults, penalties };
}

/** Causa de una repetición incompleta como código de feedback. */
function incompleteCode(exercise: EngineExercise, code: string | null): FeedbackCode {
  'worklet';
  if (exercise === 'squat') return 'SQ_DEPTH_SHALLOW';
  if (exercise === 'pushUp') return 'PU_DEPTH_SHALLOW';
  return code === 'JJ_FEET_NARROW' ? 'JJ_FEET_NARROW' : 'JJ_ARMS_LOW';
}

/** Alguna articulación requerida y visible a menos del 2 % del borde (coordenadas normalizadas del cuadro). */
function nearEdge(pose: Pose, joints: readonly JointId[], aspect: number): boolean {
  'worklet';
  for (const id of joints) {
    const lm = pose.joints[id];
    if (!lm || lm.v < JOINT_MIN_V) continue;
    const xn = lm.x / aspect;
    if (xn < EDGE_MARGIN || xn > 1 - EDGE_MARGIN || lm.y < EDGE_MARGIN || lm.y > 1 - EDGE_MARGIN) return true;
  }
  return false;
}

/** Vista incorrecta más de 1 s o articulación al borde 3 cuadros: pausa; 5 cuadros correctos la levantan. */
function frameCheckStep(
  f: FrameCheck, pose: Pose, joints: readonly JointId[], want: 'lateral' | 'frontal', aspect: number, tMs: number, postureBad: boolean,
): FrameCheck {
  'worklet';
  const v = classifyView(pose);
  const wrongView = v !== null && v !== 'ambiguous' && v !== want;
  const viewBadSinceMs = wrongView ? (f.viewBadSinceMs ?? tMs) : null;
  const postureBadSinceMs = postureBad ? (f.postureBadSinceMs ?? tMs) : null;
  const edgeRun = nearEdge(pose, joints, aspect) ? f.edgeRun + 1 : 0;
  const now = viewBadSinceMs !== null && tMs - viewBadSinceMs > VIEW_BAD_MS ? 'VIEW'
    : edgeRun >= EDGE_FRAMES ? 'OUT_OF_FRAME'
    : postureBadSinceMs !== null && tMs - postureBadSinceMs > POSTURE_BAD_MS ? 'POSTURE'
    : null;
  if (now !== null) return { viewBadSinceMs, postureBadSinceMs, edgeRun, okRun: 0, issue: now };
  if (f.issue === null) return { viewBadSinceMs, postureBadSinceMs, edgeRun, okRun: 0, issue: null };
  const bad = wrongView || edgeRun > 0 || postureBad;
  const okRun = bad ? 0 : f.okRun + 1;
  return { viewBadSinceMs, postureBadSinceMs, edgeRun, okRun, issue: okRun >= RESUME_FRAMES ? null : f.issue };
}

function pauseCode(cause: PauseCause, exercise: EngineExercise, want: 'lateral' | 'frontal'): FeedbackCode {
  'worklet';
  if (cause === 'POSTURE') return 'PU_POSITION';
  if (cause !== 'VIEW') return cause;
  if (exercise === 'jumpingJack') return 'JJ_FACE_CAMERA';
  if (exercise === 'pushUp') return 'PU_POSITION';
  return want === 'lateral' ? 'VIEW_WRONG_SIDE' : 'VIEW_WRONG_FRONT';
}

/**
 * Un cuadro: guarda de sujeto → adaptador → filtro → visibilidad → señales → FSM → puntuación.
 * Puro y serializable: el estado devuelto se puede guardar y reanudar.
 */
export function step(s0: EngineState, frame: PoseFrame): { s: EngineState; events: EngineEvent[]; hud: Hud } {
  'worklet';
  const isPaused = (st: EngineState): boolean => st.vis.paused || st.frameCheck.issue !== null;
  const hudOf = (st: EngineState, value: number | null): Hud => ({ phase: st.fsm.phase, value, reps: st.reps, paused: isPaused(st) });
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
    if (isPaused(s)) events.push({ type: 'RESUME', tMs });
    s = { ...s, bank: createFilterBank(), vis: createVisState(), frameCheck: FRAME_OK, fsm: createFsm(), pausedSinceMs: null };
    events.push({ type: 'SUBJECT_CHANGED', tMs });
  }

  const side = s.cfg.exercise === 'jumpingJack' ? s.side : chooseSide(s, rawPose);
  const filtered = filterPose(s.bank, rawPose, s.cfg.oneEuro, JOINT_MIN_V);
  s = { ...s, side, bank: filtered.bank };

  const joints = requiredJoints(s.cfg.exercise, side);
  const wasPaused = isPaused(s);
  const prevCause: PauseCause | null = s.vis.paused ? 'VIS_LOW' : s.frameCheck.issue;
  const vis = visibilityStep(s.vis, meanVisibility(rawPose, joints), tMs);
  const aspect = frame.meta.height > 0 ? frame.meta.width / frame.meta.height : 1;
  // Flexión: fuera de una repetición, el cuerpo no horizontal (de pie, sentado) pausa con PU_POSITION.
  const puSig = s.cfg.exercise === 'pushUp' ? pushUpSignals(filtered.pose, side) : null;
  const outOfRep = s.fsm.phase === 'IDLE' || s.fsm.phase === 'FAULT';
  const postureBad = puSig !== null && outOfRep && puSig.iota !== null && puSig.iota > PU_MAX_IOTA;
  const frameCheck = frameCheckStep(s.frameCheck, rawPose, joints, s.cfg.view, aspect, tMs, postureBad);
  s = { ...s, vis: vis.s, frameCheck };
  const paused = isPaused(s);
  const cause: PauseCause | null = vis.paused ? 'VIS_LOW' : frameCheck.issue;
  s = { ...s, pausedSinceMs: paused ? (s.pausedSinceMs ?? tMs) : null };
  if (paused !== wasPaused) events.push({ type: paused ? 'PAUSE' : 'RESUME', tMs });
  if (cause !== null && cause !== prevCause) {
    const fb = arbiterStep(s.arbiter, [pauseCode(cause, s.cfg.exercise, s.cfg.view)], tMs, null);
    s = { ...s, arbiter: fb.a };
    if (fb.event) events.push(fb.event);
  }

  const inRep = s.fsm.phase !== 'IDLE' && s.fsm.phase !== 'FAULT' && s.fsm.phase !== 'COMPLETED';
  if (paused && inRep && s.pausedSinceMs !== null && tMs - s.pausedSinceMs > ABANDON_AFTER_MS) {
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
    r = jjStep(s.fsm, { tMs, alpha: sig.alpha, rhoF: sig.rhoF, paused }, s.cfg.spec, s.cfg.zones);
    if (prevPhase === 'IDLE') acc = EMPTY_ACC;
    if (!paused && sig.asym !== null && (r.s.phase === 'INFLECTION' || r.s.phase === 'ASCENDING' && prevPhase === 'INFLECTION')) {
      acc = { ...acc, asymMax: Math.max(acc.asymMax ?? 0, sig.asym) };
    }
  } else if (puSig !== null) {
    value = puSig.thetaE;
    const pr = pushUpStep(s.fsm, s.pu, { tMs, thetaE: puSig.thetaE, thetaB: puSig.thetaB, iota: puSig.iota, paused }, s.cfg.spec);
    r = pr;
    s = { ...s, pu: pr.track };
    if (prevPhase === 'IDLE') acc = EMPTY_ACC;
    // θb en el fondo y la subida: se guarda la peor alineación (θb más bajo) con su signo.
    const bottomOrUp = r.s.phase === 'INFLECTION' || r.s.phase === 'ASCENDING';
    if (!paused && bottomOrUp && puSig.thetaBSigned !== null && (acc.bodySigned === null || Math.abs(puSig.thetaBSigned) < Math.abs(acc.bodySigned))) {
      acc = { ...acc, bodySigned: puSig.thetaBSigned };
    }
  } else {
    const sig = squatSignals(filtered.pose, side);
    value = sig.thetaK;
    r = fsmStep(s.fsm, { tMs, value, paused }, s.cfg.spec);
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
      faults = rep.outcome === 'incomplete' ? [incompleteCode(s.cfg.exercise, rep.code)] : rep.code === 'PU_POSITION' ? ['PU_POSITION'] : [];
      s = { ...s, combo: 0 };
      events.push({ ...rep, quality: 'Miss', mult: 1, faults });
    } else {
      const soft = softFaults(s.cfg.exercise, rep, s.acc, s.cfg.profile?.tauCal ?? 0);
      faults = soft.faults;
      const q = score(s.cfg, rep, pForm(soft.penalties));
      const qual = quality(q, faults.length);
      const c = comboStep({ combo: s.combo }, qual);
      s = { ...s, combo: c.combo, reps: s.reps + 1 };
      events.push({ ...rep, q, quality: qual, formScore: formScore(q), mult: c.mult, faults, tau: s.acc.tauBottom });
    }
    const fb = arbiterStep(s.arbiter, faults, rep.tEndMs, s.attempts + 1);
    s = { ...s, arbiter: fb.a, attempts: s.attempts + 1 };
    if (fb.event) events.push(fb.event);
  }
  return { s, events, hud: hudOf(s, value) };
}
