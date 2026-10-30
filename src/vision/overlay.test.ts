import { describe, expect, it } from 'vitest';
import { toOverlayBones, toOverlayPoints } from './overlay';

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

  it('con un cuadro 3:4 en una vista más alta descuenta el recorte lateral de la vista previa', () => {
    // Vista 400×800, cuadro 3:4: se muestra a 600×800 y se recortan 100 px por lado.
    expect(toOverlayPoints(flatWith(0, 0.25, 0.5, 0.9), 400, 800, false, 3 / 4)).toEqual([{ x: 50, y: 400 }]);
    expect(toOverlayPoints(flatWith(0, 0.25, 0.5, 0.9), 400, 800, true, 3 / 4)).toEqual([{ x: 350, y: 400 }]);
  });

  it('con un cuadro más alto que la vista recorta arriba y abajo', () => {
    // Vista 400×400, cuadro 1:2: se muestra a 400×800 y se recortan 200 px arriba y abajo.
    expect(toOverlayPoints(flatWith(0, 0.5, 0.25, 0.9), 400, 400, false, 1 / 2)).toEqual([{ x: 200, y: 0 }]);
  });

  it('sin persona no dibuja nada', () => {
    expect(toOverlayPoints(undefined, 400, 800, false)).toEqual([]);
  });

  it('no dibuja orejas ni los puntos de la mano, que Pose solo aproxima', () => {
    // Medido en el S26 Ultra con lite y full: 17-22 caen en la palma y las orejas a la altura de los ojos.
    for (const hidden of [7, 8, 17, 18, 19, 20, 21, 22]) {
      expect(toOverlayPoints(flatWith(hidden, 0.25, 0.5, 0.9), 400, 800, false)).toEqual([]);
    }
    expect(toOverlayPoints(flatWith(15, 0.25, 0.5, 0.9), 400, 800, false)).toEqual([{ x: 100, y: 400 }]);
  });
});

describe('toOverlayBones', () => {
  it('devuelve los extremos de cada hueso visible, en pares', () => {
    const f = flatWith(11, 0.25, 0.25, 0.9);
    f.set([0.25, 0.5, 0, 0.9], 13 * 4);
    f.set([0.5, 0.5, 0, 0.2], 15 * 4); // muñeca poco visible: el antebrazo no se dibuja
    expect(toOverlayBones(f, 400, 800, false, 0.5, [[11, 13], [13, 15]])).toEqual([{ x: 100, y: 200 }, { x: 100, y: 400 }]);
  });

  it('sin lista de huesos usa la de BlazePose33', () => {
    const f = flatWith(11, 0.25, 0.25, 0.9);
    f.set([0.75, 0.25, 0, 0.9], 12 * 4);
    expect(toOverlayBones(f, 400, 800, false, 0.5)).toEqual([{ x: 100, y: 200 }, { x: 300, y: 200 }]);
  });

  it('sin landmarks no hay huesos', () => {
    expect(toOverlayBones(undefined, 400, 800, false, 0.5, [[11, 13]])).toEqual([]);
  });
});
