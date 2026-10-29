import { describe, expect, it } from 'vitest';
import { fromFlat, toPose } from '../landmarks/adapter';
import { BLAZEPOSE33 } from '../landmarks/models/blazepose33';
import { MOVENET17 } from '../landmarks/models/movenet17';
import type { FrameMeta, PoseFrame } from '../types';

const META: FrameMeta = { tMs: 0, width: 720, height: 1280, rotation: 0, mirrored: false };

function blazeFlat(overrides: Readonly<Record<number, readonly [number, number, number, number]>>): number[] {
  const p: number[] = [];
  for (let i = 0; i < 33; i++) {
    const o = overrides[i] ?? [0.5, 0.5, 0, 0.9];
    p.push(...o);
  }
  return p;
}

function frame(p: readonly number[], meta: Partial<FrameMeta> = {}): PoseFrame {
  return { meta: { ...META, ...meta }, model: 'blazepose33', raw: fromFlat(p, BLAZEPOSE33) };
}

describe('fromFlat', () => {
  it('MoveNet entrega (y, x, score): intercambia y pone z = 0', () => {
    const p = Array.from({ length: 17 * 3 }, () => 0);
    p[0] = 0.2; p[1] = 0.7; p[2] = 0.8;
    const [nose] = fromFlat(p, MOVENET17);
    expect(nose).toEqual({ x: 0.7, y: 0.2, z: 0, v: 0.8 });
  });

  it('rechaza una longitud que no corresponde al modelo', () => {
    expect(() => fromFlat([1, 2, 3], BLAZEPOSE33)).toThrow(RangeError);
  });
});

describe('toPose', () => {
  it('convierte a unidades de alto de cuadro (x por ancho/alto)', () => {
    const p = blazeFlat({ 25: [0.5, 0.5, 0, 0.9], 27: [0.5 + 0.1 * (1280 / 720), 0.6, 0, 0.9] });
    const pose = toPose(frame(p), BLAZEPOSE33);
    const knee = pose.joints.lKnee;
    const ankle = pose.joints.lAnkle;
    expect(knee && ankle).toBeTruthy();
    expect((ankle?.x ?? 0) - (knee?.x ?? 0)).toBeCloseTo(0.1, 9);
    expect((ankle?.y ?? 0) - (knee?.y ?? 0)).toBeCloseTo(0.1, 9);
  });

  it('con espejo intercambia izquierda y derecha', () => {
    const p = blazeFlat({ 25: [0.3, 0.6, 0, 0.9], 26: [0.7, 0.6, 0, 0.9] });
    const pose = toPose(frame(p, { mirrored: true }), BLAZEPOSE33);
    const scale = 720 / 1280;
    expect(pose.joints.rKnee?.x).toBeCloseTo((1 - 0.3) * scale, 9);
    expect(pose.joints.lKnee?.x).toBeCloseTo((1 - 0.7) * scale, 9);
  });

  it('una coordenada no finita o fuera de rango deja la articulación con v = 0', () => {
    const p = blazeFlat({ 25: [Number.NaN, 0.5, 0, 0.9], 26: [0.5, 2.0, 0, 0.9] });
    const pose = toPose(frame(p), BLAZEPOSE33);
    expect(pose.joints.lKnee?.v).toBe(0);
    expect(pose.joints.rKnee?.v).toBe(0);
  });

  it('una articulación que el modelo no tiene no aparece', () => {
    const raw = fromFlat(Array.from({ length: 17 * 3 }, () => 0.5), MOVENET17);
    const pose = toPose({ meta: META, model: 'movenet17', raw }, MOVENET17);
    expect(pose.joints.lHeel).toBeUndefined();
    expect(pose.joints.lKnee).toBeDefined();
  });

  it('calcula la longitud del torso entre puntos medios de hombros y caderas', () => {
    const p = blazeFlat({
      11: [0.4, 0.3, 0, 0.9], 12: [0.6, 0.3, 0, 0.9],
      23: [0.4, 0.6, 0, 0.9], 24: [0.6, 0.6, 0, 0.9],
    });
    expect(toPose(frame(p), BLAZEPOSE33).torso).toBeCloseTo(0.3, 9);
  });

  it('rotación de 90 grados lleva el cuadro apaisado a vertical', () => {
    // width/height son las medidas ya en vertical (spec §1). Rotación 90: (x, y) del sensor pasa a (1 - y, x).
    const p = blazeFlat({ 0: [0.25, 0.5, 0, 0.9] });
    const pose = toPose(frame(p, { rotation: 90 }), BLAZEPOSE33);
    expect(pose.joints.nose?.x).toBeCloseTo(0.5 * (720 / 1280), 9);
    expect(pose.joints.nose?.y).toBeCloseTo(0.25, 9);
  });
});
