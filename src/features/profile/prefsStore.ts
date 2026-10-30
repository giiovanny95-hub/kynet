import type { LocalStore } from '@/data/types';

import { parsePrefs, type Prefs } from './prefs';

const KEY = 'prefs';
let cache: Prefs | null = null;

/** Última copia leída, para pantallas que no pueden esperar (entrenamiento). */
export function cachedPrefs(): Prefs | null {
  return cache;
}

export async function loadPrefs(store: LocalStore): Promise<Prefs> {
  cache = parsePrefs(await store.getKv(KEY));
  return cache;
}

export async function savePrefs(store: LocalStore, patch: Partial<Prefs>): Promise<Prefs> {
  const next = { ...(await loadPrefs(store)), ...patch };
  await store.setKv(KEY, JSON.stringify(next));
  cache = next;
  return next;
}
