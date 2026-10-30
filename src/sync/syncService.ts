import Constants from 'expo-constants';

import { getSupabase } from '@/auth/supabaseClient';
import { USER_ID_KEY } from '@/data/account';
import { getStore } from '@/data/storeProvider';
import type { Prefs } from '@/features/profile/prefs';

import { LAST_PULL_AT_KEY, PULL_COLUMNS, PULL_LIMIT, PULL_WINDOW_MS, pullSessions, type RemoteSessionRow } from './pull';
import { syncOnce, SERVER_STATE_KEY } from './syncWorker';

export const LAST_SYNC_ERROR_KEY = 'last_sync_error';

let running: Promise<void> | null = null;

/**
 * Sube la cola del usuario con sesión iniciada y guarda el estado del servidor. Sin conexión, sin configuración o sin
 * login no hace nada: los datos siguen en el teléfono. Una sola ejecución a la vez.
 */
export function runSync(): Promise<void> {
  running ??= doSync().finally(() => {
    running = null;
  });
  return running;
}

async function doSync(): Promise<void> {
  const supabase = getSupabase();
  if (supabase === null) return;
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (user === undefined) return;
  const store = getStore();
  const result = await syncOnce(
    store,
    async (args) => {
      const r = await supabase.rpc('sync_session', args);
      return { data: r.data as unknown, error: r.error === null ? null : { code: r.error.code, status: r.status, message: r.error.message } };
    },
    { userId: user.id, nowMs: Date.now(), rand: Math.random, appVersion: Constants.expoConfig?.version ?? 'unknown' },
  );
  if (result.sent === 0) {
    // Sin nada que subir, se refresca el estado igualmente (otro dispositivo pudo cambiarlo).
    const r = await supabase.rpc('get_state');
    if (r.error === null) await store.setKv(SERVER_STATE_KEY, JSON.stringify(r.data));
  }
  await store.setKv(LAST_SYNC_ERROR_KEY, result.dead + result.retried > 0 ? String(result.dead + result.retried) : null);

  // Después de subir: sesiones de otros dispositivos (spec-datos-supabase §4.4). RLS ya limita a las propias y vivas.
  try {
    const since = (await store.getKv(LAST_PULL_AT_KEY)) ?? new Date(Date.now() - PULL_WINDOW_MS).toISOString();
    const cursor = await pullSessions(
      async (sinceIso) => {
        const r = await supabase
          .from('workout_sessions')
          .select(PULL_COLUMNS)
          .gte('updated_at', sinceIso)
          .order('updated_at', { ascending: true })
          .limit(PULL_LIMIT);
        return { data: r.data as unknown as RemoteSessionRow[] | null, error: r.error === null ? null : { message: r.error.message } };
      },
      store,
      user.id,
      since,
    );
    if (cursor !== null) await store.setKv(LAST_PULL_AT_KEY, cursor);
  } catch {
    // Sin red o con un error del servidor se reintenta en la próxima sincronización; los datos locales no cambian.
  }
}

/** Copia los ajustes al perfil del servidor (columnas que el usuario puede editar). Silencioso si falla. */
export async function pushProfile(prefs: Prefs, timezone: string): Promise<void> {
  const supabase = getSupabase();
  const userId = await getStore().getKv(USER_ID_KEY);
  if (supabase === null || userId === null) return;
  await supabase
    .from('profiles')
    .update({ weekly_goal_days: prefs.weeklyGoalDays, fitness_level: prefs.fitnessLevel, onboarded_at: prefs.onboardedAt, timezone })
    .eq('id', userId);
}
