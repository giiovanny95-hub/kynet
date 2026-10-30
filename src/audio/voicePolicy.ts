import type { EngineEvent } from '@/kinematics/engine';

/** 0 = conteo, 1 = aviso `medium`, 2 = aviso `high` o `pause` y cuenta atrás. */
export type VoicePriority = 0 | 1 | 2;

/** Frase por clave de i18n: la voz dice el mismo texto que la pantalla. */
export interface Utterance {
  readonly key: string;
  readonly params?: Readonly<Record<string, string | number>>;
  readonly priority: VoicePriority;
}

const COUNT_EVERY = 5;

/** La frase de más prioridad de un lote de eventos del motor, o `null` si no hay nada que decir. */
export function pickUtterance(events: readonly EngineEvent[], ctx: { readonly repsInSet: number; readonly repsPerSet: number }): Utterance | null {
  let best: Utterance | null = null;
  const consider = (u: Utterance) => {
    if (best === null || u.priority > best.priority) best = u;
  };
  for (const e of events) {
    if (e.type === 'FEEDBACK' && e.severity !== 'low') {
      consider({ key: `feedback.${e.code}`, priority: e.severity === 'medium' ? 1 : 2 });
    } else if (e.type === 'REP' && e.outcome === 'valid') {
      if (ctx.repsInSet >= ctx.repsPerSet) consider({ key: 'voice.setDone', priority: 0 });
      else if (ctx.repsInSet > 0 && ctx.repsInSet % COUNT_EVERY === 0) consider({ key: 'voice.count', params: { n: ctx.repsInSet }, priority: 0 });
    }
  }
  return best;
}

/** Una frase nueva solo interrumpe a otra de menor prioridad; con la voz apagada nunca habla. */
export function shouldSpeak(
  current: { readonly priority: VoicePriority; readonly untilMs: number } | null,
  next: Utterance,
  nowMs: number,
  enabled: boolean,
): boolean {
  if (!enabled) return false;
  if (current === null || nowMs >= current.untilMs) return true;
  return next.priority > current.priority;
}
