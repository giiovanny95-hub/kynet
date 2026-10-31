import { describe, expect, it } from 'vitest';
import { placeBody, project } from '../tools/gen/camera';

describe('proyección estenopeica (F1.1)', () => {
  const cam = { heightM: 0.9, distanceM: 2.5 };

  it('un punto a la altura de la cámara cae en el centro vertical', () => {
    const p = project(placeBody({ x: 0, y: 0.9, z: 0 }, cam), cam);
    expect(p?.y).toBeCloseTo(0.5, 9);
    expect(p?.x).toBeCloseTo(0.5, 9);
  });

  it('al alejarse, el tamaño se reduce como 1/d', () => {
    const size = (d: number) => {
      const c = { ...cam, distanceM: d };
      const a = project(placeBody({ x: 0, y: 0.4, z: 0 }, c), c);
      const b = project(placeBody({ x: 0, y: 1.4, z: 0 }, c), c);
      return a && b ? a.y - b.y : Number.NaN;
    };
    expect(size(2) / size(4)).toBeCloseTo(2, 9);
    expect(size(2.5) / size(3)).toBeCloseTo(3 / 2.5, 9);
  });

  it('con pitch hacia arriba, un punto a la altura de la cámara baja en la imagen', () => {
    const c = { ...cam, pitchDeg: 10 };
    expect(project(placeBody({ x: 0, y: 0.9, z: 0 }, c), c)?.y ?? 0).toBeGreaterThan(0.5);
  });

  it('la guiñada de 90° pone el ancho del cuerpo en profundidad', () => {
    const c = { ...cam, yawDeg: 90 };
    const l = project(placeBody({ x: -0.19, y: 1.4, z: 0 }, c), c);
    const r = project(placeBody({ x: 0.19, y: 1.4, z: 0 }, c), c);
    expect(Math.abs((l?.x ?? 0) - (r?.x ?? 1))).toBeLessThan(1e-9);
  });

  it('detrás de la cámara no se proyecta', () => {
    expect(project({ x: 0, y: 1, z: -1 }, cam)).toBeNull();
  });
});
