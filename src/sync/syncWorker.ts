import type { LocalStore } from '@/data/types';

import { classifyError, retryDelayMs, toRpcArgs, type RpcArgs, type RpcError } from './outbox';

/** Llamada a la RPC `sync_session` (en la app, `supabase.rpc`; en las pruebas, un doble). */
export type SyncRpc = (args: RpcArgs) => Promise<{ data: unknown; error: RpcError | null }>;

export const SERVER_STATE_KEY = 'server_state';

/**
 * Sube las sesiones pendientes del usuario actual, en orden. Solo envía las de `userId` (nunca las de otra cuenta ni
 * las locales sin dueño), es idempotente (el servidor ignora los reintentos) y un error permanente no bloquea la cola.
 */
export async function syncOnce(
  store: LocalStore,
  rpc: SyncRpc,
  ctx: { readonly userId: string; readonly nowMs: number; readonly rand: () => number; readonly appVersion?: string },
): Promise<{ sent: number; dead: number; retried: number; skipped: number }> {
  const result = { sent: 0, dead: 0, retried: 0, skipped: 0 };
  for (const item of await store.dueOutbox(ctx.nowMs)) {
    if (item.userId !== ctx.userId) {
      result.skipped++;
      continue;
    }
    const session = await store.getSession(item.sessionId);
    if (session === null) {
      await store.updateOutbox({ ...item, status: 'dead', lastError: 'Sesión local no encontrada' });
      result.dead++;
      continue;
    }
    let outcome: { data: unknown; error: RpcError | null };
    try {
      outcome = await rpc(toRpcArgs(session, item.initialImport, ctx.appVersion));
    } catch (e) {
      outcome = { data: null, error: { message: e instanceof Error ? e.message : String(e) } };
    }
    if (outcome.error === null) {
      await store.updateOutbox({ ...item, status: 'done', lastError: null });
      await store.setKv(SERVER_STATE_KEY, JSON.stringify(outcome.data));
      result.sent++;
    } else if (classifyError(outcome.error) === 'dead') {
      await store.updateOutbox({ ...item, status: 'dead', lastError: outcome.error.message });
      result.dead++;
    } else {
      await store.updateOutbox({
        ...item,
        attempts: item.attempts + 1,
        nextRetryAtMs: ctx.nowMs + retryDelayMs(item.attempts, ctx.rand()),
        lastError: outcome.error.message,
      });
      result.retried++;
    }
  }
  return result;
}
