/** Resultado del login con Google y su mensaje (puro, probado sin el SDK de Google ni Supabase). */
export type SignInResult = 'ok' | 'cancelled' | 'inProgress' | 'unavailable' | 'serverConfig' | 'network' | 'google' | 'error';

export interface AuthErrorLike {
  readonly code?: string;
  readonly status?: number;
  readonly message?: string;
}

const NETWORK = /network|fetch|timed? ?out|offline|unreachable/i;
// Configuración del proveedor en Supabase: desactivado, cliente que no coincide o comprobación del nonce.
const SERVER_CONFIG_CODES = new Set(['provider_disabled', 'bad_oauth_callback', 'oauth_provider_not_supported']);
const SERVER_CONFIG_TEXT = /not enabled|audience|nonce|client id/i;

/** Error de `signInWithIdToken` (Supabase). */
export function classifyServerError(e: AuthErrorLike): SignInResult {
  if ((e.code !== undefined && SERVER_CONFIG_CODES.has(e.code)) || SERVER_CONFIG_TEXT.test(e.message ?? '')) return 'serverConfig';
  if ((e.status === undefined || e.status === 0) && NETWORK.test(e.message ?? '')) return 'network';
  return 'error';
}

/** Códigos del SDK de Google que la app distingue (los valores reales vienen de `statusCodes`). */
export interface GoogleCodes {
  readonly cancelled: string;
  readonly inProgress: string;
}

// Códigos de Google Play Services en Android: 7 = sin red; 10 = DEVELOPER_ERROR (paquete o SHA-1 del cliente).
const GOOGLE_NETWORK_CODE = '7';

/** Error lanzado por `GoogleSignin.signIn()`. */
export function classifyGoogleError(code: string | undefined, codes: GoogleCodes): SignInResult {
  if (code === codes.cancelled) return 'cancelled';
  if (code === codes.inProgress) return 'inProgress';
  if (code === GOOGLE_NETWORK_CODE) return 'network';
  return 'google';
}

/** Clave i18n del mensaje que ve el usuario; `null` si no hay nada que avisar (éxito, cancelado o ya en curso). */
export function signInMessageKey(r: SignInResult): string | null {
  switch (r) {
    case 'ok':
    case 'cancelled':
    case 'inProgress':
      return null;
    case 'unavailable':
      return 'account.unavailable';
    case 'serverConfig':
      return 'account.errors.serverConfig';
    case 'network':
      return 'account.errors.network';
    case 'google':
      return 'account.errors.google';
    default:
      return 'account.error';
  }
}
