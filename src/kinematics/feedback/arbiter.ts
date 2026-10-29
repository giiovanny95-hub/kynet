import { SEVERITY, severityRank, type FeedbackCode, type FeedbackEvent, type Severity } from './codes';

const COOLDOWN_MS = 4000;
const ESCALATE_AFTER = 3;

interface CodeTrack {
  readonly lastEmitMs: number | null;
  /** Última repetición en la que apareció y cuántas seguidas lleva. */
  readonly lastRep: number | null;
  readonly streak: number;
}

export interface ArbiterState {
  readonly codes: Readonly<Partial<Record<FeedbackCode, CodeTrack>>>;
}

export function createArbiter(): ArbiterState {
  'worklet';
  return { codes: {} };
}

function escalate(s: Severity): Severity {
  'worklet';
  return s === 'low' ? 'medium' : s === 'medium' ? 'high' : s;
}

/**
 * Elige como mucho un aviso (spec §7): el de mayor severidad que no esté en enfriamiento.
 * Enfriamiento de 4 s por código (los de pausa no tienen); 3 repeticiones seguidas con el
 * mismo código suben un nivel (`pause` y `high` no suben más).
 */
export function arbiterStep(
  a: ArbiterState,
  candidates: readonly FeedbackCode[],
  tMs: number,
  rep: number | null,
): { a: ArbiterState; event: FeedbackEvent | null } {
  'worklet';
  const codes: Partial<Record<FeedbackCode, CodeTrack>> = { ...a.codes };
  let best: { code: FeedbackCode; severity: Severity; escalated: boolean; rank: number } | null = null;
  for (const code of candidates) {
    const prev = codes[code] ?? { lastEmitMs: null, lastRep: null, streak: 0 };
    let track = prev;
    if (rep !== null && prev.lastRep !== rep) {
      const streak = prev.lastRep !== null && prev.lastRep === rep - 1 ? prev.streak + 1 : 1;
      track = { ...prev, lastRep: rep, streak };
    }
    codes[code] = track;
    const base = SEVERITY[code];
    const cooling = base !== 'pause' && track.lastEmitMs !== null && tMs - track.lastEmitMs < COOLDOWN_MS;
    if (cooling) continue;
    const up = base !== 'pause' && base !== 'high' && track.streak >= ESCALATE_AFTER;
    const severity = up ? escalate(base) : base;
    const rank = severityRank(severity);
    if (best === null || rank > best.rank) best = { code, severity, escalated: up, rank };
  }
  if (best === null) return { a: { codes }, event: null };
  const t = codes[best.code];
  if (t) codes[best.code] = { ...t, lastEmitMs: tMs };
  return {
    a: { codes },
    event: { type: 'FEEDBACK', code: best.code, severity: best.severity, escalated: best.escalated, tMs, rep },
  };
}
