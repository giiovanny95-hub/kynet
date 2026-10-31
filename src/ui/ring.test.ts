import { describe, expect, it } from 'vitest';

import { ringGeometry, ringPath } from './ring';

describe('ProgressRing: geometría (diseño E1.3)', () => {
  it('0 da trazo vacío y 1 el círculo completo (dos semicírculos que cierran arriba)', () => {
    expect(ringPath(100, 10, 0)).toBe('');
    const full = ringPath(100, 10, 1);
    expect(full.startsWith('M 50 5 ')).toBe(true);
    expect(full.endsWith('50 5')).toBe(true);
    expect(full.match(/A /g)).toHaveLength(2);
  });

  it('media vuelta termina abajo y un cuarto a la derecha', () => {
    expect(ringPath(100, 10, 0.5)).toBe('M 50 5 A 45 45 0 0 1 50.000 95.000');
    expect(ringPath(100, 10, 0.25)).toBe('M 50 5 A 45 45 0 0 1 95.000 50.000');
    expect(ringPath(100, 10, 0.75)).toContain(' 0 1 1 ');
  });

  it('progreso fuera de rango o inválido se recorta', () => {
    expect(ringGeometry(100, 10, 1.7).end).toBe(1);
    expect(ringGeometry(100, 10, -0.2).end).toBe(0);
    expect(ringGeometry(100, 10, Number.NaN).end).toBe(0);
    expect(ringGeometry(100, 10, 0.3)).toMatchObject({ cx: 50, cy: 50, r: 45 });
  });
});
