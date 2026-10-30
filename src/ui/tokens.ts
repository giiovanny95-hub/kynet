/** Colores, medidas y tipografías de KYNET (`docs/marca/kynet.md`). */
export const tokens = {
  bg: '#080F14', // Midnight
  card: '#101A22', // Deep Surface
  surface: '#1E2C3A', // Slate: navegación y paneles
  border: '#263640',
  text: '#EBEEF2', // Ice White
  muted: '#8FA3B8',
  accent: '#00E5C8', // Electric Teal
  secondary: '#00A896', // Deep Teal
  onAccent: '#080F14', // texto Midnight sobre teal: el blanco no da contraste
  success: '#22C997',
  warn: '#F5B942',
  danger: '#FF5C69',
  overlay: '#080F14b3',
  radius: 16,
  radiusButton: 12,
} as const;

/** Familias cargadas en `app/_layout.tsx`. En Android cada peso es una familia: no combinar con `fontWeight`. */
export const fonts = {
  /** Montserrat: títulos, cifras destacadas y marca. */
  display: 'Montserrat_800ExtraBold',
  title: 'Montserrat_700Bold',
  heading: 'Montserrat_600SemiBold',
  /** Inter: interfaz, etiquetas y datos. */
  body: 'Inter_400Regular',
  label: 'Inter_500Medium',
  strong: 'Inter_600SemiBold',
} as const;
