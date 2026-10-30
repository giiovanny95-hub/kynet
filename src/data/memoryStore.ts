import type { SessionSummary } from '@/gamification/types';

import type { LocalStore, OutboxItem } from './types';

/** Implementación en memoria del almacén local (pruebas y desarrollo sin SQLite). */
export function createMemoryStore(): LocalStore {
  const sessions = new Map<string, SessionSummary>();
  const outbox = new Map<string, OutboxItem>();
  const kv = new Map<string, string>();
  return {
    async saveSession(s, ownerUserId, nowMs) {
      if (sessions.has(s.id)) return;
      sessions.set(s.id, s);
      outbox.set(s.id, { id: s.id, sessionId: s.id, userId: ownerUserId, initialImport: false, attempts: 0, nextRetryAtMs: nowMs, lastError: null, status: 'pending' });
    },
    async listSessions() {
      return [...sessions.values()];
    },
    async getSession(id) {
      return sessions.get(id) ?? null;
    },
    async dueOutbox(nowMs) {
      return [...outbox.values()].filter((o) => o.status === 'pending' && o.nextRetryAtMs <= nowMs);
    },
    async updateOutbox(item) {
      outbox.set(item.id, item);
    },
    async pendingCount(userId) {
      return [...outbox.values()].filter((o) => o.status === 'pending' && o.userId === userId).length;
    },
    async claimLocalSessions(userId) {
      let n = 0;
      for (const o of outbox.values()) {
        if (o.userId === null) {
          outbox.set(o.id, { ...o, userId, initialImport: true });
          n++;
        }
      }
      return n;
    },
    async getKv(key) {
      return kv.get(key) ?? null;
    },
    async setKv(key, value) {
      if (value === null) kv.delete(key);
      else kv.set(key, value);
    },
    async wipe() {
      sessions.clear();
      outbox.clear();
      kv.clear();
    },
  };
}
