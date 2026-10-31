import type { EngineEvent } from '@/kinematics/engine';
import type { FeedbackCode } from '@/kinematics/feedback/codes';

/** Correcciones seguidas que disparan la ayuda y espera mínima entre ayudas [H] (plan diseño v2, H4). */
export const HELP_STREAK = 3;
export const HELP_COOLDOWN_MS = 60_000;

export interface HelpState {
  readonly streak: number;
  readonly lastCode: FeedbackCode | null;
  readonly lastShownMs: number | null;
}
export interface HelpOptions {
  readonly enabled: boolean;
  readonly hasGuide: boolean;
}

export function createHelp(): HelpState {
  return { streak: 0, lastCode: null, lastShownMs: null };
}

/**
 * Cuenta correcciones seguidas: incompleta, falta crítica o válida con falta de forma. Una repetición limpia
 * reinicia; el resto de eventos no cuenta. Al llegar a 3 pide la ayuda (si está activa, hay guía y pasó la espera)
 * y el contador vuelve a 0 en cualquier caso.
 */
export function helpStep(s: HelpState, e: EngineEvent, nowMs: number, opts: HelpOptions): { s: HelpState; show: boolean; code: FeedbackCode | null } {
  if (e.type !== 'REP') return { s, show: false, code: null };
  const corrected = e.outcome !== 'valid' || e.faults.length > 0;
  if (!corrected) return { s: { ...s, streak: 0, lastCode: null }, show: false, code: null };
  const code = e.faults[0] ?? null;
  const streak = s.streak + 1;
  if (streak < HELP_STREAK) return { s: { ...s, streak, lastCode: code }, show: false, code: null };
  const ready = opts.enabled && opts.hasGuide && (s.lastShownMs === null || nowMs - s.lastShownMs >= HELP_COOLDOWN_MS);
  return { s: { streak: 0, lastCode: null, lastShownMs: ready ? nowMs : s.lastShownMs }, show: ready, code: ready ? code : null };
}
