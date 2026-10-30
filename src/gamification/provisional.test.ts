import { describe, expect, it } from 'vitest';
import { provisionalState } from './provisional';
import type { SessionSummary } from './types';

const reps = (n: number, form = 90, durationMs = 2000) =>
  Array.from({ length: n }, (_, i) => ({ index: i, tStartMs: i * 2000, durationMs, formScore: form, valid: true, faults: [] }));

function s(id: string, o: Partial<SessionSummary> & { n?: number }): SessionSummary {
  const r = reps(o.n ?? 30);
  return {
    id, exercise: 'squat', startedAtMs: 0, endedAtMs: 1, tz: 'UTC', localDate: '2026-10-30', status: 'completed',
    activeSeconds: 120, repsTotal: r.length, repsValid: r.length, avgFormScore: 90, reps: r, ...o,
  };
}

const ctx = { userId: '11111111-1111-4111-8111-111111111111', today: '2026-10-30', weeklyGoalDays: 3 };

describe('estado provisional en el cliente (mismas reglas que sync_session)', () => {
  it('primera sesión: 115 XP de sesión, como en el servidor (test_20_sync.sql)', () => {
    const st = provisionalState([s('a', {})], ctx);
    expect(st.sessionXp.a).toBe(115);
    expect(st.streak.current).toBe(1);
    expect(st.level).toBeGreaterThanOrEqual(2);
  });

  it('tope diario de 300 XP por repeticiones, en orden de fin de sesión', () => {
    const st = provisionalState([s('b', { n: 200, endedAtMs: 2 }), s('a', { n: 30, endedAtMs: 1 })], ctx);
    expect(st.repXp.a).toBe(60);
    expect(st.repXp.b).toBe(240);
  });

  it('las misiones completadas suman su XP una vez y el bono de las tres diarias', () => {
    const many = [
      s('a', { n: 40, endedAtMs: 1 }),
      s('b', { n: 40, exercise: 'jumpingJack', endedAtMs: 2, activeSeconds: 200 }),
      s('c', { n: 40, exercise: 'pushUp', endedAtMs: 3 }),
    ];
    const st = provisionalState(many, ctx);
    const daily = st.assignments.filter((m) => m.scope === 'daily');
    expect(daily.every((m) => m.completed)).toBe(true);
    const missionXp = daily.reduce((n, m) => n + m.xpReward, 0) + 15;
    const sessionXp = Object.values(st.sessionXp).reduce((n, x) => n + x, 0);
    const weeklyXp = st.assignments.filter((m) => m.scope === 'weekly' && m.completed).reduce((n, m) => n + m.xpReward, 0);
    expect(st.totalXp).toBe(sessionXp + missionXp + weeklyXp);
  });

  it('sin sesiones: nivel 1, sin racha y con las misiones de hoy', () => {
    const st = provisionalState([], ctx);
    expect(st).toMatchObject({ totalXp: 0, level: 1, streak: { current: 0 } });
    expect(st.assignments.filter((m) => m.scope === 'daily')).toHaveLength(3);
  });
});
