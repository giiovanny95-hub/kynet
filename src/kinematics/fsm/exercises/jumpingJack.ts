import {
  advanceClock, armStep, crossStep, enterPhase, faultStep, repEvent, stallCode, toIdle,
  type ExerciseSpec, type FsmState, type RepEvent,
} from '../machine';

/** Parámetros comunes de la máquina para jumping jack (spec-cinematica §4.4). */
export const JJ_SPEC: ExerciseSpec = {
  startThr: 0, exitThr: 0, extremeThr: 0, revDeg: 0, // no se usan: las zonas son de dos señales (JJ_ZONES)
  armMs: 300,
  confirmFrames: 2,
  tNoiseMs: 300,
  stallMs: { desc: 2000, infl: 3000, asc: 2000 },
  tMaxMs: 6000,
  attemptMax: 0,
};

export const JJ_ZONES = {
  closedAlpha: 60, closedRho: 1.0,
  openingAlpha: 85, openingRho: 1.3,
  openAlpha: 130, openRho: 1.4,
  closingAlpha: 100, closingRho: 1.15,
  attemptAlpha: 100, attemptRho: 1.15,
} as const;

export interface JJSample {
  readonly tMs: number;
  readonly alpha: number | null;
  readonly rhoF: number | null;
  readonly paused: boolean;
}

/** Picos de brazos y pies; el instante del extremo es el del pico de los brazos (para medir ida y vuelta). */
function trackPeak(s: FsmState, alpha: number, rhoF: number, tMs: number, tEff: number): FsmState {
  'worklet';
  const extreme2 = Math.max(s.extreme2 ?? 0, rhoF);
  if (alpha > s.extreme) return { ...s, extreme: alpha, extreme2, tExtremeMs: tMs, tExtremeEff: tEff };
  return { ...s, extreme2 };
}

/** Máquina de jumping jack: dos señales que **suben** hacia el abierto; reutiliza reloj, faltas y eventos de la máquina genérica. */
export function jjStep(s0: FsmState, sample: JJSample, spec: ExerciseSpec = JJ_SPEC): { s: FsmState; events: RepEvent[] } {
  'worklet';
  const { alpha, rhoF } = sample;
  const clock = advanceClock(s0, { tMs: sample.tMs, paused: sample.paused, hasSignal: alpha !== null && rhoF !== null });
  if (clock === null) return { s: s0, events: [] };
  let s = clock.s;
  const t = clock.tEff;
  if (sample.paused || alpha === null || rhoF === null) return { s, events: [] };

  const z = JJ_ZONES;
  const closed = alpha <= z.closedAlpha && rhoF <= z.closedRho;
  const code = stallCode(s, t, spec);
  if (code !== null) {
    return { s: { ...enterPhase(s, 'FAULT', t), armSinceMs: null }, events: [repEvent(s, 'fault', sample.tMs, t, code)] };
  }

  switch (s.phase) {
    case 'IDLE': {
      s = armStep(s, closed, t, spec);
      if (!s.armed) return { s, events: [] };
      const opening = alpha > z.openingAlpha || rhoF > z.openingRho;
      s = crossStep(s, opening, sample.tMs, t, spec, alpha);
      return { s: s.phase === 'DESCENDING' ? { ...s, extreme2: rhoF } : s, events: [] };
    }
    case 'DESCENDING': {
      s = trackPeak(s, alpha, rhoF, sample.tMs, t);
      // Los picos de brazos y pies pueden llegar en cuadros distintos: se acumulan dentro de la fase.
      if (s.extreme >= z.openAlpha && (s.extreme2 ?? 0) >= z.openRho) {
        return { s: enterPhase(s, 'INFLECTION', t), events: [] };
      }
      if (closed) {
        const armsUp = s.extreme >= z.openAlpha;
        const feetOpen = (s.extreme2 ?? 0) >= z.openRho;
        const attempted = s.extreme >= z.attemptAlpha || (s.extreme2 ?? 0) >= z.attemptRho;
        const reason = armsUp && !feetOpen ? 'JJ_FEET_NARROW' : feetOpen && !armsUp ? 'JJ_ARMS_LOW' : 'SHALLOW';
        const events = attempted ? [repEvent(s, 'incomplete', sample.tMs, t, reason)] : [];
        return { s: toIdle(s, t, false), events };
      }
      return { s, events: [] };
    }
    case 'INFLECTION': {
      s = trackPeak(s, alpha, rhoF, sample.tMs, t);
      if (alpha < z.closingAlpha || rhoF < z.closingRho) {
        s = { ...enterPhase(s, 'ASCENDING', t), tBottomMs: s.tExtremeMs, tBottomEff: s.tExtremeEff, top: alpha };
      }
      return { s, events: [] };
    }
    case 'ASCENDING': {
      if (closed) {
        const events = t - s.tStartEff >= spec.tNoiseMs ? [repEvent(s, 'valid', sample.tMs, t, null)] : [];
        return { s: toIdle(s, t, true), events };
      }
      return { s, events: [] };
    }
    case 'COMPLETED':
      // El jumping jack no usa la ventana de bloqueo final: emite al cerrar.
      return { s: toIdle(s, t, true), events: [] };
    case 'FAULT':
      return { s: faultStep(s, closed, t), events: [] };
  }
}
