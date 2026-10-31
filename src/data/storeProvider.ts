import { openDatabaseAsync } from 'expo-sqlite';

import { createSqliteStore } from './sqliteStore';
import type { LocalStore } from './types';

let ready: Promise<LocalStore> | null = null;

function open(): Promise<LocalStore> {
  ready ??= openDatabaseAsync('kynet.db').then(createSqliteStore);
  return ready;
}

/** Cada método espera a que la base esté abierta y migrada; las pantallas no notan la diferencia. */
function lazy(): LocalStore {
  return {
    saveSession: (...a) => open().then((s) => s.saveSession(...a)),
    listSessions: () => open().then((s) => s.listSessions()),
    getSession: (...a) => open().then((s) => s.getSession(...a)),
    dueOutbox: (...a) => open().then((s) => s.dueOutbox(...a)),
    updateOutbox: (...a) => open().then((s) => s.updateOutbox(...a)),
    pendingCount: (...a) => open().then((s) => s.pendingCount(...a)),
    claimLocalSessions: (...a) => open().then((s) => s.claimLocalSessions(...a)),
    importRemoteSessions: (...a) => open().then((s) => s.importRemoteSessions(...a)),
    getKv: (...a) => open().then((s) => s.getKv(...a)),
    setKv: (...a) => open().then((s) => s.setKv(...a)),
    wipe: () => open().then((s) => s.wipe()),
  };
}

const store = lazy();

/** Almacén local de la app: SQLite en el teléfono (`kynet.db`). */
export function getStore(): LocalStore {
  return store;
}
