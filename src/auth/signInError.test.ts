import { describe, expect, it } from 'vitest';

import { classifyGoogleError, classifyServerError, signInMessageKey } from './signInError';

const CODES = { cancelled: '12501', inProgress: 'IN_PROGRESS' };

describe('errores del login con Google', () => {
  it('Supabase con el proveedor desactivado (el caso real del 2026-10-30) es de configuración del servidor', () => {
    expect(classifyServerError({ code: 'provider_disabled', status: 400, message: 'Provider (issuer "https://accounts.google.com") is not enabled' })).toBe('serverConfig');
    expect(classifyServerError({ status: 400, message: 'Unacceptable audience in id_token' })).toBe('serverConfig');
    expect(classifyServerError({ status: 400, message: 'Passed nonce and nonce in id_token should either both exist or not.' })).toBe('serverConfig');
  });

  it('sin red y errores genéricos', () => {
    expect(classifyServerError({ message: 'Network request failed' })).toBe('network');
    expect(classifyServerError({ status: 0, message: 'Failed to fetch' })).toBe('network');
    expect(classifyServerError({ status: 500, message: 'Internal error' })).toBe('error');
    expect(classifyServerError({})).toBe('error');
  });

  it('errores del SDK de Google', () => {
    expect(classifyGoogleError('12501', CODES)).toBe('cancelled');
    expect(classifyGoogleError('IN_PROGRESS', CODES)).toBe('inProgress');
    expect(classifyGoogleError('7', CODES)).toBe('network');
    expect(classifyGoogleError('10', CODES)).toBe('google');
    expect(classifyGoogleError(undefined, CODES)).toBe('google');
  });

  it('mensajes: nada que avisar si salió bien, se canceló o ya estaba en curso', () => {
    expect(signInMessageKey('ok')).toBeNull();
    expect(signInMessageKey('cancelled')).toBeNull();
    expect(signInMessageKey('inProgress')).toBeNull();
    expect(signInMessageKey('serverConfig')).toBe('account.errors.serverConfig');
    expect(signInMessageKey('network')).toBe('account.errors.network');
    expect(signInMessageKey('error')).toBe('account.error');
  });
});
