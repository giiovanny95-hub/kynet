import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';

import { createChunkedStorage } from './chunkedStorage';

/** URL y clave publicable por variables de entorno (`.env.local` o EAS); la seguridad la ponen RLS y las RPC. */
const URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

let client: SupabaseClient | null = null;

/** Cliente de Supabase, o `null` si la app se compiló sin configuración (entonces todo funciona solo en local). */
export function getSupabase(): SupabaseClient | null {
  if (URL === '' || KEY === '') return null;
  if (client === null) {
    client = createClient(URL, KEY, {
      auth: {
        // La sesión (tokens) va cifrada en SecureStore, troceada por su límite de ~2 KB por valor.
        storage: createChunkedStorage({
          getItem: (k) => SecureStore.getItemAsync(k),
          setItem: (k, v) => SecureStore.setItemAsync(k, v),
          deleteItem: (k) => SecureStore.deleteItemAsync(k),
        }),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        lock: processLock,
      },
    });
    const c = client;
    // En React Native el refresco automático solo debe correr con la app en primer plano.
    AppState.addEventListener('change', (s) => void (s === 'active' ? c.auth.startAutoRefresh() : c.auth.stopAutoRefresh()));
  }
  return client;
}
