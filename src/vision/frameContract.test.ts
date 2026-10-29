import { describe, expect, it } from 'vitest';
import { modelSawMirroredPixels } from './frameContract';

describe('modelSawMirroredPixels (contrato nativo → cinemática)', () => {
  it('cámara frontal por defecto: la salida se presenta espejada pero el buffer no lo está', () => {
    expect(modelSawMirroredPixels({ outputMirrored: true, frameIsMirrored: true })).toBe(false);
  });

  it('con rotación física del buffer y salida espejada, el buffer sí está espejado', () => {
    expect(modelSawMirroredPixels({ outputMirrored: true, frameIsMirrored: false })).toBe(true);
  });

  it('cámara trasera sin espejo', () => {
    expect(modelSawMirroredPixels({ outputMirrored: false, frameIsMirrored: false })).toBe(false);
  });
});
