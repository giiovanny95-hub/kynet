import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import { Share } from 'react-native';

import { deviceTimeZone, USER_ID_KEY } from '@/data/account';
import { getStore } from '@/data/storeProvider';
import { loadPrefs } from '@/features/profile/prefsStore';
import { LAST_PULL_AT_KEY } from '@/sync/pull';
import { SERVER_STATE_KEY } from '@/sync/syncWorker';
import { pushProfile, runSync } from '@/sync/syncService';

import { classifyGoogleError, classifyServerError, type SignInResult } from './signInError';
import { getSupabase } from './supabaseClient';

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

export type { SignInResult };

export function loginAvailable(): boolean {
  return getSupabase() !== null && WEB_CLIENT_ID !== '';
}

/** Solo en desarrollo: etapa y código del fallo, para diagnosticar por logcat. Nunca el token ni el correo. */
function logFailure(stage: 'google' | 'supabase', code: string | undefined, status?: number): void {
  if (__DEV__) console.warn(`[auth] fallo en ${stage}: code=${code ?? '-'} status=${status ?? '-'}`);
}

/**
 * Login con Google (spec-datos-supabase §5.1): idToken nativo → `signInWithIdToken`. Después las sesiones locales
 * sin dueño pasan a la cuenta como importación inicial (DA2) y se sube todo. Un fallo de esa subida no deshace el
 * login: la cola la reintenta.
 */
export async function signInWithGoogle(): Promise<SignInResult> {
  const supabase = getSupabase();
  if (supabase === null || WEB_CLIENT_ID === '') return 'unavailable';
  let token: string | null;
  try {
    GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const r = await GoogleSignin.signIn();
    if (r.type !== 'success') return 'cancelled';
    token = r.data.idToken;
  } catch (e) {
    const code = isErrorWithCode(e) ? e.code : undefined;
    const result = classifyGoogleError(code, { cancelled: statusCodes.SIGN_IN_CANCELLED, inProgress: statusCodes.IN_PROGRESS });
    if (result !== 'cancelled' && result !== 'inProgress') logFailure('google', code);
    return result;
  }
  if (token === null) {
    logFailure('google', 'sin idToken');
    return 'google';
  }
  let userId: string;
  try {
    const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token });
    if (error !== null || data.user === null) {
      logFailure('supabase', error?.code, error?.status);
      return error === null ? 'error' : classifyServerError({ code: error.code, status: error.status, message: error.message });
    }
    userId = data.user.id;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logFailure('supabase', 'excepción');
    return classifyServerError({ message });
  }
  const store = getStore();
  const previous = await store.getKv(USER_ID_KEY);
  await store.setKv(USER_ID_KEY, userId);
  // Solo la primera cuenta del teléfono hereda las sesiones locales; nunca se mezclan cuentas (§4.4).
  if (previous === null || previous === userId) await store.claimLocalSessions(userId);
  await pushProfile(await loadPrefs(store), deviceTimeZone()).catch(() => undefined);
  await runSync().catch(() => undefined);
  return 'ok';
}

export async function currentEmail(): Promise<string | null> {
  const supabase = getSupabase();
  if (supabase === null) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.email ?? null;
}

/** Cierra la sesión; los datos locales se quedan en el teléfono (ya subidos o en cola para esa cuenta). */
export async function signOut(): Promise<void> {
  await getSupabase()?.auth.signOut();
  await GoogleSignin.signOut().catch(() => null);
  await getStore().setKv(SERVER_STATE_KEY, null);
  // La siguiente cuenta descarga sus 90 días desde cero.
  await getStore().setKv(LAST_PULL_AT_KEY, null);
}

/** Exporta todos los datos del servidor en JSON (spec §6.2) con la hoja de compartir del sistema. */
export async function exportMyData(): Promise<boolean> {
  const supabase = getSupabase();
  if (supabase === null) return false;
  const { data, error } = await supabase.rpc('export_my_data');
  if (error !== null) return false;
  await Share.share({ message: JSON.stringify(data, null, 2) });
  return true;
}

/** Borra la cuenta en el servidor (función `delete-account`) y después todo lo local. */
export async function deleteAccount(): Promise<boolean> {
  const supabase = getSupabase();
  if (supabase === null) return false;
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error !== null) return false;
  await signOut();
  await getStore().wipe();
  return true;
}
