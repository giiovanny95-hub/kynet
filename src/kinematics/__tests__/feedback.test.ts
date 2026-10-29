import { describe, expect, it } from 'vitest';
import { arbiterStep, createArbiter, type ArbiterState } from '../feedback/arbiter';
import { SEVERITY, type FeedbackCode } from '../feedback/codes';

function run(steps: readonly { codes: readonly FeedbackCode[]; tMs: number; rep: number | null }[]) {
  let a: ArbiterState = createArbiter();
  return steps.map((st) => {
    const r = arbiterStep(a, st.codes, st.tMs, st.rep);
    a = r.a;
    return r.event;
  });
}

describe('árbitro de feedback (spec §7)', () => {
  it('con varios códigos en la misma repetición sale solo el de mayor severidad', () => {
    const [ev] = run([{ codes: ['SQ_TOO_FAST', 'SQ_DEPTH_SHALLOW'], tMs: 1000, rep: 1 }]);
    expect(ev?.code).toBe('SQ_DEPTH_SHALLOW');
    expect(ev?.severity).toBe('high');
    expect(ev?.rep).toBe(1);
  });

  it('enfriamiento de 4 s por código', () => {
    const evs = run([
      { codes: ['SQ_TRUNK_LEAN'], tMs: 0, rep: 1 },
      { codes: ['SQ_TRUNK_LEAN'], tMs: 2000, rep: null },
      { codes: ['SQ_TRUNK_LEAN'], tMs: 4100, rep: null },
    ]);
    expect(evs.map((e) => e?.code ?? null)).toEqual(['SQ_TRUNK_LEAN', null, 'SQ_TRUNK_LEAN']);
  });

  it('el mismo código en 3 repeticiones seguidas escala un nivel', () => {
    const evs = run([
      { codes: ['SQ_TOO_FAST'], tMs: 0, rep: 1 },
      { codes: ['SQ_TOO_FAST'], tMs: 5000, rep: 2 },
      { codes: ['SQ_TOO_FAST'], tMs: 10000, rep: 3 },
    ]);
    expect(evs[1]).toMatchObject({ severity: 'low', escalated: false });
    expect(evs[2]).toMatchObject({ code: 'SQ_TOO_FAST', severity: 'medium', escalated: true });
  });

  it('una repetición sin el código rompe la racha de escalado', () => {
    const evs = run([
      { codes: ['SQ_TOO_FAST'], tMs: 0, rep: 1 },
      { codes: ['SQ_TOO_FAST'], tMs: 5000, rep: 2 },
      { codes: [], tMs: 10000, rep: 3 },
      { codes: ['SQ_TOO_FAST'], tMs: 15000, rep: 4 },
    ]);
    expect(evs[3]).toMatchObject({ severity: 'low', escalated: false });
  });

  it('pause no escala', () => {
    const evs = run([
      { codes: ['PU_POSITION'], tMs: 0, rep: 1 },
      { codes: ['PU_POSITION'], tMs: 5000, rep: 2 },
      { codes: ['PU_POSITION'], tMs: 10000, rep: 3 },
    ]);
    expect(evs[2]).toMatchObject({ severity: 'pause', escalated: false });
  });

  it('los códigos de pausa también se enfrían 4 s (una visibilidad que parpadea no inunda el audio)', () => {
    const evs = run([
      { codes: ['VIS_LOW'], tMs: 0, rep: null },
      { codes: ['VIS_LOW'], tMs: 500, rep: null },
      { codes: ['VIS_LOW'], tMs: 4100, rep: null },
    ]);
    expect(evs.map((e) => e?.code ?? null)).toEqual(['VIS_LOW', null, 'VIS_LOW']);
  });

  it('un 10 seguidas del mismo error no inunda: como mucho uno cada 4 s', () => {
    const evs = run(Array.from({ length: 10 }, (_, i) => ({ codes: ['SQ_TRUNK_LEAN'] as const, tMs: i * 1500, rep: i + 1 })));
    const times = evs.flatMap((e) => (e ? [e.tMs] : []));
    for (let i = 1; i < times.length; i++) expect((times[i] ?? 0) - (times[i - 1] ?? 0)).toBeGreaterThanOrEqual(4000);
  });

  it('cada código tiene severidad', () => {
    expect(SEVERITY.JJ_ASYMMETRY).toBe('low');
    expect(SEVERITY.PU_HIPS_SAG).toBe('medium');
    expect(SEVERITY.VIEW_WRONG_SIDE).toBe('pause');
  });
});
