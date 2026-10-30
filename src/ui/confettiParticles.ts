/** Partículas del `Confetti` (spec-diseno §4): puro y determinista con semilla, probado sin Skia. */
export interface Particle {
  /** Salida (fracción del ancho y alto del lienzo). */
  readonly x0: number;
  readonly y0: number;
  /** Velocidad inicial en fracción del lienzo por segundo; la gravedad tira hacia abajo. */
  readonly vx: number;
  readonly vy: number;
  /** Giro en vueltas por segundo y tamaño en px. */
  readonly spin: number;
  readonly size: number;
  readonly color: string;
  readonly lifeMs: number;
}

export const CONFETTI_COUNT = 60;
export const CONFETTI_MAX_LIFE_MS = 1200;
export const GRAVITY = 1.6;

/** PRNG mulberry32: misma semilla, mismas partículas (la animación es repetible y se puede probar). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ráfaga desde el centro superior hacia arriba y a los lados, con los colores de marca que se le pasen. */
export function confettiParticles(seed: number, colors: readonly string[], count = CONFETTI_COUNT): Particle[] {
  const r = rng(seed);
  const out: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (-Math.PI / 2) + (r() - 0.5) * (Math.PI * 0.9);
    const speed = 0.7 + r() * 0.8;
    out.push({
      x0: 0.5 + (r() - 0.5) * 0.2,
      y0: 0.35 + (r() - 0.5) * 0.1,
      vx: Math.cos(angle) * speed * 0.6,
      vy: Math.sin(angle) * speed,
      spin: (r() - 0.5) * 3,
      size: 6 + r() * 6,
      color: colors[i % colors.length] ?? '#000000',
      lifeMs: 800 + r() * (CONFETTI_MAX_LIFE_MS - 800),
    });
  }
  return out;
}

/** Posición y opacidad de una partícula a los `tMs` (fracción del lienzo); se desvanece en su último 30 %. */
export function particleAt(p: Particle, tMs: number): { x: number; y: number; angle: number; alpha: number } {
  'worklet';
  const t = Math.min(tMs, p.lifeMs) / 1000;
  const fade = Math.min(1, Math.max(0, (p.lifeMs - tMs) / (p.lifeMs * 0.3)));
  return { x: p.x0 + p.vx * t, y: p.y0 + p.vy * t + 0.5 * GRAVITY * t * t, angle: p.spin * t * 2 * Math.PI, alpha: tMs >= p.lifeMs ? 0 : fade };
}
