/** Lo que `haptics.ts` usa de `expo-haptics`; en los tests se sustituye por un doble. */
export interface HapticDriver {
  selection(): Promise<void>;
  impactLight(): Promise<void>;
  success(): Promise<void>;
  warning(): Promise<void>;
}

export interface Haptics {
  /** Pulsar un control. */
  tap(): void;
  /** Repetición contada. */
  rep(): void;
  /** Logro: sesión terminada, misión o nivel. */
  success(): void;
  /** Aviso de forma o de encuadre. */
  warning(): void;
}

/** Vibraciones que respetan la preferencia `haptics` (se consulta en cada llamada) y nunca lanzan errores. */
export function makeHaptics(driver: HapticDriver, enabled: () => boolean): Haptics {
  const run = (f: () => Promise<void>) => {
    if (enabled()) f().catch(() => undefined);
  };
  return {
    tap: () => run(() => driver.selection()),
    rep: () => run(() => driver.impactLight()),
    success: () => run(() => driver.success()),
    warning: () => run(() => driver.warning()),
  };
}
