import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFS } from './prefs';
import { stepAfterLogin } from './onboardingSteps';

describe('bienvenida "Ya tengo cuenta" (H6)', () => {
  it('sin fecha de nacimiento local se pide la edad aunque haya sesión', () => {
    expect(stepAfterLogin(DEFAULT_PREFS)).toBe('birth');
    expect(stepAfterLogin({ ...DEFAULT_PREFS, onboardedAt: '2026-10-30' })).toBe('birth');
  });
  it('con fecha local sigue en el nivel, o termina si el onboarding ya se hizo', () => {
    expect(stepAfterLogin({ ...DEFAULT_PREFS, birthDate: '1990-01-01' })).toBe('level');
    expect(stepAfterLogin({ ...DEFAULT_PREFS, birthDate: '1990-01-01', onboardedAt: '2026-10-30' })).toBe('done');
  });
});
