import { describe, expect, it } from 'vitest';
import { getVariant } from '@/core/variant';

describe('getVariant', () => {
  it('development usa sufijo .dev', () => {
    expect(getVariant('development')).toEqual({ name: 'FitPose (Dev)', androidPackage: 'com.fitpose.app.dev', scheme: 'fitpose-dev' });
  });

  it('preview usa sufijo .preview', () => {
    expect(getVariant('preview')).toEqual({ name: 'FitPose (Preview)', androidPackage: 'com.fitpose.app.preview', scheme: 'fitpose-preview' });
  });

  it('production y valor ausente usan el paquete base', () => {
    const prod = { name: 'FitPose', androidPackage: 'com.fitpose.app', scheme: 'fitpose' };
    expect(getVariant('production')).toEqual(prod);
    expect(getVariant(undefined)).toEqual(prod);
  });

  it('rechaza una variante desconocida', () => {
    expect(() => getVariant('staging')).toThrow(RangeError);
  });
});
