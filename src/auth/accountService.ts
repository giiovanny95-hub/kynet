import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import { Share } from 'react-native';

import { deviceTimeZone, USER_ID_KEY } from '@/data/account';
import { getStore } from '@/data/storeProvider';
import { loadPrefs } from '@/features/profile/prefsStore';
import { SERVER_STATE_KEY } from '@/sync/syncWorker';
import { pushProfile, runSync } from '@/sync/syncService';

import { getSupabase } from './supabaseClient';

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

export type SignInResult = 'ok' | 'cancelled' | 'unavailable' | 'error';

export function loginAvailable(): boolean {
  return getSupabase() !== null && WEB_CLIENT_ID !== '';
}

/**
 * Login con Google (spec-datos-supabase §5.1): idToken nativo → `signInWithIdToken`. Después las sesiones locales
 * sin dueño pasan a la cuenta como importación inicial (DA2) y se sube todo.
 */
export async function signInWithGoogle(): Promise<SignInResult> {
  const supabase = getSupabase();
  if (supabase === null || WEB_CLIENT_ID === '') return 'unavailable';
  try {
    GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const r = await GoogleSignin.signIn();
    if (r.type !== 'success') return 'cancelled';
    const token = r.data.idToken;
    if (token === null) return 'error';
    const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token });
    if (error !== null || data.user === null) return 'error';
    const store = getStore();
    const previous = await store.getKv(USER_ID_KEY);
    await store.setKv(USER_ID_KEY, data.user.id);
    // Solo la primera cuenta del teléfono hereda las sesiones locales; nunca se mezclan cuentas (§4.4).
    if (previous === null || previous === data.user.id) await store.claimLocalSessions(data.user.id);
    await pushProfile(await loadPrefs(store), deviceTimeZone());
    await runSync();
    return 'ok';
  } catch (e) {
    if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) return 'cancelled';
    return 'error';
  }
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
