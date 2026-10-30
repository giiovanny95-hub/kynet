/**
 * Sistema de movimiento (spec-diseno §4). Toda animación pasa por `useMotion()`, que respeta "reducir movimiento".
 * Este archivo es puro (se prueba en Node); las curvas se convierten a `Easing.bezier` en `useMotion`.
 */
export const DURATION = { fast: 120, base: 220, emphasis: 360, celebrate: 700 } as const;

/** Puntos de control de `Easing.bezier(x1, y1, x2, y2)`. */
export const CURVES = {
  standard: [0.2, 0, 0, 1],
  exit: [0.3, 0, 1, 1],
} as const;

/** `bouncy` solo en celebraciones. */
export const SPRING = {
  snappy: { damping: 20, stiffness: 300 },
  gentle: { damping: 18, stiffness: 160 },
  bouncy: { damping: 10, stiffness: 180 },
} as const;

const STAGGER_MS = 40;
const STAGGER_MAX = 6;

/** Retraso de entrada del elemento `i`: 40 ms entre elementos; a partir del séptimo, sin retraso. */
export function stagger(i: number): number {
  return i < STAGGER_MAX ? i * STAGGER_MS : 0;
}

export interface MotionTokens {
  readonly reduced: boolean;
  readonly duration: { readonly [K in keyof typeof DURATION]: number };
  readonly spring: typeof SPRING;
  readonly stagger: (i: number) => number;
  /** Bucles (llama, brillo del esqueleto de carga): nunca con "reducir movimiento". */
  readonly loops: boolean;
}

/** Tokens de movimiento; con `reduced`, duraciones y escalonado a 0 y sin bucles. */
export function motionTokens(reduced: boolean): MotionTokens {
  if (!reduced) return { reduced, duration: DURATION, spring: SPRING, stagger, loops: true };
  return { reduced, duration: { fast: 0, base: 0, emphasis: 0, celebrate: 0 }, spring: SPRING, stagger: () => 0, loops: false };
}
