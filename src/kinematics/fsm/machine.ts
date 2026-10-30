/** Máquina de estados genérica de repeticiones (spec-cinematica §4.2). */

export type Phase = 'IDLE' | 'DESCENDING' | 'INFLECTION' | 'ASCENDING' | 'COMPLETED' | 'FAULT';

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
  /** Pico de la señal secundaria (jumping jack: separación de pies `rhoF`); `null` si no aplica. */
  readonly extreme2: number | null;
  readonly code: string | null;
}

export interface FsmState {
  readonly phase: Phase;
  readonly armed: boolean;
  /** Tiempo efectivo (sin pausas) en que la señal entró a la zona de inicio. */
  readonly armSinceMs: number | null;
  readonly crossCount: number;
  /** Tiempo real y efectivo del primer cuadro del cruce en curso (el inicio de la repetición). */
  readonly crossTMs: number;
  readonly crossTEff: number;
  /** Tiempo efectivo de entrada a la fase actual. */
  readonly phaseSinceMs: number;
  readonly tStartMs: number;
  readonly tStartEff: number;
  readonly extreme: number;
  readonly extreme2: number | null;
  readonly tExtremeMs: number;
  readonly tExtremeEff: number;
  readonly tBottomMs: number | null;
  readonly tBottomEff: number | null;
  readonly top: number;
  /** Milisegundos acumulados en pausa (o sin señal); el tiempo efectivo es `tMs − pausedMs`. */
  readonly pausedMs: number;
  readonly lastTMs: number | null;
  readonly frozen: boolean;
  /** Instante (real y efectivo) en que la repetición volvió a la zona de inicio; `COMPLETED` sigue midiendo `top`. */
  readonly completedTMs: number;
  readonly completedTEff: number;
}

export interface Sample {
  readonly tMs: number;
  readonly value: number | null;
  readonly paused: boolean;
}

const FAULT_RECOVER_MS = 300;
const FAULT_TIMEOUT_MS = 5000;
/** Tras volver a la zona de inicio se sigue midiendo el máximo (bloqueo final) hasta 300 ms. */
const LOCKOUT_WINDOW_MS = 300;

export function createFsm(): FsmState {
  'worklet';
  return {
    phase: 'IDLE', armed: false, armSinceMs: null, crossCount: 0, crossTMs: 0, crossTEff: 0, phaseSinceMs: 0,
    tStartMs: 0, tStartEff: 0, extreme: 0, extreme2: null, tExtremeMs: 0, tExtremeEff: 0,
    tBottomMs: null, tBottomEff: null, top: 0, pausedMs: 0, lastTMs: null, frozen: false,
    completedTMs: 0, completedTEff: 0,
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
    extreme: s.extreme, top: s.tBottomEff === null ? null : s.top, extreme2: s.extreme2, code,
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

/**
 * Cuenta cuadros consecutivos que cruzan el umbral de salida. Al confirmar, la repetición empieza en el
 * **primer** cuadro del cruce (no en el de confirmación), para no recortar la duración.
 */
export function crossStep(s: FsmState, crossing: boolean, tMs: number, tEff: number, spec: ExerciseSpec, firstValue: number): FsmState {
  'worklet';
  if (!crossing) return { ...s, crossCount: 0 };
  const crossCount = s.crossCount + 1;
  const crossTMs = crossCount === 1 ? tMs : s.crossTMs;
  const crossTEff = crossCount === 1 ? tEff : s.crossTEff;
  if (crossCount < spec.confirmFrames) return { ...s, crossCount, crossTMs, crossTEff };
  return {
    ...enterPhase(s, 'DESCENDING', tEff),
    tStartMs: crossTMs, tStartEff: crossTEff,
    extreme: firstValue, tExtremeMs: tMs, tExtremeEff: tEff,
  };
}

/** Estancamiento por fase o duración máxima: devuelve el código de falta o `null`. */
export function stallCode(s: FsmState, tEff: number, spec: ExerciseSpec): string | null {
  'worklet';
  const inPhase = tEff - s.phaseSinceMs;
  if (s.phase === 'DESCENDING' && inPhase > spec.stallMs.desc) return 'STALL_DESC';
  if (s.phase === 'INFLECTION' && inPhase > spec.stallMs.infl) return 'STALL_INFL';
  if (s.phase === 'ASCENDING' && inPhase > spec.stallMs.asc) return 'STALL_ASC';
  if (s.phase !== 'IDLE' && s.phase !== 'FAULT' && s.phase !== 'COMPLETED' && tEff - s.tStartEff > spec.tMaxMs) return 'TOO_LONG';
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

// Antes de fsmStep a propósito: el plugin de worklets captura el cierre al definir la función, y una declarada más
// abajo llega como undefined al hilo de la cámara (ver tests/lint/workletOrder.test.ts).
/** Cierra una repetición en `COMPLETED`: duración y tiempos al volver a la zona de inicio, `top` con el bloqueo final. */
function finishCompleted(s: FsmState, spec: ExerciseSpec): { s: FsmState; events: RepEvent[] } {
  'worklet';
  const events = s.completedTEff - s.tStartEff >= spec.tNoiseMs ? [repEvent(s, 'valid', s.completedTMs, s.completedTEff, null)] : [];
  return { s: toIdle(s, s.completedTEff, true), events };
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
  if (sample.paused || v === null) {
    // Una repetición ya completada no se pierde por una pausa: se emite con el máximo medido hasta ahora.
    return s.phase === 'COMPLETED' ? finishCompleted(s, spec) : { s, events: [] };
  }

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
      return { s: crossStep(s, v < spec.exitThr, sample.tMs, t, spec, v), events: [] };
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
        return { s: { ...enterPhase(s, 'COMPLETED', t), completedTMs: sample.tMs, completedTEff: t }, events: [] };
      }
      if (v < top - spec.revDeg) {
        // Rebote: vuelve a bajar en la misma repetición.
        return { s: { ...enterPhase(s, 'INFLECTION', t), extreme: Math.min(s.extreme, v) }, events: [] };
      }
      return { s, events: [] };
    }
    case 'COMPLETED': {
      const top = Math.max(s.top, v);
      s = { ...s, top };
      if (t - s.completedTEff >= LOCKOUT_WINDOW_MS || v < top - spec.revDeg || v < spec.exitThr) return finishCompleted(s, spec);
      return { s, events: [] };
    }
    case 'FAULT':
      return { s: faultStep(s, inStart, t), events: [] };
  }
}
