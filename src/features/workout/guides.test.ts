import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFS } from '@/features/profile/prefs';
import { GUIDE_MANIFEST, guideFor, shouldShowFirstGuide, type GuideManifest } from './guides';

describe('manifiesto de guías (H2)', () => {
  it('los 3 ejercicios tienen guía en cada vista válida', () => {
    expect(guideFor('jumpingJack', 'frontal')?.key).toBe('jumping-jack');
    for (const view of ['frontal', 'lateral'] as const) {
      expect(guideFor('squat', view)?.key).toBe('squat');
      expect(guideFor('pushUp', view)?.key).toBe('push-up');
    }
  });
  it('cada guía declara la duración del bucle medida (4800 ms)', () => {
    for (const ex of ['squat', 'pushUp', 'jumpingJack'] as const) expect(guideFor(ex, 'frontal')?.loopMs).toBe(4800);
  });
  it('la variante por vista gana a la común, y sin archivo devuelve null', () => {
    const m: GuideManifest = {
      ...GUIDE_MANIFEST,
      squat: { any: { key: 'squat', loopMs: 1000 }, lateral: { key: 'squat', loopMs: 2000 } },
      pushUp: {},
    };
    expect(guideFor('squat', 'frontal', m)?.loopMs).toBe(1000);
    expect(guideFor('squat', 'lateral', m)?.loopMs).toBe(2000);
    expect(guideFor('pushUp', 'lateral', m)).toBeNull();
  });
});

describe('"Así se hace" antes de cada ejercicio (H3, decisión del usuario)', () => {
  const base = { ...DEFAULT_PREFS };
  it('se muestra con ayudas activas, guía disponible y sin haberla visto', () => {
    expect(shouldShowFirstGuide(base, 'jumpingJack', 'frontal')).toBe(true);
  });
  it('se muestra aunque ya se haya visto; no con las ayudas apagadas ni sin guía', () => {
    expect(shouldShowFirstGuide({ ...base, guideSeen: { ...base.guideSeen, jumpingJack: true } }, 'jumpingJack', 'frontal')).toBe(true);
    expect(shouldShowFirstGuide({ ...base, techniqueHelp: false }, 'squat', 'lateral')).toBe(false);
    expect(shouldShowFirstGuide(base, 'pushUp', 'lateral', { ...GUIDE_MANIFEST, pushUp: {} })).toBe(false);
  });
  it('sin preferencias cargadas usa los valores por defecto', () => {
    expect(shouldShowFirstGuide(null, 'squat', 'frontal')).toBe(true);
  });
});
