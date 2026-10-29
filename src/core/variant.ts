export interface AppVariant {
  readonly name: string;
  readonly androidPackage: string;
  readonly scheme: string;
}

const BASE_PACKAGE = 'com.fitpose.app';

const VARIANTS: Readonly<Record<'development' | 'preview' | 'production', AppVariant>> = {
  development: { name: 'FitPose (Dev)', androidPackage: `${BASE_PACKAGE}.dev`, scheme: 'fitpose-dev' },
  preview: { name: 'FitPose (Preview)', androidPackage: `${BASE_PACKAGE}.preview`, scheme: 'fitpose-preview' },
  production: { name: 'FitPose', androidPackage: BASE_PACKAGE, scheme: 'fitpose' },
};

/** Variante de la app según `APP_VARIANT`; sin valor es producción. */
export function getVariant(env: string | undefined): AppVariant {
  const key = env ?? 'production';
  if (key !== 'development' && key !== 'preview' && key !== 'production') {
    throw new RangeError(`APP_VARIANT desconocida: ${key}`);
  }
  return VARIANTS[key];
}
