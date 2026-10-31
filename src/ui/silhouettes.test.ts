import { describe, expect, it } from 'vitest';
import { EXERCISES } from '@/features/workout/plans';
import { toOverlayBones } from '@/vision/overlay';
import { silhouetteFor } from './silhouettes';

const ASPECT = 0.75; // cuadro vertical 3:4

describe('siluetas guía', () => {
  for (const ex of EXERCISES) {
    it(`${ex}: 132 valores, puntos visibles dentro del cuadro y al menos 10 huesos`, () => {
      const s = silhouetteFor(ex);
      expect(s).toHaveLength(132);
      for (let i = 0; i < 33; i++) {
        if ((s[i * 4 + 3] ?? 0) === 0) continue;
        for (const v of [s[i * 4] ?? -1, s[i * 4 + 1] ?? -1]) {
          expect(v).toBeGreaterThanOrEqual(0.05);
          expect(v).toBeLessThanOrEqual(0.95);
        }
      }
      expect(toOverlayBones(s, 400, 800, false, ASPECT).length / 2).toBeGreaterThanOrEqual(10);
    });
  }

  it('flexión: hombro→tobillo a menos de 30° de la horizontal (en unidades de alto)', () => {
    const s = silhouetteFor('pushUp');
    const dx = ((s[27 * 4] ?? 0) - (s[11 * 4] ?? 0)) * ASPECT;
    const dy = (s[27 * 4 + 1] ?? 0) - (s[11 * 4 + 1] ?? 0);
    expect((Math.atan2(Math.abs(dy), Math.abs(dx)) * 180) / Math.PI).toBeLessThan(30);
  });
});
