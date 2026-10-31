import type { EngineEvent } from '@/kinematics/engine';

import type { SessionPhase } from './sessionModel';

/** Color del borde del HUD: verde (`good`), ámbar (`warn`), rojo (`bad`) o sin borde (`neutral`). */
export type FormTone = 'good' | 'warn' | 'bad' | 'neutral';

export interface ToneState {
  /** Tono de la última repetición. */
  readonly repTone: FormTone;
  /** Tono de un aviso reciente, que tapa al de la repetición hasta `alertUntilMs`. */
  readonly alertTone: FormTone | null;
  readonly alertUntilMs: number;
}

export const TONE_ALERT_MS = 2000;

export function createToneState(): ToneState {
  return { repTone: 'neutral', alertTone: null, alertUntilMs: 0 };
}

export function toneStep(s: ToneState, event: EngineEvent, nowMs: number): ToneState {
  if (event.type === 'REP') {
    if (event.outcome !== 'valid' || event.quality === 'Miss') return { ...s, repTone: 'bad' };
    return { ...s, repTone: event.quality === 'Good' ? 'warn' : 'good' };
  }
  if (event.type === 'FEEDBACK' && event.severity !== 'low') {
    return { ...s, alertTone: event.severity === 'medium' ? 'warn' : 'bad', alertUntilMs: nowMs + TONE_ALERT_MS };
  }
  return s;
}

export function toneAt(s: ToneState, nowMs: number, phase: SessionPhase): FormTone {
  if (phase !== 'active') return 'neutral';
  return s.alertTone !== null && nowMs < s.alertUntilMs ? s.alertTone : s.repTone;
}
