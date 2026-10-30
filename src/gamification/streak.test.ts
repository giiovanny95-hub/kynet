import { describe, expect, it } from 'vitest';
import { aggregateDays, computeStreak, isQualified, type DayActivity } from './streak';
import vectors from './vectors/streak.json';

const toDays = (rows: readonly (readonly [string, number, number])[]): DayActivity[] =>
  rows.map(([date, validReps, activeSeconds]) => ({ date, validReps, activeSeconds }));

describe('racha (spec de datos §2.2, sin protectores en el MVP)', () => {
  for (const v of vectors.cases) {
    const days = toDays(v.days as [string, number, number][]);
    it(v.note, () => expect(computeStreak(days, v.asOf)).toEqual(v.expected));
    it(`${v.note} (orden inverso)`, () => expect(computeStreak([...days].reverse(), v.asOf)).toEqual(v.expected));
  }
  it('día cualificado: 20 repeticiones o 180 s', () => {
    expect(isQualified({ date: 'x', validReps: 20, activeSeconds: 0 })).toBe(true);
    expect(isQualified({ date: 'x', validReps: 0, activeSeconds: 180 })).toBe(true);
    expect(isQualified({ date: 'x', validReps: 19, activeSeconds: 179 })).toBe(false);
  });
});

describe('aggregateDays', () => {
  it('suma repeticiones y segundos por día local', () => {
    expect(
      aggregateDays([
        { localDate: '2026-10-30', repsValid: 12, activeSeconds: 60 },
        { localDate: '2026-10-30', repsValid: 10, activeSeconds: 50 },
        { localDate: '2026-10-29', repsValid: 5, activeSeconds: 200 },
      ]).sort((a, b) => a.date.localeCompare(b.date)),
    ).toEqual([
      { date: '2026-10-29', validReps: 5, activeSeconds: 200 },
      { date: '2026-10-30', validReps: 22, activeSeconds: 110 },
    ]);
  });
});
