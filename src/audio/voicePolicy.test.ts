import { describe, expect, it } from 'vitest';
import type { EngineEvent, ScoredRep } from '@/kinematics/engine';
import { pickUtterance, shouldSpeak, type Utterance } from './voicePolicy';

const rep: ScoredRep = {
  type: 'REP', outcome: 'valid', tStartMs: 0, tBottomMs: 1000, tEndMs: 2000, durationMs: 2000, downMs: 1000, upMs: 1000,
  extreme: 90, top: 172, extreme2: null, code: null, faults: [], quality: 'Great',
};
const fb = (severity: 'low' | 'medium' | 'high' | 'pause', code: 'SQ_DEPTH_SHALLOW' | 'SQ_TRUNK_LEAN' = 'SQ_DEPTH_SHALLOW'): EngineEvent =>
  ({ type: 'FEEDBACK', code, severity, escalated: false, tMs: 0, rep: 1 });
const ctx = (repsInSet: number, repsPerSet = 10) => ({ repsInSet, repsPerSet });

describe('qué dice la voz', () => {
  it('una repetición solo se cuenta en múltiplos de 5', () => {
    expect(pickUtterance([rep], ctx(3))).toBeNull();
    expect(pickUtterance([rep], ctx(5))).toEqual({ key: 'voice.count', params: { n: 5 }, priority: 0 });
  });
  it('la última repetición de la serie dice "Serie completa"', () => {
    expect(pickUtterance([rep], ctx(10, 10))).toEqual({ key: 'voice.setDone', priority: 0 });
  });
  it('en el mismo lote, una corrección gana al conteo', () => {
    expect(pickUtterance([rep, fb('high')], ctx(5))).toEqual({ key: 'feedback.SQ_DEPTH_SHALLOW', priority: 2 });
  });
  it('avisos medium hablan con prioridad 1 y low no hablan', () => {
    expect(pickUtterance([fb('medium', 'SQ_TRUNK_LEAN')], ctx(1))).toEqual({ key: 'feedback.SQ_TRUNK_LEAN', priority: 1 });
    expect(pickUtterance([fb('low')], ctx(1))).toBeNull();
  });
});

describe('cuándo habla', () => {
  const count: Utterance = { key: 'voice.count', params: { n: 5 }, priority: 0 };
  const medium: Utterance = { key: 'feedback.SQ_TRUNK_LEAN', priority: 1 };
  const high: Utterance = { key: 'feedback.SQ_DEPTH_SHALLOW', priority: 2 };
  it('sin frase en curso habla', () => {
    expect(shouldSpeak(null, count, 0, true)).toBe(true);
    expect(shouldSpeak({ priority: 2, untilMs: 100 }, count, 200, true)).toBe(true);
  });
  it('una corrección no la corta un conteo ni otra de igual prioridad', () => {
    expect(shouldSpeak({ priority: 2, untilMs: 1000 }, count, 0, true)).toBe(false);
    expect(shouldSpeak({ priority: 2, untilMs: 1000 }, high, 0, true)).toBe(false);
  });
  it('una corrección corta un conteo', () => {
    expect(shouldSpeak({ priority: 0, untilMs: 1000 }, medium, 0, true)).toBe(true);
  });
  it('con la voz apagada nunca habla', () => {
    expect(shouldSpeak(null, high, 0, false)).toBe(false);
  });
});
