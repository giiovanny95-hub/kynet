import { describe, expect, it } from 'vitest';
import { comboStep } from '../scoring/combo';
import { formScore, pForm, quality, repQ } from '../scoring/quality';
import { qRomJJ, qRomSquat } from '../scoring/rom';
import { qTempo } from '../scoring/tempo';

// Ejemplos de spec-cinematica §6.3 con T = 90° y Ttop = 175° (inicio calibrado por defecto).
describe('ejemplos de la spec (sentadilla)', () => {
  it('fondo 88°, arriba 172°, 1,4 + 1,2 s: Q ≈ 0,96 Perfect', () => {
    const rom = qRomSquat(88, 172, 90, 175);
    const tempo = qTempo('squat', 1.4, 1.2);
    expect(rom).toBeCloseTo(0.94, 2);
    expect(tempo).toBeCloseTo(1.0, 2);
    const q = repQ(rom, tempo, pForm([]));
    expect(q).toBeCloseTo(0.96, 2);
    expect(quality(q, 0)).toBe('Perfect');
  });

  it('fondo 96°, arriba 168°, 0,8 + 0,6 s: Q ≈ 0,66 Good', () => {
    const rom = qRomSquat(96, 168, 90, 175);
    const tempo = qTempo('squat', 0.8, 0.6);
    expect(rom).toBeCloseTo(0.65, 2);
    expect(tempo).toBeCloseTo(0.66, 2);
    const q = repQ(rom, tempo, 1);
    expect(q).toBeCloseTo(0.66, 2);
    expect(quality(q, 0)).toBe('Good');
  });

  it('fondo 100°, arriba 160°: Q_rom ≈ 0,35', () => {
    expect(qRomSquat(100, 160, 90, 175)).toBeCloseTo(0.35, 2);
  });

  it('fondo 80°, arriba 176°, 3,5 + 2,5 s: Q ≈ 0,85 Great', () => {
    const rom = qRomSquat(80, 176, 90, 175);
    const tempo = qTempo('squat', 3.5, 2.5);
    expect(rom).toBeCloseTo(1.0, 2);
    expect(tempo).toBeCloseTo(0.62, 2);
    const q = repQ(rom, tempo, 1);
    expect(q).toBeCloseTo(0.85, 2);
    expect(quality(q, 0)).toBe('Great');
  });
});

describe('calidad, puntuación de forma y combos', () => {
  it('cortes 0,50 / 0,80 / 0,90', () => {
    expect(quality(0.49, 0)).toBe('Miss');
    expect(quality(0.5, 0)).toBe('Good');
    expect(quality(0.8, 0)).toBe('Great');
    expect(quality(0.9, 0)).toBe('Perfect');
    expect(quality(0.95, 1)).toBe('Great');
  });

  it('formScore redondea a 0-100', () => {
    expect(formScore(0.796)).toBe(80);
    expect(formScore(1.2)).toBe(100);
    expect(formScore(-0.1)).toBe(0);
  });

  it('pForm multiplica penalizaciones con piso 0,5', () => {
    expect(pForm([0.1, 0.25])).toBeCloseTo(0.675, 9);
    expect(pForm([0.25, 0.25, 0.25])).toBe(0.5);
  });

  it('5 Great seguidos dan multiplicador 1,25 y un Miss lo reinicia', () => {
    let c = { combo: 0 };
    let mult = 1;
    for (let i = 0; i < 5; i++) ({ combo: c.combo, mult } = comboStep(c, 'Great'));
    expect(c.combo).toBe(5);
    expect(mult).toBe(1.25);
    const kept = comboStep(c, 'Good');
    expect(kept.combo).toBe(5);
    c = comboStep(c, 'Miss');
    expect(c.combo).toBe(0);
    expect(comboStep({ combo: 40 }, 'Perfect').mult).toBe(2);
  });
});

describe('jumping jack', () => {
  it('Q_rom con picos por defecto (165°, 2,0)', () => {
    expect(qRomJJ(165, 2.0)).toBe(1);
    expect(qRomJJ(140, 1.5)).toBeCloseTo(0.5 * (1 - 25 / 50) + 0.5 * (1 - 0.5), 9);
  });
  it('Q_tempo sin término de ritmo', () => {
    expect(qTempo('jumpingJack', 0.4, 0.4)).toBe(1);
    expect(qTempo('jumpingJack', 0.15, 0.15)).toBe(0);
  });
});
