import { describe, expect, it } from 'vitest';
import { createEngine, step, type EngineEvent } from '../engine';
import type { FeedbackEvent } from '../feedback/codes';
import { BLAZEPOSE33 } from '../landmarks/models/blazepose33';
import { genJumpingJack } from '../tools/gen/jumpingJack';
import { genSquat } from '../tools/gen/squat';
import type { PoseFrame } from '../types';

function run(frames: readonly PoseFrame[], exercise: 'squat' | 'jumpingJack' = 'squat') {
  let s = createEngine({ exercise, model: BLAZEPOSE33 });
  const events: EngineEvent[] = [];
  let paused = false;
  for (const f of frames) {
    const r = step(s, f);
    s = r.s;
    events.push(...r.events);
    paused = paused || r.hud.paused;
  }
  return { events, paused };
}

const fb = (evs: readonly EngineEvent[]): FeedbackEvent[] => evs.flatMap((e) => (e.type === 'FEEDBACK' ? [e] : []));
const validCount = (evs: readonly EngineEvent[]) => evs.filter((e) => e.type === 'REP' && e.outcome === 'valid').length;
const opts = { reps: 2, bottomsDeg: 88, periodS: 2.5, sigma: 0, seed: 1, fps: 30 } as const;

describe('validación de vista y encuadre (spec §2)', () => {
  it('sentadilla de frente durante 2 s: PAUSE y VIEW_WRONG_SIDE, sin válidas', () => {
    const { events } = run(genSquat({ ...opts, yawDeg: 0, standS: 2 }));
    expect(events.some((e) => e.type === 'PAUSE')).toBe(true);
    expect(fb(events).map((e) => e.code)).toContain('VIEW_WRONG_SIDE');
    expect(validCount(events)).toBe(0);
  });

  it('vista incorrecta solo 0,5 s no pausa', () => {
    const front = genSquat({ ...opts, yawDeg: 0 });
    const side = genSquat(opts);
    const { events, paused } = run([...front.slice(0, 15), ...side.slice(15)]);
    expect(paused).toBe(false);
    expect(validCount(events)).toBe(2);
  });

  it('jumping jack de lado pausa con JJ_FACE_CAMERA', () => {
    const frames = genJumpingJack({ reps: 3, periodS: 0.8, sigma: 0, seed: 2, fps: 30 }).map((f) => ({
      ...f,
      // Gira a perfil: los puntos derechos se superponen a los izquierdos.
      raw: f.raw.map((lm, i, all) => (i >= 11 && i % 2 === 0 ? { ...lm, x: (all[i - 1]?.x ?? lm.x) - 0.005 } : lm)),
    }));
    const { events } = run(frames, 'jumpingJack');
    expect(fb(events).map((e) => e.code)).toContain('JJ_FACE_CAMERA');
  });

  it('un tobillo al borde inferior pausa con OUT_OF_FRAME', () => {
    const frames = genSquat(opts).map((f) => ({
      ...f,
      raw: f.raw.map((lm, i) => (i === 27 || i === 28 ? { ...lm, y: 0.995 } : lm)),
    }));
    const { events } = run(frames);
    expect(events.some((e) => e.type === 'PAUSE')).toBe(true);
    expect(fb(events).map((e) => e.code)).toContain('OUT_OF_FRAME');
  });

  it('la pausa por visibilidad avisa con VIS_LOW', () => {
    const frames = genSquat(opts).map((f, i) => (i > 40 && i < 60 ? { ...f, raw: f.raw.map((lm) => ({ ...lm, v: 0.2 })) } : f));
    expect(fb(run(frames).events).map((e) => e.code)).toContain('VIS_LOW');
  });
});
