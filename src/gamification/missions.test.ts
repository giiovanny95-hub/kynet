import { describe, expect, it } from 'vitest';
import { DAILY_ALL_BONUS, dailyAssignments, dailyBonus, fnv1a, MISSION_TEMPLATES, progress, weeklyAssignments } from './missions';
import type { SessionSummary } from './types';

function s(o: Partial<SessionSummary> & { clean?: number; ok?: number }): SessionSummary {
  const clean = o.clean ?? 0;
  const ok = o.ok ?? 0;
  const reps = [
    ...Array.from({ length: clean }, (_, i) => ({ index: i, tStartMs: 0, durationMs: 2000, formScore: 90, valid: true, faults: [] })),
    ...Array.from({ length: ok }, (_, i) => ({ index: clean + i, tStartMs: 0, durationMs: 2000, formScore: 60, valid: true, faults: [] })),
  ];
  return {
    id: 'x', exercise: 'squat', startedAtMs: 0, endedAtMs: 1, tz: 'UTC', localDate: '2026-10-30', status: 'completed',
    activeSeconds: 60, repsTotal: reps.length, repsValid: reps.length, avgFormScore: 80, reps, ...o,
  };
}

describe('misiones (producto §4.5-4.6)', () => {
  it('FNV-1a de 32 bits conocido (vector estándar)', () => {
    expect(fnv1a('')).toBe(0x811c9dc5);
    expect(fnv1a('a')).toBe(0xe40c292c);
    expect(fnv1a('foobar')).toBe(0xbf9cf968);
  });

  it('3 diarias deterministas: fácil, media y calidad (con 3 sesiones previas)', () => {
    const a = dailyAssignments('user-1', '2026-10-30', 3);
    expect(a.map((m) => m.tier)).toEqual(['easy', 'medium', 'quality']);
    expect(dailyAssignments('user-1', '2026-10-30', 3)).toEqual(a);
    expect(a.every((m) => m.periodStart === '2026-10-30' && m.periodEnd === '2026-10-30')).toBe(true);
    expect(a.map((m) => m.xpReward)).toEqual([20, 30, 30]);
  });

  it('cambian con la fecha (en al menos uno de 7 días)', () => {
    const days = ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'];
    const sets = new Set(days.map((d) => dailyAssignments('user-1', d, 3).map((m) => m.code).join(',')));
    expect(sets.size).toBeGreaterThan(1);
  });

  it('sin 3 sesiones previas no hay misión de calidad', () => {
    expect(dailyAssignments('user-1', '2026-10-30', 2).map((m) => m.tier)).toEqual(['easy', 'medium', 'explore']);
  });

  it('semanales: constancia con la meta de días, volumen y variedad', () => {
    const w = weeklyAssignments('user-1', '2026-10-26', 4);
    expect(w.map((m) => [m.metric, m.target, m.xpReward])).toEqual([['active_days', 4, 100], ['valid_reps', 150, 80], ['exercises_done', 3, 60]]);
    expect(w[0]?.periodEnd).toBe('2026-11-01');
  });

  it('progreso por métrica, limitado al objetivo y solo dentro del periodo', () => {
    const t = (code: string) => MISSION_TEMPLATES.find((m) => m.code === code)!;
    const day = (code: string) => ({ ...t(code), periodStart: '2026-10-30', periodEnd: '2026-10-30' });
    const sessions = [
      s({ clean: 10, ok: 2 }),
      s({ clean: 8, exercise: 'pushUp' }),
      s({ clean: 30, localDate: '2026-10-29' }),
    ];
    expect(progress(day('d_easy_squat15'), sessions)).toBe(12);
    expect(progress(day('d_med_pu10'), sessions)).toBe(8);
    expect(progress(day('d_easy_active3'), sessions)).toBe(120);
    expect(progress(day('d_q_clean'), sessions)).toBe(1); // 10/12 = 83 % y 8/8 limpias, limitado al objetivo (1)
    expect(progress(day('d_q_clean'), [s({ clean: 7, ok: 3 })])).toBe(0); // 70 % no basta
    expect(progress(day('d_explore'), sessions)).toBe(2);
    expect(progress(day('d_med_sessions2'), [s({ clean: 1 }), s({ clean: 1, status: 'abandoned' })])).toBe(1);
    expect(progress(day('d_easy_squat15'), [s({ clean: 40 })])).toBe(15);
  });

  it('constancia semanal cuenta días cualificados', () => {
    const w = weeklyAssignments('u', '2026-10-26', 3)[0]!;
    const sessions = [s({ clean: 20, localDate: '2026-10-26' }), s({ clean: 5, localDate: '2026-10-27' }), s({ clean: 25, localDate: '2026-10-28' })];
    expect(progress(w, sessions)).toBe(2);
  });

  it('bono de +15 solo con las tres diarias completas', () => {
    const a = dailyAssignments('user-1', '2026-10-30', 0);
    expect(dailyBonus(a, [])).toBe(0);
    const full = [s({ clean: 40 }), s({ clean: 40, exercise: 'jumpingJack', activeSeconds: 200 }), s({ clean: 40, exercise: 'pushUp' })];
    expect(dailyBonus(a, full)).toBe(DAILY_ALL_BONUS);
  });
});
