import { describe, expect, it } from 'vitest';
import { findMissingKeys } from '../../scripts/i18n-check';

describe('findMissingKeys', () => {
  it('devuelve las claves anidadas que faltan, con puntos', () => {
    expect(findMissingKeys({ a: { b: 'x', c: 'y' } }, { a: { b: 'x' } })).toEqual(['a.c']);
  });

  it('devuelve vacío si las claves coinciden', () => {
    expect(findMissingKeys({ a: { b: 'x' } }, { a: { b: 'otro' } })).toEqual([]);
  });

  it('trata las claves de plural como claves normales', () => {
    expect(findMissingKeys({ reps_one: '1', reps_other: 'n' }, { reps_one: '1' })).toEqual(['reps_other']);
  });

  it('detecta una rama entera ausente', () => {
    expect(findMissingKeys({ a: { b: 'x', c: { d: 'y' } } }, { a: { b: 'x' } })).toEqual(['a.c.d']);
  });
});
