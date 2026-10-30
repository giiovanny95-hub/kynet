import type { SessionSummary } from '@/gamification/types';

import type { LocalStore, OutboxItem } from './types';

/** Lo que el almacén usa de `expo-sqlite` (`SQLiteDatabase`); en las pruebas lo implementa `node:sqlite`. */
export type SqlValue = string | number | null;
export interface SqlDb {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: SqlValue[]): Promise<unknown>;
  getAllAsync<T>(source: string, params: SqlValue[]): Promise<T[]>;
  getFirstAsync<T>(source: string, params: SqlValue[]): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

/**
 * Esquema local (spec-datos-supabase §4.2). La sesión se guarda como JSON inmutable: nunca se edita, solo se sube.
 * Cada versión del esquema se aplica una vez según `PRAGMA user_version`.
 */
const MIGRATIONS: readonly string[] = [
  `CREATE TABLE sessions (
     id TEXT PRIMARY KEY NOT NULL,
     ended_at_ms INTEGER NOT NULL,
     body TEXT NOT NULL
   );
   CREATE TABLE outbox (
     id TEXT PRIMARY KEY NOT NULL,
     session_id TEXT NOT NULL REFERENCES sessions (id),
     user_id TEXT,
     initial_import INTEGER NOT NULL DEFAULT 0,
     attempts INTEGER NOT NULL DEFAULT 0,
     next_retry_at_ms INTEGER NOT NULL,
     last_error TEXT,
     status TEXT NOT NULL CHECK (status IN ('pending', 'dead', 'done'))
   );
   CREATE INDEX outbox_due ON outbox (status, next_retry_at_ms);
   CREATE TABLE kv (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);`,
];

interface OutboxRow {
  id: string;
  session_id: string;
  user_id: string | null;
  initial_import: number;
  attempts: number;
  next_retry_at_ms: number;
  last_error: string | null;
  status: OutboxItem['status'];
}

function toItem(r: OutboxRow): OutboxItem {
  return {
    id: r.id,
    sessionId: r.session_id,
    userId: r.user_id,
    initialImport: r.initial_import === 1,
    attempts: r.attempts,
    nextRetryAtMs: r.next_retry_at_ms,
    lastError: r.last_error,
    status: r.status,
  };
}

export async function migrate(db: SqlDb): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  const from = row?.user_version ?? 0;
  for (let v = from; v < MIGRATIONS.length; v++) {
    const sql = MIGRATIONS[v];
    if (sql === undefined) break;
    await db.withTransactionAsync(async () => {
      await db.execAsync(sql);
      await db.execAsync(`PRAGMA user_version = ${v + 1}`);
    });
  }
}

export async function createSqliteStore(db: SqlDb): Promise<LocalStore> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  await migrate(db);
  return {
    async saveSession(s: SessionSummary, ownerUserId, nowMs) {
      await db.withTransactionAsync(async () => {
        await db.runAsync('INSERT OR IGNORE INTO sessions (id, ended_at_ms, body) VALUES (?, ?, ?)', [s.id, s.endedAtMs, JSON.stringify(s)]);
        await db.runAsync(
          "INSERT OR IGNORE INTO outbox (id, session_id, user_id, next_retry_at_ms, status) VALUES (?, ?, ?, ?, 'pending')",
          [s.id, s.id, ownerUserId, nowMs],
        );
      });
    },
    async listSessions() {
      const rows = await db.getAllAsync<{ body: string }>('SELECT body FROM sessions ORDER BY ended_at_ms', []);
      return rows.map((r) => JSON.parse(r.body) as SessionSummary);
    },
    async getSession(id) {
      const r = await db.getFirstAsync<{ body: string }>('SELECT body FROM sessions WHERE id = ?', [id]);
      return r === null ? null : (JSON.parse(r.body) as SessionSummary);
    },
    async dueOutbox(nowMs) {
      const rows = await db.getAllAsync<OutboxRow>(
        `SELECT o.* FROM outbox o JOIN sessions s ON s.id = o.session_id
          WHERE o.status = 'pending' AND o.next_retry_at_ms <= ? ORDER BY s.ended_at_ms`,
        [nowMs],
      );
      return rows.map(toItem);
    },
    async updateOutbox(item) {
      await db.runAsync(
        `UPDATE outbox SET user_id = ?, initial_import = ?, attempts = ?, next_retry_at_ms = ?, last_error = ?, status = ? WHERE id = ?`,
        [item.userId, item.initialImport ? 1 : 0, item.attempts, item.nextRetryAtMs, item.lastError, item.status, item.id],
      );
    },
    async pendingCount(userId) {
      const r = await db.getFirstAsync<{ n: number }>(
        "SELECT count(*) AS n FROM outbox WHERE status = 'pending' AND user_id IS ?",
        [userId],
      );
      return r?.n ?? 0;
    },
    async claimLocalSessions(userId) {
      const r = await db.getFirstAsync<{ n: number }>('SELECT count(*) AS n FROM outbox WHERE user_id IS NULL', []);
      await db.runAsync('UPDATE outbox SET user_id = ?, initial_import = 1 WHERE user_id IS NULL', [userId]);
      return r?.n ?? 0;
    },
    async importRemoteSessions(list, ownerUserId) {
      let n = 0;
      await db.withTransactionAsync(async () => {
        for (const s of list) {
          const exists = await db.getFirstAsync<{ id: string }>('SELECT id FROM sessions WHERE id = ?', [s.id]);
          if (exists !== null) continue;
          await db.runAsync('INSERT OR IGNORE INTO sessions (id, ended_at_ms, body) VALUES (?, ?, ?)', [s.id, s.endedAtMs, JSON.stringify(s)]);
          await db.runAsync(
            "INSERT OR IGNORE INTO outbox (id, session_id, user_id, next_retry_at_ms, status) VALUES (?, ?, ?, 0, 'done')",
            [s.id, s.id, ownerUserId],
          );
          n++;
        }
      });
      return n;
    },
    async getKv(key) {
      const r = await db.getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', [key]);
      return r?.value ?? null;
    },
    async setKv(key, value) {
      if (value === null) await db.runAsync('DELETE FROM kv WHERE key = ?', [key]);
      else await db.runAsync('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value', [key, value]);
    },
    async wipe() {
      await db.withTransactionAsync(async () => {
        await db.execAsync('DELETE FROM outbox; DELETE FROM sessions; DELETE FROM kv;');
      });
    },
  };
}
