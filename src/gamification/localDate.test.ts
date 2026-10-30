import { describe, expect, it } from 'vitest';
import { addDays, localDate, weekStart } from './localDate';
import vectors from './vectors/localDate.json';

describe('día local con corte a las 03:00 (spec de datos §2.1)', () => {
  for (const v of vectors.localDate) {
    it(`${v.utc} en ${v.tz} → ${v.expected} (${v.note})`, () => {
      expect(localDate(Date.parse(v.utc), v.tz)).toBe(v.expected);
    });
  }
  it('zona inválida cae a UTC', () => {
    expect(localDate(Date.parse('2026-10-30T12:00:00Z'), 'No/Existe')).toBe('2026-10-30');
  });
});

describe('fechas', () => {
  it('addDays cruza meses y años', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
  });
  for (const v of vectors.weekStart) {
    it(`weekStart(${v.date}) = ${v.expected}`, () => expect(weekStart(v.date)).toBe(v.expected));
  }
});
