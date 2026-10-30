import { describe, expect, it } from 'vitest';
import { birthDateFrom, isAdult, MIN_AGE } from './age';
import { createChunkedStorage, type KeyValueBackend } from './chunkedStorage';

describe('edad mínima (18+)', () => {
  it('cumple 18 justo hoy: adulto; mañana: no', () => {
    expect(MIN_AGE).toBe(18);
    expect(isAdult('2008-10-30', '2026-10-30')).toBe(true);
    expect(isAdult('2008-10-31', '2026-10-30')).toBe(false);
  });
  it('29 de febrero: cumple el 1 de marzo en años no bisiestos', () => {
    expect(isAdult('2008-02-29', '2026-02-28')).toBe(false);
    expect(isAdult('2008-02-29', '2026-03-01')).toBe(true);
  });
  it('fechas inválidas o futuras no son adultas', () => {
    expect(isAdult('no-fecha', '2026-10-30')).toBe(false);
    expect(isAdult('2030-01-01', '2026-10-30')).toBe(false);
  });
});

function fakeBackend(): KeyValueBackend & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    async getItem(k) {
      return data.get(k) ?? null;
    },
    async setItem(k, v) {
      if (v.length > 2048) throw new Error('SecureStore: valor de más de 2 KB');
      data.set(k, v);
    },
    async deleteItem(k) {
      data.delete(k);
    },
  };
}

describe('almacenamiento seguro por trozos (sesión de Supabase > 2 KB)', () => {
  it('guarda y lee un valor de 5 KB en trozos', async () => {
    const be = fakeBackend();
    const st = createChunkedStorage(be, 1800);
    const big = 'x'.repeat(5000);
    await st.setItem('sb-session', big);
    expect(await st.getItem('sb-session')).toBe(big);
    expect([...be.data.values()].every((v) => v.length <= 2048)).toBe(true);
  });
  it('al reescribir más corto borra los trozos sobrantes, y removeItem lo borra todo', async () => {
    const be = fakeBackend();
    const st = createChunkedStorage(be, 1800);
    await st.setItem('k', 'y'.repeat(5000));
    await st.setItem('k', 'corto');
    expect(await st.getItem('k')).toBe('corto');
    expect(be.data.size).toBe(2);
    await st.removeItem('k');
    expect(be.data.size).toBe(0);
    expect(await st.getItem('k')).toBeNull();
  });
  it('claves con caracteres no permitidos por SecureStore se normalizan', async () => {
    const be = fakeBackend();
    const st = createChunkedStorage(be, 1800);
    await st.setItem('sb-abc-auth-token', 'v');
    expect([...be.data.keys()].every((k) => /^[\w.-]+$/.test(k))).toBe(true);
  });
});

describe('fecha de nacimiento del formulario', () => {
  it('acepta fechas reales y rechaza inexistentes, futuras o vacías', () => {
    expect(birthDateFrom('5', '3', '1990', '2026-10-30')).toBe('1990-03-05');
    expect(birthDateFrom('29', '2', '2001', '2026-10-30')).toBeNull();
    expect(birthDateFrom('1', '1', '2027', '2026-10-30')).toBeNull();
    expect(birthDateFrom('', '', '', '2026-10-30')).toBeNull();
    expect(birthDateFrom('1', '1', '1850', '2026-10-30')).toBeNull();
  });
});
