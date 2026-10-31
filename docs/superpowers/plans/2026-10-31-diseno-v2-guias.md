# Plan: guías de ejercicio con los diseños del usuario, ayuda tras 3 correcciones y pantallas v2

> **Para quien ejecuta: Claude Code en la PC.** Todas las tareas son `[claude]`.
> - El usuario trabaja **por su cuenta** con Codex y entrega los diseños y assets (por ejemplo, GIF en su carpeta de
>   Descargas). Claude Code los integra. Este plan no delega nada en Codex.
> - Una tarea, un commit, con TDD en la lógica pura y `npm run verify` en cada entrega.
> - Spec: `docs/spec-diseno.md` (§2 mapa con la bienvenida, §5 cámara y §11 guías).
>
> Rehecho el 2026-10-31 por el cambio de reparto del usuario.
> - G0 (Stitch v2, `cc934bb`) está hecho.
> - G1 (personaje Lottie por código, `4e69a3b`/`560cd95`) queda **sin usar**: las guías son los diseños del usuario.
>   Sus archivos no se conectan a la app y se retiran si el usuario lo confirma.
> - G2, la mini-guía permanente del HUD y G4m quedan fuera.

**Alcance ahora:**
- Solo existe la tarjeta del **jumping jack**. El usuario avisará cuando tenga las de sentadilla y flexión.
- El mecanismo se hace **genérico**, y se integra y prueba con el jumping jack.
- **No se crean animaciones provisionales.** Añadir una guía nueva es solo H1: copiar el archivo y añadir su
  entrada en el manifiesto.

**Reglas comunes:**
- tokens, i18n (es y en) y `useMotion()`;
- solo `transform` y `opacity`, sin sombras ni `any`;
- nombres de archivo que no difieran solo en mayúsculas.

---

## H1 Importar la guía del jumping jack
- [ ] Copia el GIF del usuario desde su carpeta de Descargas a `assets/guides/jumping-jack.gif`. Si no está claro
  cuál es, pregunta al usuario el nombre del archivo.
- [ ] **Límites:** ≤ 2 MB y ≤ 720 px de lado.
  - Si pasa, conviértelo a WebP animado en la PC con una herramienta gratuita y local (por ejemplo `ffmpeg` o
    `gif2webp`, con versión fija), sin subirlo a ningún servicio.
  - O pide al usuario uno más ligero.
  - Anota tamaño y dimensiones finales.
- [ ] Mide `loopMs`, la duración de un ciclo, sumando los retardos de los cuadros (con `ffprobe` o un script).
- [ ] `docs/licencias-assets.md`: "Guía del jumping jack: diseño del usuario (KYNET), creado con <herramienta que
  indique el usuario>, fecha". Si no lo sabes, pregúntale qué herramienta usó.

## H2 Manifiesto y preferencias
- [ ] `src/features/workout/guides.ts`: `guideFor(exercise, view)` → `{ source, loopMs } | null`.
  - Hoy solo tiene el jumping jack.
  - Si una sentadilla o flexión tiene una sola animación, vale para las dos vistas.
  - Test: el jumping jack devuelve su guía; sentadilla y flexión devuelven `null`.
- [ ] `src/features/profile/prefs.ts`, con `parsePrefs` tolerante y test:
  - `techniqueHelp: boolean`, `true` por defecto;
  - `guideSeen: { squat: boolean; jumpingJack: boolean; pushUp: boolean }`, todo `false` por defecto.
  - Si tocas `parseViews`, cambia el `as` por un type guard.

## H3 "Así se hace" la primera vez
- [ ] `src/ui/GuideCard.tsx`, con `expo-image` (~58.0.18, ya instalado):
  - la animación en bucle;
  - con `useMotion().reduced`, el primer cuadro fijo (`autoplay={false}`);
  - título y 2-3 consejos por i18n (`guide.<exercise>.tips`). Para el jumping jack: "Brazos arriba por los lados",
    "Pies se abren a la vez" y "Vuelve a cerrar del todo".
- [ ] `app/workout/[exercise]/setup.tsx`: si `techniqueHelp && !guideSeen[exercise] && guideFor(...) !== null`,
  **antes de la colocación** se muestra `GuideCard` a pantalla completa con:
  - **"Entendido"**, que marca `guideSeen[exercise]` y sigue a la colocación;
  - **"No mostrar más ayudas"**, que pone `techniqueHelp=false` y sigue.
- [ ] En la colocación, el enlace **"Ver cómo se hace"** (si hay guía) abre la misma tarjeta, sin tocar
  `guideSeen`.
- [ ] Captura en el Pixel en `docs/diseno/capturas/h3-*.png`.

## H4 Ayuda tras 3 correcciones seguidas
- [ ] Lógica pura `src/features/workout/techniqueHelp.ts`, con test:
  - **Corrección:** `REP` con resultado `incomplete` o `fault`, o `REP` válida con `faults` no vacío (falta de
    forma).
  - **Repetición limpia** (válida y sin faltas): contador a 0.
  - `PAUSE`, `RESUME` y `REP_ABANDONED` ni cuentan ni reinician.
  - Al llegar a **3 seguidas**, emite `SHOW_HELP` con el código de la última corrección, si `techniqueHelp` y hay
    guía, y si han pasado ≥ 60 s [H] desde la última ayuda. Después, el contador vuelve a 0.
  - Casos del test:
    - 3 seguidas dan 1 ayuda;
    - 2 seguidas, una limpia y 2 más dan 0;
    - una segunda racha antes de 60 s da 0, y después de 60 s da 1;
    - con `techniqueHelp=false` da 0;
    - sin guía da 0.
- [ ] `app/workout/[exercise]/live.tsx` y `useWorkoutSession.ts`, con `SHOW_HELP`:
  1. **pausa la sesión** (mismo mecanismo que Pausar; el tiempo no cuenta);
  2. abre la tarjeta emergente con `GuideCard` compacta y el texto de la corrección (`feedback.<code>`);
  3. se cierra sola a los `max(loopMs, 3000)` ms, o con "Seguir";
  4. **reanuda la sesión.**
- [ ] Es la única animación sobre la cámara y solo aparece **con la sesión en pausa** (`spec-diseno` §5).
- [ ] **Prueba en el teléfono** (Pixel), con jumping jack:
  - haz 3 repeticiones incorrectas seguidas (por ejemplo, brazos sin subir) → aparece la ayuda, se cierra sola y el
    conteo sigue bien;
  - con "Ayudas de técnica" desactivadas no aparece;
  - mira en el registro de desarrollo que tras reanudar no hay errores ni `PAUSE` extra.

## H5 Ajuste en Perfil
- [ ] Interruptor **"Ayudas de técnica"** (`techniqueHelp`) y botón **"Volver a ver las guías"** (pone `guideSeen` a
  `false`), en `app/(tabs)/profile.tsx`, con i18n.

## H6 Bienvenida (Stitch `05-bienvenida`, decisión del usuario)
- [ ] `app/onboarding.tsx`, paso 0:
  - logotipo con radar, "KYNET · Intelligent Fitness", tipografía y botones del mockup, **sin resplandor**;
  - **"Empezar"** (primario teal, 52 dp) sigue el onboarding actual;
  - **"Ya tengo cuenta"** (secundario slate, 48 dp) llama a `signInWithGoogle` (`src/auth/accountService.ts`) y solo
    aparece si `loginAvailable`.
- [ ] **La edad no se salta:** si no hay fecha de nacimiento local, se pide aunque haya sesión. Test de la lógica
  de pasos.
- [ ] Sin Facebook, Apple, email ni "crear cuenta".

## H7 Resto del diseño (después de H1-H6)
- [ ] E2.1 → E2.7 de `2026-10-30-diseno-premium.md`, con los PNG v2. El HUD en vivo es E2.8, más F5.3 de vista de
  frente: contador ≥ 96 dp y aviso ≥ 28 dp, **sin mini-guía**. Su medición `audit_performance.sh` va en E2.8.
- [ ] Cuando el usuario entregue más diseños (tarjetas de sentadilla y flexión, u otras pantallas), H1 y el
  manifiesto, o la pantalla que corresponda.

**Criterio de aceptación:**
- el jumping jack muestra "Así se hace" la primera vez y no la segunda;
- la ayuda aparece tras 3 correcciones seguidas, pausa, se cierra y reanuda;
- todo se puede desactivar desde la tarjeta y desde Perfil;
- "reducir movimiento" respetado;
- `npm run verify` en verde;
- prueba en el Pixel con capturas.
