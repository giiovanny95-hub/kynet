export interface AppVariant {
  readonly name: string;
  readonly androidPackage: string;
  readonly scheme: string;
}

const BASE_PACKAGE = 'com.kynet.app';

const VARIANTS: Readonly<Record<'development' | 'preview' | 'production', AppVariant>> = {
  development: { name: 'KYNET (Dev)', androidPackage: `${BASE_PACKAGE}.dev`, scheme: 'kynet-dev' },
  preview: { name: 'KYNET (Preview)', androidPackage: `${BASE_PACKAGE}.preview`, scheme: 'kynet-preview' },
  production: { name: 'KYNET', androidPackage: BASE_PACKAGE, scheme: 'kynet' },
};

/** Variante de la app según `APP_VARIANT`; sin valor es producción. */
export function getVariant(env: string | undefined): AppVariant {
  const key = env ?? 'production';
  if (key !== 'development' && key !== 'preview' && key !== 'production') {
    throw new RangeError(`APP_VARIANT desconocida: ${key}`);
  }
  return VARIANTS[key];
}
