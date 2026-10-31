# Plan: diseño v2 (Stitch actualizado), HUD y guías animadas de ejercicios

> **Para quien ejecuta.**
> - Las tareas `[codex]` las delega Claude Code en la PC con `/delegar-codex <id>`: worktree `feat/codex-<id>`,
>   entrega por SHA y política de `docs/colaboracion-agentes.md`. Claude Code revisa, pasa `npm run verify` e integra.
> - Las tareas `[claude]` las hace Claude Code.
> - Una tarea, un commit.
> - Specs: `docs/spec-diseno.md` (§11 nuevo, guías) y `docs/spec-vista-frontal.md` §5.
> - Stitch manda en lo visual: tras G0, los PNG v2 de `docs/diseno/stitch/`.

**Decisiones del usuario (2026-10-31):**
- una app más visual, con el mockup **actualizado** de Stitch;
- HUD renovados;
- **guías de cómo hacer cada ejercicio con un personaje ilustrado en Lottie**, que se ven **antes de empezar**
  (colocación) y **durante el ejercicio** (HUD).

**Reglas comunes:**
- tokens, i18n (es y en) y `useMotion()`;
- solo `transform` y `opacity`, y sin sombras;
- sin `any`;
- nombres de archivo que no difieran solo en mayúsculas;
- `npm run verify` en cada entrega;
- capturas del Pixel en `docs/diseno/capturas/` por bloque.

**Paralelo:**
- G0 (PC) y G1 → G2 (Codex) a la vez;
- después G3 → G4 → G4m;
- después G5.

`app/workout/*` y los `locales` también los toca la ruta rápida de vista de frente (Claude Code): **se serializan.**

---

## G0 `[claude]` Exportar el mockup v2 de Stitch (antes que todo lo visual)
- [ ] Exporta todas las pantallas del proyecto `17277584496938994624` con `herramientas/exportar-stitch.mjs`:
  - PNG y `code/*.html` en `docs/diseno/stitch/`;
  - `tema.md` y `tema.json` actualizados;
  - el v1 queda en el historial de git.
- [ ] `docs/diseno/stitch/CAMBIOS.md`:
  - pantallas nuevas, cambiadas y retiradas frente a v1, con una línea de qué cambia en cada una;
  - tokens nuevos o distintos frente a `src/ui/tokens.ts`;
  - y si hay ilustraciones o personajes en el mockup, de dónde salen.
- [ ] Actualiza `docs/diseno/stitch/README.md` (inventario) y manda un `tipo: estado` a la nube. Si hay pantallas
  nuevas, la nube amplía el mapa de `spec-diseno` §2 antes de G5.

## G1 `[codex]` Personaje Lottie propio generado por código
Es arte propio, como recomienda `docs/licencias-assets.md` §5, y no depende del mockup.
- [ ] `scripts/lottie/buildExerciseLottie.mjs`, que genera Lottie JSON (formato 5.x, 30 fps, 360×360) con un
  **personaje ilustrado plano**:
  - cabeza (círculo), torso y pelvis (formas redondeadas) y brazos y piernas en dos segmentos (cápsulas);
  - capas de forma emparentadas por articulación, rotando sobre la articulación;
  - sin cara ni rasgos;
  - colores **solo** de `src/ui/tokens.ts`: cuerpo ice o slate claro y acento teal en el lado cercano o en la
    articulación clave, sobre fondo transparente;
  - sin sombras ni degradados.
- [ ] **Movimiento:** los ángulos por cuadro salen de los generadores de `src/kinematics/tools/gen/`, con `camera`
  para la vista de frente (sentadilla 3D y flexión con `shoulderForwardM`; el jumping jack de frente). Así la guía
  hace exactamente lo que la app cuenta.
  - Si importar los generadores desde un `.mjs` es incómodo, se puede exportar antes una tabla de ángulos con un
    script TS vía vite `ssrLoadModule`, como `npm run replay`.
- [ ] Salida en `assets/lottie/exercises/`, en bucles de **1 repetición lenta** (2-3 s), con 0,3 s de pausa arriba:
  - `squat-front.json` y `squat-side.json`;
  - `pushup-front.json` y `pushup-side.json`;
  - `jj-front.json`.
- [ ] `npm run lottie:build`, que regenera los archivos (son reproducibles: misma entrada, mismo JSON).
- [ ] Test `scripts/lottie/buildExerciseLottie.test.mjs`:
  - JSON válido (`v`, `fr` 30, `ip`, `op`, `w`, `h` y `layers`);
  - cada archivo < 150 KB;
  - todos los colores están en `tokens`;
  - el primer y el último cuadro tienen los mismos valores (bucle sin salto);
  - salida determinista.
- [ ] `docs/licencias-assets.md`: una fila "Guías de ejercicio: arte propio generado por código (KYNET), sin
  terceros".
- [ ] Capturas de cada animación (3 cuadros: arriba, medio y fondo) en `docs/diseno/capturas/g1-*.png`, desde la
  página de muestra o un render.
- **Aprobación del usuario:** la nube le enseña las capturas. Si no le convence, se hace **G1-alt**:
  - buscar en LottieFiles animaciones **gratuitas con Lottie Simple License**, de frente, con la ficha revisada;
  - registrar URL, autor, licencia y fecha en `licencias-assets.md`;
  - recolorear con `colorFilters`;
  - no se usa ninguna sin el visto bueno del usuario, y nunca de pago.

## G2 `[codex]` Componente `ExerciseGuide`
- [ ] `src/ui/exerciseGuideSource.ts`, una función pura `guideSource(exercise, view)` que devuelve el
  `require(...)` de G1. El jumping jack siempre devuelve la de frente. Con test.
- [ ] `src/ui/ExerciseGuide.tsx`:
  - `LottieView` con `renderMode="HARDWARE"`, `autoPlay` y `loop`;
  - props `exercise`, `view`, `size` y `playing` (por defecto `true`);
  - con `useMotion().reduced`, cuadro fijo (el fondo de la repetición) y sin reproducir;
  - con `playing=false`, se congela en el cuadro actual.
- [ ] En la página de muestra `app/dev/ui.tsx`, las 5 guías.

## G3 `[codex]` Colocación con "Así se hace"
Incluye F5.1 y F5.2 del plan de vista de frente.

**Antes:** Claude Code confirma que su mínimo de pantalla de la ruta rápida está subido, para no pisarse en
`setup.tsx`.
- [ ] `app/workout/[exercise]/setup.tsx`:
  - tarjeta **"Así se hace"** con `ExerciseGuide` grande (≈ 200 dp) de la vista elegida y 2-3 consejos cortos por
    i18n (`guide.<exercise>.<view>.tips`). Ejemplos:
    - sentadilla: "Pies al ancho de hombros", "Baja como si te sentaras" y "Rodillas hacia fuera";
    - flexión de frente: "Manos bajo los hombros" y "Codos a 45° del cuerpo".
- [ ] **Selector Frente/Lado** (`Segmented`), solo en sentadilla y flexión:
  - guarda `Prefs.exerciseView`;
  - al cambiar, reinicia la colocación y la guía;
  - la vista sale de la función que ya existe en `src/features/workout/exerciseView.ts`.
- [ ] **Siluetas de frente** en `src/ui/silhouettes.ts` (sentadilla de frente y plancha vista desde el suelo), con
  `silhouetteFor(exercise, view)` y su test.
- [ ] Textos de colocación por vista (spec-vista-frontal §5):
  - sentadilla y jumping jack: "Móvil de frente, a la altura de la cadera, a 2-3 m";
  - flexión: "Móvil en el suelo, de frente, a 1-1,5 m de tus manos".
- [ ] El aspecto, de Stitch v2 (PNG de colocación si existe; si no, el sistema de `spec-diseno`).

## G4 `[codex]` HUD en vivo (Stitch v2)
Incluye E2.8 del plan de diseño y F5.3 de vista de frente.
- [ ] `app/workout/[exercise]/live.tsx`, según el PNG v2:
  - píldora "Análisis en tu dispositivo";
  - cronómetro;
  - tarjeta del ejercicio con serie y meta;
  - aviso en píldora (entra deslizando y se va a los 2,5 s);
  - Pausar y Finalizar con confirmación en hoja.
- [ ] **Legible a 2-3 m:** contador ≥ 96 dp con pop (escala 1 → 1,12 → 1, `snappy`) y aviso ≥ 28 dp, siempre con
  icono y texto.
- [ ] Esqueleto del 45 al 100 % de opacidad según la forma (transición de 220 ms).
- [ ] **Mini-guía:** `ExerciseGuide` de ≤ 96 dp en una esquina superior, sobre una píldora `hud`, **fuera del 70 %
  central**.
  - Prop `playing` controlada por la pantalla, para que G4m pueda congelarla mientras se cuenta.
  - Un toque la oculta o la muestra (preferencia de sesión).
- [ ] Solo `transform` y `opacity`; sin desenfoque, ni Skia extra, ni más Lottie sobre la cámara.

## G4m `[claude]` Medición del HUD
- [ ] `bash scripts/audit_performance.sh com.kynet.app.dev 300` en el Pixel 7 Pro y en el S26 Ultra, de frente, con
  persona o con fixture: **sin mini-guía y con mini-guía**.
- [ ] **Criterio:** FPS de inferencia y porcentaje de descartes con guía ≤ sin guía + 1 punto porcentual. Térmica y
  memoria estables.
- [ ] **Repliegue, en orden:**
  1. reproducir la guía solo con el motor en IDLE o en pausa y congelarla mientras cuenta;
  2. si sigue sin cumplir, quitarla del HUD y dejarla solo en la colocación.

  Informa a la nube con las dos mediciones.

## G5 `[codex]` Resto de pantallas según Stitch v2
- [ ] El orden de `2026-10-30-diseno-premium.md`: E2.1 Hoy → E2.2 Resumen → E2.3 Cuenta → E2.4 Progreso → E2.5
  Detalle → E2.6 Misiones y Perfil → E2.7 Onboarding y resto.
  - Referencia: PNG v2 y `CAMBIOS.md`.
  - Pantallas nuevas de v2: solo cuando la nube las haya añadido al mapa de `spec-diseno` §2.
- [ ] Después, E3 (Lottie de celebraciones con la Lottie Simple License revisada, "quitar animaciones" y capturas
  frente a Stitch).

**Criterio de aceptación del plan:**
- pantallas iguales que Stitch v2, con las diferencias justificadas por escrito;
- guías aprobadas por el usuario;
- "reducir movimiento" respetado (guías fijas);
- < 5 % de cuadros lentos fuera de la cámara;
- G4m cumplido o replegado con informe;
- `npm run verify` en verde.
