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
  it('vibración activada por defecto; respeta un false guardado e ignora valores no booleanos', () => {
    expect(DEFAULT_PREFS.haptics).toBe(true);
    expect(parsePrefs(JSON.stringify({ haptics: false })).haptics).toBe(false);
    expect(parsePrefs(JSON.stringify({ haptics: 'no' })).haptics).toBe(true);
  });
  it('vista por ejercicio: frente por defecto, tolera prefs viejas y valores inválidos (F4.3)', () => {
    expect(DEFAULT_PREFS.exerciseView).toEqual({ squat: 'frontal', pushUp: 'frontal' });
    expect(parsePrefs(JSON.stringify({ voice: false })).exerciseView).toEqual({ squat: 'frontal', pushUp: 'frontal' });
    expect(parsePrefs(JSON.stringify({ exerciseView: { squat: 'lateral', pushUp: 'diagonal' } })).exerciseView).toEqual({ squat: 'lateral', pushUp: 'frontal' });
    expect(parsePrefs(JSON.stringify({ exerciseView: 'lateral' })).exerciseView).toEqual({ squat: 'frontal', pushUp: 'frontal' });
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
