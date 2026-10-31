/**
 * Adaptador de almacenamiento para la sesión de Supabase sobre un almacén seguro con límite por valor (SecureStore:
 * ~2 KB). Guarda el valor en trozos `clave.0`, `clave.1`… y el número de trozos en `clave.n`.
 */
export interface KeyValueBackend {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  deleteItem(key: string): Promise<void>;
}

export interface AsyncStorageLike {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** SecureStore solo admite letras, números, `.`, `-` y `_` en las claves. */
function safe(key: string): string {
  return key.replace(/[^\w.-]/g, '_');
}

export function createChunkedStorage(backend: KeyValueBackend, chunkSize = 1800): AsyncStorageLike {
  const countKey = (k: string) => `${safe(k)}.n`;
  const partKey = (k: string, i: number) => `${safe(k)}.${i}`;
  const count = async (k: string) => Number((await backend.getItem(countKey(k))) ?? '0') || 0;

  return {
    async getItem(key) {
      const n = await count(key);
      if (n === 0) return null;
      const parts: string[] = [];
      for (let i = 0; i < n; i++) {
        const p = await backend.getItem(partKey(key, i));
        if (p === null) return null;
        parts.push(p);
      }
      return parts.join('');
    },
    async setItem(key, value) {
      const old = await count(key);
      const n = Math.max(1, Math.ceil(value.length / chunkSize));
      for (let i = 0; i < n; i++) await backend.setItem(partKey(key, i), value.slice(i * chunkSize, (i + 1) * chunkSize));
      await backend.setItem(countKey(key), String(n));
      for (let i = n; i < old; i++) await backend.deleteItem(partKey(key, i));
    },
    async removeItem(key) {
      const n = await count(key);
      for (let i = 0; i < n; i++) await backend.deleteItem(partKey(key, i));
      await backend.deleteItem(countKey(key));
    },
  };
}
