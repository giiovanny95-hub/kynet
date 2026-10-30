import { describe, expect, it } from 'vitest';
import { uuidv4 } from '@/core/uuid';
import { planFor } from '@/features/workout/plans';
import { DEFAULT_PREFS, parsePrefs } from './prefs';

describe('preferencias del perfil (onboarding)', () => {
  it('JSON vacío o roto da los valores por defecto', () => {
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(parsePrefs('{roto')).toEqual(DEFAULT_PREFS);
  });
  it('ignora valores fuera de rango y conserva los válidos', () => {
    expect(parsePrefs(JSON.stringify({ weeklyGoalDays: 9, fitnessLevel: 'pro', voice: false, onboardedAt: '2026-10-30' }))).toEqual({
      ...DEFAULT_PREFS, voice: false, onboardedAt: '2026-10-30',
    });
  });
});

describe('plan por nivel (producto §4.6)', () => {
  it('repeticiones por serie según el nivel de onboarding', () => {
    expect(planFor('beginner')).toEqual({ squat: { sets: 3, reps: 8 }, jumpingJack: { sets: 3, reps: 12 }, pushUp: { sets: 3, reps: 6 } });
    expect(planFor('regular').jumpingJack.reps).toBe(20);
    expect(planFor('advanced').pushUp.reps).toBe(15);
  });
});

describe('uuidv4', () => {
  it('formato RFC 4122 v4 y distintos', () => {
    const a = uuidv4();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(uuidv4()).not.toBe(a);
  });
});
