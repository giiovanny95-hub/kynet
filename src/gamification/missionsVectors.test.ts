import { describe, expect, it } from 'vitest';
import { dailyAssignments, fnv1a } from './missions';
import vectors from './vectors/missions.json';
import expected from './vectors/missions.expected.json';

// Los mismos vectores los comprueba el SQL (supabase/tests/test_30_missions.sql): cliente y servidor eligen igual.
describe('vectores de misiones compartidos con el servidor', () => {
  for (const v of vectors.fnv1a) it(`fnv1a('${v.text}')`, () => expect(fnv1a(v.text)).toBe(v.hash));
  it('selección diaria', () => {
    expect(vectors.daily.map((v) => dailyAssignments(v.userId, v.date, v.priorSessions).map((a) => a.code))).toEqual(expected.daily);
  });
});
