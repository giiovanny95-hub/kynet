import { createMemoryStore } from './memoryStore';
import type { LocalStore } from './types';

/**
 * Almacén local de la app. Hasta instalar `expo-sqlite` (pendiente de aprobación) es la versión en memoria: los datos
 * se pierden al cerrar la app. Al cambiarlo por SQLite, ninguna pantalla cambia.
 */
let store: LocalStore | null = null;

export function getStore(): LocalStore {
  store ??= createMemoryStore();
  return store;
}
