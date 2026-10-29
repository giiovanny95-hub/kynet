import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { EngineEvent, ScoredRep } from '@/kinematics/engine';
import { cueFor } from './feedbackCues';
import { TONES, wavInfo, toneWav } from './tones';

const rep = (o: Partial<ScoredRep>): ScoredRep => ({
  type: 'REP', outcome: 'valid', tStartMs: 0, tBottomMs: 1000, tEndMs: 2000, durationMs: 2000, downMs: 1000, upMs: 1000,
  extreme: 90, top: 172, extreme2: null, code: null, faults: [], quality: 'Good', ...o,
});
const fb = (severity: 'low' | 'medium' | 'high' | 'pause'): EngineEvent => ({ type: 'FEEDBACK', code: 'SQ_TRUNK_LEAN', severity, escalated: false, tMs: 0, rep: 1 });

describe('señales de sonido y vibración', () => {
  it('repetición válida: rep + light; Perfect: perfect + medium', () => {
    expect(cueFor(rep({}))).toEqual({ sound: 'rep', haptic: 'light' });
    expect(cueFor(rep({ quality: 'Perfect' }))).toEqual({ sound: 'perfect', haptic: 'medium' });
  });

  it('incompleta y falta: warn', () => {
    expect(cueFor(rep({ outcome: 'incomplete', quality: 'Miss' })).sound).toBe('warn');
    expect(cueFor(rep({ outcome: 'fault', quality: 'Miss' })).sound).toBe('warn');
  });

  it('feedback por severidad', () => {
    expect(cueFor(fb('high'))).toEqual({ sound: 'warn', haptic: 'warning' });
    expect(cueFor(fb('pause'))).toEqual({ sound: 'warn', haptic: 'warning' });
    expect(cueFor(fb('medium'))).toEqual({ sound: null, haptic: 'light' });
    expect(cueFor(fb('low'))).toEqual({ sound: null, haptic: null });
  });

  it('otros eventos no suenan', () => {
    expect(cueFor({ type: 'PAUSE', tMs: 0 })).toEqual({ sound: null, haptic: null });
  });
});

describe('tonos', () => {
  for (const name of Object.keys(TONES) as (keyof typeof TONES)[]) {
    it(`${name}: WAV PCM 16 bits a 48 kHz de menos de 150 ms (generado y versionado)`, () => {
      const gen = wavInfo(toneWav(TONES[name]));
      expect(gen).toMatchObject({ riff: true, sampleRate: 48000, bitsPerSample: 16, channels: 1 });
      expect(gen.durationMs).toBeLessThan(150);
      const file = readFileSync(`assets/audio/tone-${name}.wav`);
      expect(Buffer.compare(file, Buffer.from(toneWav(TONES[name])))).toBe(0);
    });
  }
});
