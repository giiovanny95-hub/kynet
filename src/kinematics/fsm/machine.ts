/** Máquina de estados genérica de repeticiones (spec-cinematica §4.2). */

export type Phase = 'IDLE' | 'DESCENDING' | 'INFLECTION' | 'ASCENDING' | 'FAULT';

export interface ExerciseSpec {
  readonly startThr: number;
  readonly exitThr: number;
  readonly extremeThr: number;
  readonly revDeg: number;
  readonly armMs: number;
  readonly confirmFrames: number;
  readonly tNoiseMs: number;
  readonly stallMs: Readonly<{ desc: number; infl: number; asc: number }>;
  readonly tMaxMs: number;
  /** Extremo máximo para que una repetición abortada cuente como intento (`incomplete`). */
  readonly attemptMax: number;
}

export interface RepEvent {
  readonly type: 'REP';
  readonly outcome: 'valid' | 'incomplete' | 'fault';
  readonly tStartMs: number;
  readonly tBottomMs: number | null;
  readonly tEndMs: number;
  /** Duración sin el tiempo en pausa. */
  readonly durationMs: number;
  /** Tiempo de ida (inicio → extremo) y de vuelta (extremo → fin), sin pausas. */
  readonly downMs: number | null;
  readonly upMs: number | null;
  readonly extreme: number;
  /** Máximo de la señal en la vuelta (para Q_top). */
  readonly top: number | null;
  readonly code: string | null;
}

export interface FsmState {
  readonly phase: Phase;
  readonly armed: boolean;
  /** Tiempo efectivo (sin pausas) en que la señal entró a la zona de inicio. */
  readonly armSinceMs: number | null;
  readonly crossCount: number;
  /** Tiempo efectivo de entrada a la fase actual. */
  readonly phaseSinceMs: number;
  readonly tStartMs: number;
  readonly tStartEff: number;
  readonly extreme: number;
  readonly tExtremeMs: number;
  readonly tExtremeEff: number;
  readonly tBottomMs: number | null;
  readonly tBottomEff: number | null;
  readonly top: number;
  /** Milisegundos acumulados en pausa (o sin señal); el tiempo efectivo es `tMs − pausedMs`. */
  readonly pausedMs: number;
  readonly lastTMs: number | null;
  readonly frozen: boolean;
}

export interface Sample {
  readonly tMs: number;
  readonly value: number | null;
  readonly paused: boolean;
}

const FAULT_RECOVER_MS = 300;
const FAULT_TIMEOUT_MS = 5000;

export function createFsm(): FsmState {
  'worklet';
  return {
    phase: 'IDLE', armed: false, armSinceMs: null, crossCount: 0, phaseSinceMs: 0,
    tStartMs: 0, tStartEff: 0, extreme: 0, tExtremeMs: 0, tExtremeEff: 0,
    tBottomMs: null, tBottomEff: null, top: 0, pausedMs: 0, lastTMs: null, frozen: false,
  };
}

/** Avanza el reloj: devuelve el estado con pausas acumuladas y el tiempo efectivo, o `null` si el cuadro se ignora. */
export function advanceClock(s: FsmState, sample: { tMs: number; paused: boolean; hasSignal: boolean }): { s: FsmState; tEff: number } | null {
  'worklet';
  if (s.lastTMs !== null && sample.tMs <= s.lastTMs) return null;
  const dt = s.lastTMs === null ? 0 : sample.tMs - s.lastTMs;
  const freeze = sample.paused || !sample.hasSignal;
  // El intervalo hasta un cuadro congelado, o desde el último congelado, no cuenta como tiempo de ejercicio.
  const pausedMs = s.pausedMs + (freeze || s.frozen ? dt : 0);
  const next = { ...s, pausedMs, lastTMs: sample.tMs, frozen: freeze };
  return { s: next, tEff: sample.tMs - pausedMs };
}

export function repEvent(s: FsmState, outcome: RepEvent['outcome'], tMs: number, tEff: number, code: string | null): RepEvent {
  'worklet';
  return {
    type: 'REP', outcome, tStartMs: s.tStartMs, tBottomMs: s.tBottomMs, tEndMs: tMs,
    durationMs: tEff - s.tStartEff,
    downMs: s.tBottomEff === null ? null : s.tBottomEff - s.tStartEff,
    upMs: s.tBottomEff === null ? null : tEff - s.tBottomEff,
    extreme: s.extreme, top: s.tBottomEff === null ? null : s.top, code,
  };
}

export function enterPhase(s: FsmState, phase: Phase, tEff: number): FsmState {
  'worklet';
  return { ...s, phase, phaseSinceMs: tEff, crossCount: 0 };
}

/** Sale a IDLE. `armed` indica si queda armado (tras repetición completa) o debe volver a la zona de inicio. */
export function toIdle(s: FsmState, tEff: number, armed: boolean): FsmState {
  'worklet';
  return { ...enterPhase(s, 'IDLE', tEff), armed, armSinceMs: null, tBottomMs: null, tBottomEff: null };
}

/** Estancamiento por fase o duración máxima: devuelve el código de falta o `null`. */
export function stallCode(s: FsmState, tEff: number, spec: ExerciseSpec): string | null {
  'worklet';
  const inPhase = tEff - s.phaseSinceMs;
  if (s.phase === 'DESCENDING' && inPhase > spec.stallMs.desc) return 'STALL_DESC';
  if (s.phase === 'INFLECTION' && inPhase > spec.stallMs.infl) return 'STALL_INFL';
  if (s.phase === 'ASCENDING' && inPhase > spec.stallMs.asc) return 'STALL_ASC';
  if (s.phase !== 'IDLE' && s.phase !== 'FAULT' && tEff - s.tStartEff > spec.tMaxMs) return 'TOO_LONG';
  return null;
}

/** Recuperación de FAULT: 300 ms en zona de inicio (queda armado) o 5 s (sin armar). */
export function faultStep(s: FsmState, inStart: boolean, tEff: number): FsmState {
  'worklet';
  const armSinceMs = inStart ? (s.armSinceMs ?? tEff) : null;
  if (armSinceMs !== null && tEff - armSinceMs >= FAULT_RECOVER_MS) return toIdle(s, tEff, true);
  if (tEff - s.phaseSinceMs >= FAULT_TIMEOUT_MS) return toIdle(s, tEff, false);
  return { ...s, armSinceMs };
}

/** Armado en IDLE: permanecer `armMs` en la zona de inicio. */
export function armStep(s: FsmState, inStart: boolean, tEff: number, spec: ExerciseSpec): FsmState {
  'worklet';
  if (!inStart) return { ...s, armSinceMs: null };
  const armSinceMs = s.armSinceMs ?? tEff;
  return { ...s, armSinceMs, armed: s.armed || tEff - armSinceMs >= spec.armMs };
}

/**
 * Paso de la máquina para señales que **bajan** hacia el extremo (sentadilla, flexión):
 * inicio = `value >= startThr`, ida = `value < exitThr`, extremo = `value <= extremeThr`.
 */
export function fsmStep(s0: FsmState, sample: Sample, spec: ExerciseSpec): { s: FsmState; events: RepEvent[] } {
  'worklet';
  const clock = advanceClock(s0, { tMs: sample.tMs, paused: sample.paused, hasSignal: sample.value !== null });
  if (clock === null) return { s: s0, events: [] };
  let s = clock.s;
  const t = clock.tEff;
  const v = sample.value;
  if (sample.paused || v === null) return { s, events: [] };

  const inStart = v >= spec.startThr;
  const code = stallCode(s, t, spec);
  if (code !== null) {
    const ev = repEvent(s, 'fault', sample.tMs, t, code);
    return { s: { ...enterPhase(s, 'FAULT', t), armSinceMs: null }, events: [ev] };
  }

  switch (s.phase) {
    case 'IDLE': {
      s = armStep(s, inStart, t, spec);
      if (!s.armed) return { s, events: [] };
      const crossCount = v < spec.exitThr ? s.crossCount + 1 : 0;
      if (crossCount >= spec.confirmFrames) {
        s = { ...enterPhase(s, 'DESCENDING', t), tStartMs: sample.tMs, tStartEff: t, extreme: v, tExtremeMs: sample.tMs, tExtremeEff: t };
      } else {
        s = { ...s, crossCount };
      }
      return { s, events: [] };
    }
    case 'DESCENDING': {
      if (v < s.extreme) s = { ...s, extreme: v, tExtremeMs: sample.tMs, tExtremeEff: t };
      if (v <= spec.extremeThr) return { s: enterPhase(s, 'INFLECTION', t), events: [] };
      if (v > s.extreme + spec.revDeg) {
        const events = s.extreme <= spec.attemptMax ? [repEvent(s, 'incomplete', sample.tMs, t, 'SHALLOW')] : [];
        return { s: toIdle(s, t, false), events };
      }
      return { s, events: [] };
    }
    case 'INFLECTION': {
      if (v < s.extreme) s = { ...s, extreme: v, tExtremeMs: sample.tMs, tExtremeEff: t };
      if (v > s.extreme + spec.revDeg) {
        s = { ...enterPhase(s, 'ASCENDING', t), tBottomMs: s.tExtremeMs, tBottomEff: s.tExtremeEff, top: v };
      }
      return { s, events: [] };
    }
    case 'ASCENDING': {
      const top = Math.max(s.top, v);
      s = { ...s, top };
      if (inStart) {
        const events = t - s.tStartEff >= spec.tNoiseMs ? [repEvent(s, 'valid', sample.tMs, t, null)] : [];
        return { s: toIdle(s, t, true), events };
      }
      if (v < top - spec.revDeg) {
        // Rebote: vuelve a bajar en la misma repetición.
        return { s: { ...enterPhase(s, 'INFLECTION', t), extreme: Math.min(s.extreme, v) }, events: [] };
      }
      return { s, events: [] };
    }
    case 'FAULT':
      return { s: faultStep(s, inStart, t), events: [] };
  }
}
