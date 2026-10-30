import { describe, expect, it } from 'vitest';
import { toneBadge } from './toneColor';

describe('estado de la forma: nunca solo color (manual KYNET)', () => {
  it('cada tono con color lleva icono y texto', () => {
    expect(toneBadge('good')).toEqual({ glyph: '✓', labelKey: 'tone.good' });
    expect(toneBadge('warn')).toEqual({ glyph: '!', labelKey: 'tone.warn' });
    expect(toneBadge('bad')).toEqual({ glyph: '✕', labelKey: 'tone.bad' });
  });
  it('neutral no muestra nada', () => {
    expect(toneBadge('neutral')).toBeNull();
  });
});
