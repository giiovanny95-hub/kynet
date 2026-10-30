import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';

import type { SessionSummary } from '@/gamification/types';

import { createMemoryStore } from './memoryStore';
import { createSqliteStore, type SqlDb, type SqlValue } from './sqliteStore';
import type { LocalStore } from './types';

/** `SqlDb` sobre `node:sqlite` para probar el almacén real sin teléfono. */
function nodeDb(): SqlDb {
  const db = new DatabaseSync(':memory:');
  return {
    async execAsync(sql) {
      db.exec(sql);
    },
    async runAsync(sql, params: SqlValue[]) {
      return db.prepare(sql).run(...params);
    },
    async getAllAsync<T>(sql: string, params: SqlValue[]) {
      return db.prepare(sql).all(...params) as T[];
    },
    async getFirstAsync<T>(sql: string, params: SqlValue[]) {
      return (db.prepare(sql).get(...params) as T | undefined) ?? null;
    },
    async withTransactionAsync(task) {
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
  };
}

const s = (id: string, endedAtMs: number): SessionSummary => ({
  id, exercise: 'squat', startedAtMs: endedAtMs - 60_000, endedAtMs, tz: 'UTC', localDate: '2026-10-30', status: 'completed',
  activeSeconds: 60, repsTotal: 1, repsValid: 1, avgFormScore: 90,
  reps: [{ index: 0, tStartMs: 0, durationMs: 2000, formScore: 90, valid: true, faults: ['SQ_DEPTH'] }],
});
const U = '11111111-1111-4111-8111-111111111111';

const stores: [string, () => Promise<LocalStore>][] = [
  ['memoria', async () => createMemoryStore()],
  ['SQLite', () => createSqliteStore(nodeDb())],
];

describe.each(stores)('almacén local (%s)', (_name, make) => {
  it('guarda la sesión con su elemento de cola, sin duplicar, y la devuelve igual', async () => {
    const st = await make();
    await st.saveSession(s('b', 2000), null, 100);
    await st.saveSession(s('a', 1000), null, 100);
    await st.saveSession(s('a', 1000), null, 100);
    expect((await st.listSessions()).map((x) => x.id).sort()).toEqual(['a', 'b']);
    expect(await st.getSession('a')).toEqual(s('a', 1000));
    expect(await st.getSession('zz')).toBeNull();
    expect(await st.dueOutbox(50)).toHaveLength(0);
    expect((await st.dueOutbox(100)).map((o) => o.sessionId).sort()).toEqual(['a', 'b']);
    expect(await st.pendingCount(null)).toBe(2);
  });

  it('reclama las sesiones locales como importación inicial y actualiza la cola', async () => {
    const st = await make();
    await st.saveSession(s('a', 1000), null, 0);
    await st.saveSession(s('b', 2000), U, 0);
    expect(await st.claimLocalSessions(U)).toBe(1);
    const due = await st.dueOutbox(0);
    expect(due.every((o) => o.userId === U)).toBe(true);
    expect(due.find((o) => o.id === 'a')?.initialImport).toBe(true);
    expect(due.find((o) => o.id === 'b')?.initialImport).toBe(false);
    const a = due.find((o) => o.id === 'a');
    if (a === undefined) throw new Error('falta a');
    await st.updateOutbox({ ...a, status: 'done' });
    expect(await st.pendingCount(U)).toBe(1);
  });

  it('kv y borrado total', async () => {
    const st = await make();
    await st.setKv('k', '1');
    await st.setKv('k', '2');
    expect(await st.getKv('k')).toBe('2');
    await st.saveSession(s('a', 1000), null, 0);
    await st.wipe();
    expect(await st.getKv('k')).toBeNull();
    expect(await st.listSessions()).toEqual([]);
    expect(await st.dueOutbox(Number.MAX_SAFE_INTEGER)).toEqual([]);
  });
});
