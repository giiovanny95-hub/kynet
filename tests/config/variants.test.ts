import { describe, expect, it } from 'vitest';
import { getVariant } from '@/core/variant';

describe('getVariant', () => {
  it('development usa sufijo .dev', () => {
    expect(getVariant('development')).toEqual({ name: 'KYNET (Dev)', androidPackage: 'com.kynet.app.dev', scheme: 'kynet-dev' });
  });

  it('preview usa sufijo .preview', () => {
    expect(getVariant('preview')).toEqual({ name: 'KYNET (Preview)', androidPackage: 'com.kynet.app.preview', scheme: 'kynet-preview' });
  });

  it('production y valor ausente usan el paquete base', () => {
    const prod = { name: 'KYNET', androidPackage: 'com.kynet.app', scheme: 'kynet' };
    expect(getVariant('production')).toEqual(prod);
    expect(getVariant(undefined)).toEqual(prod);
  });

  it('rechaza una variante desconocida', () => {
    expect(() => getVariant('staging')).toThrow(RangeError);
  });
});
