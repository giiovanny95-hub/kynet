import { describe, expect, it } from 'vitest';
import type { EngineEvent, ScoredRep } from '@/kinematics/engine';
import type { Quality } from '@/kinematics/scoring/quality';
import { createToneState, toneAt, toneStep, type ToneState } from './formTone';

const rep = (quality: Quality, outcome: ScoredRep['outcome'] = 'valid'): ScoredRep => ({
  type: 'REP', outcome, tStartMs: 0, tBottomMs: 1000, tEndMs: 2000, durationMs: 2000, downMs: 1000, upMs: 1000,
  extreme: 90, top: 172, extreme2: null, code: null, faults: [], quality,
});
const fb = (severity: 'low' | 'medium' | 'high' | 'pause'): EngineEvent => ({ type: 'FEEDBACK', code: 'SQ_TRUNK_LEAN', severity, escalated: false, tMs: 0, rep: 1 });
const feed = (pairs: readonly [EngineEvent, number][]): ToneState => pairs.reduce((s, [e, t]) => toneStep(s, e, t), createToneState());

describe('tono de forma del borde', () => {
  it('sin repeticiones es neutral', () => {
    expect(toneAt(createToneState(), 0, 'active')).toBe('neutral');
  });
  it('Perfect y Great → good; Good → warn; incompleta → bad', () => {
    expect(toneAt(feed([[rep('Perfect'), 0]]), 10, 'active')).toBe('good');
    expect(toneAt(feed([[rep('Great'), 0]]), 10, 'active')).toBe('good');
    expect(toneAt(feed([[rep('Good'), 0]]), 10, 'active')).toBe('warn');
    expect(toneAt(feed([[rep('Miss', 'incomplete'), 0]]), 10, 'active')).toBe('bad');
  });
  it('un aviso medium dura 2000 ms y vuelve al tono de la repetición', () => {
    const s = feed([[rep('Perfect'), 0], [fb('medium'), 0]]);
    expect(toneAt(s, 1999, 'active')).toBe('warn');
    expect(toneAt(s, 2001, 'active')).toBe('good');
  });
  it('un aviso high es bad y uno low no cambia el tono', () => {
    expect(toneAt(feed([[rep('Perfect'), 0], [fb('high'), 0]]), 100, 'active')).toBe('bad');
    expect(toneAt(feed([[rep('Perfect'), 0], [fb('low'), 0]]), 100, 'active')).toBe('good');
  });
  it('dos avisos seguidos no parpadean: el segundo alarga el tono', () => {
    expect(toneAt(feed([[fb('medium'), 0], [fb('medium'), 1500]]), 3000, 'active')).toBe('warn');
  });
  it('fuera de active es neutral', () => {
    expect(toneAt(feed([[rep('Perfect'), 0]]), 10, 'rest')).toBe('neutral');
  });
});
