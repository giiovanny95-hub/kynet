import { describe, expect, it } from 'vitest';
import { createSession, type SessionState } from './sessionModel';
import { toSessionSummary } from './sessionSummary';

const base = (o: Partial<SessionState>): SessionState => ({ ...createSession(), exercise: 'squat', phase: 'done', ...o });

describe('resumen de sesión para guardar y sincronizar', () => {
  it('con una serie completa es completed, con media de forma de las válidas y día local con corte a las 03:00', () => {
    const s = base({
      startedAtMs: Date.parse('2026-10-30T06:40:00Z'), // 00:40 en Ciudad de México
      activeMs: 95_400,
      setsCompleted: 1,
      attempts: [
        { valid: true, formScore: 90, durationMs: 2000, tStartMs: 1000, faults: [] },
        { valid: false, formScore: 0, durationMs: 1500, tStartMs: 4000, faults: ['SQ_DEPTH_SHALLOW'] },
        { valid: true, formScore: 70, durationMs: 2100, tStartMs: 7000, faults: ['SQ_TRUNK_LEAN'] },
      ],
    });
    const r = toSessionSummary(s, { id: 'a1', tz: 'America/Mexico_City', endedAtMs: Date.parse('2026-10-30T06:45:00Z') });
    expect(r).toMatchObject({
      id: 'a1', exercise: 'squat', status: 'completed', localDate: '2026-10-29', activeSeconds: 95,
      repsTotal: 3, repsValid: 2, avgFormScore: 80, tz: 'America/Mexico_City',
    });
    expect(r.reps.map((x) => [x.index, x.valid, x.faults])).toEqual([[0, true, []], [1, false, ['SQ_DEPTH_SHALLOW']], [2, true, ['SQ_TRUNK_LEAN']]]);
  });

  it('sin series completas es abandoned y sin repeticiones la media es 0', () => {
    const r = toSessionSummary(base({ startedAtMs: 0, setsCompleted: 0 }), { id: 'a2', tz: 'UTC', endedAtMs: 1000 });
    expect(r).toMatchObject({ status: 'abandoned', avgFormScore: 0, repsTotal: 0 });
  });
});
