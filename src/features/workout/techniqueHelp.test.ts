import { describe, expect, it } from 'vitest';
import type { EngineEvent, ScoredRep } from '@/kinematics/engine';
import type { FeedbackCode } from '@/kinematics/feedback/codes';
import { createHelp, helpStep, HELP_COOLDOWN_MS, type HelpOptions, type HelpState } from './techniqueHelp';

const rep = (outcome: ScoredRep['outcome'], faults: FeedbackCode[] = []): EngineEvent => ({
  type: 'REP', outcome, faults, tStartMs: 0, tBottomMs: null, tEndMs: 0, durationMs: 0, downMs: null, upMs: null,
  extreme: 0, top: null, extreme2: null, code: null,
});
const BAD = rep('incomplete', ['SQ_DEPTH' as FeedbackCode]);
const SOFT = rep('valid', ['SQ_KNEES_IN' as FeedbackCode]);
const CLEAN = rep('valid');
const ON: HelpOptions = { enabled: true, hasGuide: true };

/** Pasa los eventos (uno por segundo desde `t0`) y cuenta las ayudas. */
function run(events: EngineEvent[], opts = ON, t0 = 0, s0: HelpState = createHelp()) {
  let s = s0;
  const shown: (FeedbackCode | null)[] = [];
  events.forEach((e, i) => {
    const r = helpStep(s, e, t0 + i * 1000, opts);
    s = r.s;
    if (r.show) shown.push(r.code);
  });
  return { s, shown };
}

describe('ayuda tras 3 correcciones seguidas (H4)', () => {
  it('3 seguidas (incompleta, falta o válida con falta de forma) dan 1 ayuda con el código de la última', () => {
    const r = run([BAD, rep('fault', ['PU_HIPS' as FeedbackCode]), SOFT]);
    expect(r.shown).toEqual(['SQ_KNEES_IN']);
    expect(r.s.streak).toBe(0);
  });
  it('2 seguidas, una limpia y 2 más no dan ayuda', () => {
    expect(run([BAD, BAD, CLEAN, BAD, BAD]).shown).toEqual([]);
  });
  it('PAUSE, RESUME y REP_ABANDONED ni cuentan ni reinician', () => {
    const p: EngineEvent = { type: 'PAUSE', tMs: 0 };
    const q: EngineEvent = { type: 'RESUME', tMs: 0 };
    const a: EngineEvent = { type: 'REP_ABANDONED', tMs: 0 };
    expect(run([BAD, p, q, a, BAD, BAD]).shown).toHaveLength(1);
  });
  it('una segunda racha antes de 60 s no da ayuda; después de 60 s, sí', () => {
    const first = run([BAD, BAD, BAD]);
    expect(run([BAD, BAD, BAD], ON, 10_000, first.s).shown).toEqual([]);
    expect(run([BAD, BAD, BAD], ON, 2000 + HELP_COOLDOWN_MS, first.s).shown).toHaveLength(1);
  });
  it('con las ayudas apagadas o sin guía no hay ayuda', () => {
    expect(run([BAD, BAD, BAD], { enabled: false, hasGuide: true }).shown).toEqual([]);
    expect(run([BAD, BAD, BAD], { enabled: true, hasGuide: false }).shown).toEqual([]);
  });
});
