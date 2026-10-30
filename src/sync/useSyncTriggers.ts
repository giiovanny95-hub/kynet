import { useEffect } from 'react';
import { AppState } from 'react-native';

import { runSync } from './syncService';

const INTERVAL_MS = 15 * 60_000;

/** Disparadores de la cola (spec-datos-supabase §4.3): al abrir, al volver a primer plano y cada 15 min. */
export function useSyncTriggers(): void {
  useEffect(() => {
    const go = () => void runSync().catch(() => undefined);
    go();
    const id = setInterval(go, INTERVAL_MS);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && go());
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, []);
}
