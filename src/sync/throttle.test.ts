import { describe, expect, it } from 'vitest';

import { FOCUS_SYNC_GAP_MS, syncDue } from './throttle';

describe('sincronizar al enfocar una pantalla', () => {
  it('la primera vez siempre; después, solo pasados 30 s', () => {
    expect(FOCUS_SYNC_GAP_MS).toBe(30_000);
    expect(syncDue(null, 1000)).toBe(true);
    expect(syncDue(1000, 1000 + 29_999)).toBe(false);
    expect(syncDue(1000, 1000 + 30_000)).toBe(true);
  });

  it('si el reloj del teléfono retrocede, no se queda bloqueada', () => {
    expect(syncDue(50_000, 10_000)).toBe(true);
  });
});
