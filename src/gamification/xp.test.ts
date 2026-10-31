import { describe, expect, it } from 'vitest';
import type { ExerciseCode, RepRow, SessionSummary } from './types';
import vectors from './vectors/xp.json';
import { levelForXp, levelProgress, repXp, sessionXp, xpForLevel } from './xp';

function session(reps: { clean: number; ok: number; bad: number }, status: 'completed' | 'abandoned'): SessionSummary {
  const rows: RepRow[] = [];
  const push = (n: number, formScore: number) => {
    for (let i = 0; i < n; i++) rows.push({ index: rows.length, tStartMs: rows.length * 2000, durationMs: 2000, formScore, valid: true, faults: [] });
  };
  push(reps.clean, 90);
  push(reps.ok, 60);
  push(reps.bad, 30);
  return {
    id: 's', exercise: 'squat', startedAtMs: 0, endedAtMs: 1, tz: 'UTC', localDate: '2026-10-30', status,
    activeSeconds: 60, repsTotal: rows.length, repsValid: rows.length, avgFormScore: 80, reps: rows,
  };
}

describe('XP por repetición (spec de datos §1.3)', () => {
  for (const v of vectors.repXp) {
    it(`forma ${v.formScore}, ${v.durationMs} ms, ${v.exercise} → ${v.expected}`, () => {
      expect(repXp({ formScore: v.formScore, durationMs: v.durationMs }, v.exercise as ExerciseCode)).toBe(v.expected);
    });
  }
  it('una repetición no válida no da XP', () => {
    expect(repXp({ formScore: 95, durationMs: 2000, valid: false }, 'squat')).toBe(0);
  });
});

describe('XP de sesión', () => {
  for (const v of vectors.sessionXp) {
    it(v.note, () => {
      const s = session(v.reps, v.status as 'completed' | 'abandoned');
      expect(sessionXp(s, { firstOfDay: v.firstOfDay, firstTimeExercise: v.firstTimeExercise, repXpTodayBefore: v.repXpTodayBefore })).toEqual(v.expected);
    });
  }
});

describe('nivel', () => {
  for (const v of vectors.level) {
    it(`${v.xp} XP → nivel ${v.level}`, () => expect(levelForXp(v.xp)).toBe(v.level));
  }
  it('xpForLevel es el inverso', () => {
    for (let l = 1; l <= 30; l++) expect(levelForXp(xpForLevel(l))).toBe(l);
    expect(xpForLevel(2)).toBe(100);
    expect(xpForLevel(5)).toBe(640);
  });
});

describe('avance dentro del nivel', () => {
  it('0 XP es nivel 1 con 0/100; 100 XP es nivel 2 con 0/140', () => {
    expect(levelProgress(0)).toEqual({ level: 1, current: 0, span: 100 });
    expect(levelProgress(100)).toEqual({ level: 2, current: 0, span: 140 });
    expect(levelProgress(150)).toEqual({ level: 2, current: 50, span: 140 });
  });
});
