import { describe, expect, it } from 'vitest';

import { makeHaptics, type HapticDriver } from './hapticsCore';

function fakeDriver(calls: string[], fail = false): HapticDriver {
  const f = (name: string) => () => {
    calls.push(name);
    return fail ? Promise.reject(new Error('sin motor de vibración')) : Promise.resolve();
  };
  return { selection: f('selection'), impactLight: f('impactLight'), success: f('success'), warning: f('warning') };
}

describe('vibraciones (diseño E0.4)', () => {
  it('cada evento usa su patrón', () => {
    const calls: string[] = [];
    const h = makeHaptics(fakeDriver(calls), () => true);
    h.tap();
    h.rep();
    h.success();
    h.warning();
    expect(calls).toEqual(['selection', 'impactLight', 'success', 'warning']);
  });

  it('con la preferencia desactivada no vibra, y se consulta en cada llamada', () => {
    const calls: string[] = [];
    let on = false;
    const h = makeHaptics(fakeDriver(calls), () => on);
    h.tap();
    on = true;
    h.tap();
    expect(calls).toEqual(['selection']);
  });

  it('un error del motor de vibración no se propaga', async () => {
    const h = makeHaptics(fakeDriver([], true), () => true);
    expect(() => h.success()).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
  });
});
