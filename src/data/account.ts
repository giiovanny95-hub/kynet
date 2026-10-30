/** Clave del almacén con el id del usuario de Supabase; vacía mientras se usa la cuenta local. */
export const USER_ID_KEY = 'user_id';
/** Id de la cuenta local antes del login: solo sirve para elegir misiones de forma estable. */
export const LOCAL_USER = '00000000-0000-4000-8000-000000000000';

export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}
export const AGE_BLOCKED_KEY = 'age_blocked';
