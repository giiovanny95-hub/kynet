import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFS } from '@/features/profile/prefs';
import { effectiveView } from './exerciseView';

describe('vista efectiva del motor', () => {
  it('jumping jack de frente; flexión de lado hasta F3; sentadilla según la preferencia (frente por defecto)', () => {
    expect(effectiveView('jumpingJack', null)).toBe('frontal');
    expect(effectiveView('pushUp', DEFAULT_PREFS)).toBe('lateral');
    expect(effectiveView('squat', null)).toBe('frontal');
    expect(effectiveView('squat', { ...DEFAULT_PREFS, exerciseView: { squat: 'lateral', pushUp: 'frontal' } })).toBe('lateral');
  });
});
