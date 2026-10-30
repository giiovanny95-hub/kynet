import { describe, expect, it } from 'vitest';
import { createMemoryStore } from '@/data/memoryStore';
import type { SessionSummary } from '@/gamification/types';
import { classifyError, retryDelayMs, toRpcArgs } from './outbox';
import { fromRemoteRows, pullSessions, type RemoteSessionRow } from './pull';
import { parseServerState } from './serverState';
import { syncOnce, type SyncRpc } from './syncWorker';

const session = (id: string): SessionSummary => ({
  id, exercise: 'squat', startedAtMs: Date.parse('2026-10-30T15:00:00Z'), endedAtMs: Date.parse('2026-10-30T15:05:00Z'),
  tz: 'America/Mexico_City', localDate: '2026-10-30', status: 'completed', activeSeconds: 120, repsTotal: 2, repsValid: 1, avgFormScore: 90,
  reps: [
    { index: 0, tStartMs: 0, durationMs: 2000, formScore: 90, valid: true, faults: [] },
    { index: 1, tStartMs: 3000, durationMs: 1500, formScore: 0, valid: false, faults: ['SQ_DEPTH_SHALLOW'] },
  ],
});
const U = '11111111-1111-4111-8111-111111111111';

describe('cola de salida (spec-datos-supabase §4.3)', () => {
  it('backoff 5 s·2^n con jitter y tope de 15 min', () => {
    expect(retryDelayMs(0, 0)).toBe(2500);
    expect(retryDelayMs(0, 1)).toBe(5000);
    expect(retryDelayMs(3, 1)).toBe(40_000);
    expect(retryDelayMs(20, 1)).toBe(900_000);
  });

  it('clasifica errores: validación → dead; red, 5xx, 429 y 401 → reintentar', () => {
    expect(classifyError({ code: 'P0001', message: 'x' })).toBe('dead');
    expect(classifyError({ code: '22023', message: 'x' })).toBe('dead');
    expect(classifyError({ code: '42501', message: 'Sesión ajena' })).toBe('dead');
    expect(classifyError({ message: 'Network request failed' })).toBe('retry');
    expect(classifyError({ status: 503, message: 'x' })).toBe('retry');
    expect(classifyError({ status: 429, message: 'x' })).toBe('retry');
    expect(classifyError({ status: 401, message: 'JWT expired' })).toBe('retry');
  });

  it('el payload va en snake_case, sin landmarks, con fechas ISO', () => {
    const a = toRpcArgs(session('s1'), false);
    expect(a.p_session).toEqual({
      id: 's1', exercise: 'squat', started_at: '2026-10-30T15:00:00.000Z', ended_at: '2026-10-30T15:05:00.000Z', tz: 'America/Mexico_City',
      status: 'completed', active_seconds: 120, avg_form_score: 90, algo_version: 1, app_version: expect.any(String),
    });
    expect(a.p_reps[1]).toEqual({ index: 1, t_start_ms: 3000, duration_ms: 1500, form_score: 0, valid: false, faults: ['SQ_DEPTH_SHALLOW'] });
    expect(a.p_initial_import).toBe(false);
  });
});

describe('syncOnce', () => {
  it('sube, marca como hecha y guarda el estado del servidor', async () => {
    const store = createMemoryStore();
    await store.saveSession(session('s1'), U, 0);
    const calls: unknown[] = [];
    const rpc: SyncRpc = async (args) => {
      calls.push(args);
      return { data: { session_id: 's1', state: { total_xp: 115 } }, error: null };
    };
    const r = await syncOnce(store, rpc, { userId: U, nowMs: 10, rand: () => 1 });
    expect(r).toMatchObject({ sent: 1, dead: 0, retried: 0 });
    expect(calls).toHaveLength(1);
    expect(await store.dueOutbox(1e12)).toHaveLength(0);
    expect(JSON.parse((await store.getKv('server_state')) ?? 'null')).toMatchObject({ state: { total_xp: 115 } });
  });

  it('un error de validación no bloquea la cola; un error de red se reintenta más tarde', async () => {
    const store = createMemoryStore();
    await store.saveSession(session('bad'), U, 0);
    await store.saveSession(session('net'), U, 0);
    await store.saveSession(session('ok'), U, 0);
    const rpc: SyncRpc = async (args) => {
      const id = args.p_session.id;
      if (id === 'bad') return { data: null, error: { code: '22023', message: 'Repeticiones no válidas' } };
      if (id === 'net') return { data: null, error: { message: 'Network request failed' } };
      return { data: { state: {} }, error: null };
    };
    const r = await syncOnce(store, rpc, { userId: U, nowMs: 0, rand: () => 1 });
    expect(r).toMatchObject({ sent: 1, dead: 1, retried: 1 });
    expect((await store.dueOutbox(1000)).map((o) => o.id)).toEqual([]);
    expect((await store.dueOutbox(5000)).map((o) => o.id)).toEqual(['net']);
  });

  it('no envía la cola de otro usuario (Review Focus 3) ni la local sin dueño', async () => {
    const store = createMemoryStore();
    await store.saveSession(session('otro'), '22222222-2222-4222-8222-222222222222', 0);
    await store.saveSession(session('local'), null, 0);
    let calls = 0;
    const rpc: SyncRpc = async () => {
      calls++;
      return { data: {}, error: null };
    };
    const r = await syncOnce(store, rpc, { userId: U, nowMs: 0, rand: () => 1 });
    expect(calls).toBe(0);
    expect(r).toMatchObject({ sent: 0, skipped: 2 });
  });

  it('tras el login, las sesiones locales se suben como importación inicial', async () => {
    const store = createMemoryStore();
    await store.saveSession(session('local'), null, 0);
    expect(await store.claimLocalSessions(U)).toBe(1);
    let flag: boolean | null = null;
    const rpc: SyncRpc = async (args) => {
      flag = args.p_initial_import;
      return { data: {}, error: null };
    };
    await syncOnce(store, rpc, { userId: U, nowMs: 0, rand: () => 1 });
    expect(flag).toBe(true);
  });
});

describe('estado del servidor', () => {
  it('lee total_xp (bigint como texto o número), nivel y rachas; ignora JSON roto', () => {
    const json = JSON.stringify({ state: { total_xp: '115', level: 2, current_streak: 1, longest_streak: 3 }, assignments: [] });
    expect(parseServerState(json)).toEqual({ totalXp: 115, level: 2, currentStreak: 1, longestStreak: 3 });
    expect(parseServerState(null)).toBeNull();
    expect(parseServerState('{')).toBeNull();
    expect(parseServerState(JSON.stringify({ state: null }))).toBeNull();
  });
});

const remote = (id: string, code: string, updatedAt: string, reps: RemoteSessionRow['rep_summaries']): RemoteSessionRow => ({
  id, started_at: '2026-10-30T15:00:00+00:00', ended_at: '2026-10-30T15:05:00+00:00', tz: 'America/Mexico_City', local_date: '2026-10-30',
  status: 'completed', active_seconds: 120, reps_total: reps.length, reps_valid: reps.filter((r) => r.valid).length, avg_form_score: 90,
  updated_at: updatedAt, exercises: { code }, rep_summaries: reps,
});
const rep = (i: number, valid: boolean) => ({ rep_index: i, t_start_ms: i * 2000, duration_ms: 1800, form_score: valid ? 90 : 0, valid, fault_codes: valid ? [] : ['SQ_DEPTH_SHALLOW'] });

describe('descarga de sesiones de otros dispositivos (spec-datos-supabase §4.4)', () => {
  it('fromRemoteRows convierte, ordena las repeticiones y descarta ejercicios desconocidos', () => {
    const out = fromRemoteRows([
      remote('s1', 'squat', '2026-10-30T15:06:00+00:00', [rep(1, false), rep(0, true)]),
      remote('s2', 'burpee', '2026-10-30T15:07:00+00:00', [rep(0, true)]),
    ]);
    expect(out).toEqual([{
      id: 's1', exercise: 'squat', startedAtMs: Date.parse('2026-10-30T15:00:00Z'), endedAtMs: Date.parse('2026-10-30T15:05:00Z'),
      tz: 'America/Mexico_City', localDate: '2026-10-30', status: 'completed', activeSeconds: 120, repsTotal: 2, repsValid: 1, avgFormScore: 90,
      reps: [
        { index: 0, tStartMs: 0, durationMs: 1800, formScore: 90, valid: true, faults: [] },
        { index: 1, tStartMs: 2000, durationMs: 1800, formScore: 0, valid: false, faults: ['SQ_DEPTH_SHALLOW'] },
      ],
    }]);
  });

  it('pullSessions importa desde el cursor y devuelve el updated_at más reciente', async () => {
    const store = createMemoryStore();
    const asked: string[] = [];
    const cursor = await pullSessions(async (since) => {
      asked.push(since);
      return { data: [remote('s1', 'squat', '2026-10-30T15:06:00+00:00', [rep(0, true)]), remote('s2', 'pushUp', '2026-10-30T16:00:00+00:00', [])], error: null };
    }, store, U, '2026-08-01T00:00:00.000Z');
    expect(asked).toEqual(['2026-08-01T00:00:00.000Z']);
    expect(cursor).toBe('2026-10-30T16:00:00+00:00');
    expect((await store.listSessions()).map((x) => x.id).sort()).toEqual(['s1', 's2']);
    expect(await store.pendingCount(U)).toBe(0);
  });

  it('pullSessions sin filas o con error no mueve el cursor', async () => {
    const store = createMemoryStore();
    expect(await pullSessions(async () => ({ data: [], error: null }), store, U, 'x')).toBeNull();
    expect(await pullSessions(async () => ({ data: null, error: { message: 'red' } }), store, U, 'x')).toBeNull();
  });
});
