import type { EngineEvent } from '@/kinematics/engine';
import type { ToneName } from './tones';

export type HapticCue = 'light' | 'medium' | 'warning';

/** Sonido y vibración de cada evento del motor (sin estado: el árbitro ya limita la frecuencia de avisos). */
export function cueFor(event: EngineEvent): { sound: ToneName | null; haptic: HapticCue | null } {
  if (event.type === 'REP') {
    if (event.outcome !== 'valid') return { sound: 'warn', haptic: null };
    return event.quality === 'Perfect' ? { sound: 'perfect', haptic: 'medium' } : { sound: 'rep', haptic: 'light' };
  }
  if (event.type === 'FEEDBACK') {
    if (event.severity === 'high' || event.severity === 'pause') return { sound: 'warn', haptic: 'warning' };
    if (event.severity === 'medium') return { sound: null, haptic: 'light' };
  }
  return { sound: null, haptic: null };
}
