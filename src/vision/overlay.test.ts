import { describe, expect, it } from 'vitest';
import { toOverlayPoints } from './overlay';

function flatWith(index: number, x: number, y: number, v: number): Float32Array {
  const f = new Float32Array(132);
  f.set([x, y, 0, v], index * 4);
  return f;
}

describe('toOverlayPoints', () => {
  it('escala a píxeles de la vista y omite puntos poco visibles', () => {
    const pts = toOverlayPoints(flatWith(0, 0.25, 0.5, 0.9), 400, 800, false);
    expect(pts).toEqual([{ x: 100, y: 400 }]);
  });

  it('con vista previa espejada invierte x solo para dibujar', () => {
    expect(toOverlayPoints(flatWith(0, 0.25, 0.5, 0.9), 400, 800, true)).toEqual([{ x: 300, y: 400 }]);
  });

  it('sin persona no dibuja nada', () => {
    expect(toOverlayPoints(undefined, 400, 800, false)).toEqual([]);
  });
});
