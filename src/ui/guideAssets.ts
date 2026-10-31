import type { GuideKey } from '@/features/workout/guides';
import jumpingJack from '../../assets/guides/jumping-jack.webp';
import pushUp from '../../assets/guides/push-up.webp';
import squat from '../../assets/guides/squat.webp';

/** Archivos de `assets/guides/` (H1). Fuera de `guides.ts` porque los tests de Node no resuelven imágenes. */
export const GUIDE_SOURCES: Record<GuideKey, number> = { 'jumping-jack': jumpingJack, squat, 'push-up': pushUp };
