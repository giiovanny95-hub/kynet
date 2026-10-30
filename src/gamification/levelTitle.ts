/** Título y rango de un nivel (spec-diseno §7). Solo visual: no cambia XP ni reglas. Claves de i18n. */
export interface LevelTitle {
  readonly titleKey: string;
  readonly rankKey: string;
}

const TIERS: readonly { readonly from: number; readonly title: string; readonly rank: string }[] = [
  { from: 15, title: 'legend', rank: 'diamond' },
  { from: 10, title: 'elite', rank: 'platinum' },
  { from: 6, title: 'athlete', rank: 'gold' },
  { from: 3, title: 'explorer', rank: 'silver' },
  { from: 1, title: 'novice', rank: 'bronze' },
];

export function levelTitle(level: number): LevelTitle {
  const tier = TIERS.find((t) => level >= t.from) ?? TIERS[TIERS.length - 1]!;
  return { titleKey: `level.title.${tier.title}`, rankKey: `level.rank.${tier.rank}` };
}
