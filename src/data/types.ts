import type { SessionSummary } from '@/gamification/types';

/** Elemento de la cola de salida: una sesión por subir (spec-datos-supabase §4.3). */
export interface OutboxItem {
  readonly id: string;
  readonly sessionId: string;
  /** Dueño de la sesión; `null` = cuenta local sin login todavía. */
  readonly userId: string | null;
  /** Subida de la importación inicial tras el primer login (DA2). */
  readonly initialImport: boolean;
  readonly attempts: number;
  readonly nextRetryAtMs: number;
  readonly lastError: string | null;
  readonly status: 'pending' | 'dead' | 'done';
}

/** Almacén local (SQLite en la app, memoria en las pruebas). Ninguna pantalla ejecuta SQL. */
export interface LocalStore {
  /** Guarda la sesión y su elemento de cola en la misma operación (todo o nada). */
  saveSession(s: SessionSummary, ownerUserId: string | null, nowMs: number): Promise<void>;
  listSessions(): Promise<SessionSummary[]>;
  getSession(id: string): Promise<SessionSummary | null>;
  dueOutbox(nowMs: number): Promise<OutboxItem[]>;
  updateOutbox(item: OutboxItem): Promise<void>;
  /** Asigna al usuario las sesiones locales sin dueño y las marca como importación inicial. */
  claimLocalSessions(userId: string): Promise<number>;
  getKv(key: string): Promise<string | null>;
  setKv(key: string, value: string | null): Promise<void>;
  /** Borra todo (borrado de cuenta o cierre de sesión con limpieza). */
  wipe(): Promise<void>;
}
