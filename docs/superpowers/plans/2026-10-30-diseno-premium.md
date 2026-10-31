# Plan: diseño premium (Stitch + movimiento)

> **Para quien ejecuta (PC):** `superpowers:executing-plans` y TDD en la lógica pura. Una tarea, un commit. Antes
> de cada pantalla, abre su PNG en `docs/diseno/stitch/` y la sección de `docs/spec-diseno.md`. Al final de cada
> bloque: `cerrar-sesion` y un `tipo: estado` con capturas del Pixel en `docs/diseno/capturas/`.

**Objetivo:** las pantallas de la app con el aspecto de Stitch y el sistema de movimiento de la spec, sin bajar el
rendimiento del entrenamiento.

**Reglas comunes:**
- colores, tipografía, espaciado y radios **solo** desde `src/ui/tokens.ts`;
- textos solo por i18n (es y en);
- animar solo `transform` y `opacity`, y la barra con `width` vía `layout`;
- cada animación pasa por `useMotion()`;
- **sin sombras.**

**Verificación mínima por tarea:** `npm run typecheck`, `lint`, `test` e `i18n:check`. Por bloque, además,
`npx expo export --platform android` y capturas en el Pixel.

---

## Bloque E0: base (sin cambios visibles)
- [ ] **E0.1 Paquetes** (aprobados; versiones del SDK 58, `--save-exact`):
  - `react-native-gesture-handler@~3.3.0`, `react-native-svg@15.16.0` y `expo-linear-gradient@~58.0.3`;
  - `lottie-react-native@~7.5.0`;
  - `lucide-react-native` en una versión publicada hace al menos 2 semanas.

  Envolver la raíz en `GestureHandlerRootView` (`app/_layout.tsx`). Recompilar el dev client y anotar en
  `decisions.md`.
- [ ] **E0.2 Tokens** en `src/ui/tokens.ts`: `type`, `space`, `radius` y los colores `hud`, `tealSoft` y `teal45`
  (spec §3).
  - Test `src/ui/tokens.test.ts`: ninguna entrada de `type` usa `fontWeight`, y todas las familias existen en
    `fonts`.
- [ ] **E0.3 Movimiento** (`src/ui/motion.ts`, `src/ui/useMotion.ts`, spec §4): duraciones, curvas, muelles y
  `stagger(i)`.
  - Test: `stagger` limita a 6; con `reduced`, las duraciones son 0.
- [ ] **E0.4 Vibraciones** (`src/ui/haptics.ts`): `tap`, `rep`, `success` y `warning`, que respetan la preferencia
  `haptics` de `prefs`.
  - Nueva preferencia `haptics: boolean`, con `true` por defecto, en `src/features/profile/prefs.ts` y su test.
- [ ] **E0.5 Títulos de nivel** (`src/gamification/levelTitle.ts`, spec §7): `levelTitle(level)` →
  `{ titleKey, rankKey }`.
  - Test de los bordes: 2, 3, 5, 6, 9, 10, 14 y 15.

## Bloque E1: componentes (`src/ui/`; cada uno en su archivo, `kit.tsx` los reexporta)
- [ ] **E1.1** `PressableScale`. `Button` pasa a usarlo, con primario de 52 dp y secundario de 48 dp. `Card` usa
  `radius.card` y el borde de 1 px.
- [ ] **E1.2** `AnimatedNumber`. La interpolación es una función pura con test: valores enteros y monotonía.
- [ ] **E1.3** `ProgressBar` rehecha con degradado y `gentle`, y `ProgressRing` en Skia.
  - Test puro de `ringPath(progress)`: 0 da trazo vacío y 1 el círculo completo.
- [ ] **E1.4** `StaggerIn`, `StreakFlame` y `XpToast`.
- [ ] **E1.5** `Confetti` en Skia.
  - Generador de partículas puro y determinista con semilla, con test: número de partículas, colores solo de
    `tokens` y vida máxima de 1,2 s.
  - Con `reduced` no se monta.
- [ ] **E1.6** `TabBar` animada con iconos Lucide, sustituyendo la de `app/(tabs)/_layout.tsx`, y `Segmented`.
- [ ] **E1.7** `Skeleton` de carga para el estado `data === null` de las pestañas.
- [ ] **E1.8** Página de muestra solo en desarrollo, `app/dev/ui.tsx`, con todos los componentes, para las capturas
  y la medición de FPS.
  - **Medición:** en el Pixel, `adb shell dumpsys gfxinfo com.kynet.app.dev` al recorrer la página. Criterio: menos
    del 5 % de cuadros lentos ("janky").

## Bloque E2: pantallas (una tarea por pantalla, en este orden)
- [ ] **E2.1 Hoy** (`app/(tabs)/index.tsx`, PNG `01-hoy`):
  - encabezado con fecha y saludo, e iniciales en lugar de avatar;
  - "Tu actividad" con `AnimatedNumber` y `StreakFlame`;
  - objetivo semanal;
  - tarjeta "¿Listo para entrenar?";
  - "Entrena a tu manera" con los 3 ejercicios y su plan;
  - nivel con título y rango;
  - misiones de hoy;
  - "Ver todas las misiones".

  Coreografía de spec §5. La lógica nueva va en funciones puras con test: actividad del día y objetivo semanal en
  `src/features/progress/today.ts`.
- [ ] **E2.2 Resumen** (`app/workout/summary.tsx`, PNG `02`, parte de resumen): secuencia de spec §5. Celebración
  con `Confetti` y Lottie al subir de nivel o completar las 3 misiones. "Guardar mi progreso" abre
  `app/account.tsx`.
- [ ] **E2.3 Cuenta y login** (`app/account.tsx`, nueva, PNG `04`):
  - estados inicial, conectando, error y sin conexión, con `signInWithGoogle` y `loginAvailable` de
    `src/auth/accountService.ts`;
  - la ilustración del esqueleto en SVG o Skia, estática, con un pulso suave en el punto activo;
  - Perfil enlaza aquí en lugar del botón actual.
- [ ] **E2.4 Progreso combinado** (`app/(tabs)/progress.tsx`, PNG `03`):
  - métricas, racha y 7 días;
  - segmentos y chips;
  - tarjetas por día con XP, válidas, forma y consejo;
  - estado vacío y "+ Nuevo entreno".

  Funciones puras con test en `src/features/progress/history.ts`: filtro por periodo y ejercicio, agrupación por
  día y consejo (la falta más frecuente).
- [ ] **E2.5 Detalle de sesión** (`app/workout/session/[id].tsx`, nueva): duración, válidas/total, barras de forma
  por repetición (Skia) con la línea del 80 % y el consejo.
- [ ] **E2.6 Misiones y Perfil:** mismo sistema. En Misiones, check animado y "+XP". En Perfil, nivel con título,
  ajustes con `Segmented` y el interruptor de vibración nuevo.
- [ ] **E2.7 Onboarding, aviso médico, ejercicios y colocación:** mismo sistema, con transición horizontal entre
  pasos y barra de progreso.
- [ ] **E2.8 Entrenamiento en vivo** (`app/workout/[exercise]/live.tsx`, PNG `02`, parte en vivo), **la última y
  con medición**:
  - píldora "Análisis en tu dispositivo", cronómetro y tarjeta del ejercicio con fondo `hud`, sin desenfoque;
  - contador con pop;
  - aviso en píldora;
  - Pausar y Finalizar con confirmación en hoja;
  - esqueleto del 45 % al 100 % con buena forma.

  **Criterio:** `bash scripts/audit_performance.sh com.kynet.app.dev 300` en el Pixel, con persona o con fixture,
  sin empeorar respecto a la medición previa (30 FPS de inferencia y descartes en el mismo orden). Si empeora,
  quitar efectos hasta recuperarlo e informar.

## Bloque E3: Lottie y cierre
- [ ] **E3.1** Elegir 3 animaciones de LottieFiles (subida de nivel, misión completada y estado vacío) con la Lottie
  Simple License.
  - Revisar la ficha de cada una.
  - Recolorear a `tokens` con `colorFilters`.
  - Guardarlas en `assets/lottie/`, de menos de 150 KB cada una.
  - Registrar URL, autor y licencia en `docs/licencias-assets.md`.
- [ ] **E3.2** Prueba con "Quitar animaciones" de Android activado: sin confeti, sin bucles y sin Lottie; las cifras
  aparecen en su valor final.
- [ ] **E3.3** Capturas finales de cada pantalla junto a su PNG de Stitch (`docs/diseno/capturas/`), con una lista
  de diferencias. Mensaje `tipo: estado` a la nube para revisión.

**Criterio de aceptación del plan:**
- las pantallas coinciden con Stitch (diferencias justificadas por escrito);
- menos del 5 % de cuadros lentos en las pantallas sin cámara;
- el entrenamiento no empeora;
- "reducir movimiento" respetado;
- todos los checks en verde.
