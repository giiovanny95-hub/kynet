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
  /** Píldoras sobre la cámara (Slate al 85 %), sin desenfoque (spec-diseno §3). */
  hud: 'rgba(30,44,58,0.85)',
  /** Teal al 12 %: chips y fondo del "+XP". */
  tealSoft: '#00E5C81F',
  /** Teal al 45 %: esqueleto en reposo. */
  teal45: '#00E5C873',
  radius: 16,
  radiusButton: 12,
} as const;

/** Espaciado en múltiplos de 4: margen de pantalla `lg`, entre tarjetas `md` y entre secciones `xl`. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { chip: 6, control: 12, card: 16, pill: 9999 } as const;

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

/**
 * Escala tipográfica de Stitch (`docs/diseno/stitch/tema.md`): tamaño/interlineado en px y espaciado de letra
 * (em × tamaño). El peso va en la familia; `labelCaps` (700 en Stitch) usa Inter 600, el más grueso cargado.
 */
export const type = {
  displayHero: { fontFamily: fonts.display, fontSize: 56, lineHeight: 64, letterSpacing: -1.68 },
  displayLg: { fontFamily: fonts.display, fontSize: 44, lineHeight: 52, letterSpacing: -0.88 },
  displayMd: { fontFamily: fonts.title, fontSize: 32, lineHeight: 40, letterSpacing: -0.64 },
  headlineLg: { fontFamily: fonts.title, fontSize: 24, lineHeight: 32, letterSpacing: -0.24 },
  headlineMd: { fontFamily: fonts.heading, fontSize: 20, lineHeight: 28, letterSpacing: -0.2 },
  titleSm: { fontFamily: fonts.heading, fontSize: 16, lineHeight: 22, letterSpacing: 0 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, letterSpacing: 0 },
  bodySm: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  labelCaps: { fontFamily: fonts.strong, fontSize: 12, lineHeight: 16, letterSpacing: 0.72 },
  metricLg: { fontFamily: fonts.display, fontSize: 48, lineHeight: 52, letterSpacing: -1.44 },
  metricMd: { fontFamily: fonts.title, fontSize: 28, lineHeight: 34, letterSpacing: -0.56 },
} as const;
