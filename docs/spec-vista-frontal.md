# Spec: los tres ejercicios de frente a la cámara

Fecha: 2026-10-30. Amplía `spec-cinematica.md`; en lo que no diga esta spec, manda aquella.
Plan de ejecución: `docs/superpowers/plans/2026-10-30-vista-frontal.md`.

## 1. Por qué y qué se decidió
Hoy la sentadilla y la flexión exigen ponerse **de lado** (`spec-cinematica` §2, §4.3 y §4.5). Así el usuario no ve la
pantalla ni las indicaciones mientras entrena. La cámara ya es la frontal (`device="front"`), así que el móvil puede
mirar al usuario con la pantalla hacia él.

**Decisiones del usuario (2026-10-30):**
- **Vista elegible.** En sentadilla y flexión el usuario elige **Frente** (por defecto) o **Lado** en la pantalla de
  colocación. El jumping jack es siempre de frente. El modo de lado no cambia y conserva sus tests.
- **Flexión de frente:**
  - los avisos de cadera (`PU_HIPS_SAG` y `PU_HIPS_PIKE`) solo existen de lado;
  - de frente se añaden codos abiertos (`PU_ELBOWS_FLARE`) y cabeza caída (`PU_HEAD_DROP`);
  - un spike con los landmarks 3D de MediaPipe intenta recuperar la cadera de frente (§6).
- Esto resuelve **D4** de `spec-cinematica` (la sentadilla de frente entra en el MVP, ya no como modo degradado) y
  deja **D2** como spike acotado (§6).

**Criterios** (los umbrales siguen siendo hipótesis [H] hasta medirlos):

| Prueba | Criterio |
|---|---|
| Simulación, conteo | 10/10 con σ 0,004 y 0,008, en todo el rango de colocación de §5 y con guiñada de ±15° |
| Simulación, falsos | 0 conteos en 60 s de pie, 60 s en plancha, al agacharse cerca de la cámara (§4.4) y al entrar o salir de la postura |
| Simulación, avisos | 0 avisos falsos en las series buenas (obligatorio); detección de cada falta ≥ 85 %, provisional |
| Teléfono, con persona | Pixel 7 Pro y S26 Ultra: conteo ≥ 95 % por vista y ejercicio; 0 avisos falsos en la serie buena; FPS sin empeorar |
| Lado | Sin regresiones: la suite actual y el benchmark sin cambios |

## 2. Principio: cocientes respecto al propio usuario
De frente, los ángulos de rodilla y codo en 2D no sirven: el muslo y el antebrazo se mueven hacia la cámara y se
acortan en la imagen (spec-cinematica §4.3, modo frontal). Las señales de frente son **distancias verticales divididas
por una referencia del mismo usuario**:
- en la sentadilla, la referencia es de pie;
- en la flexión, arriba con los brazos extendidos.

Se miden en IDLE armado o se toman del perfil de calibración. Así no dependen de la distancia ni de la altura del
móvil.

- Se escalan a **0-100** (100 = referencia) para reutilizar la máquina genérica (`fsm/machine.ts`) sin cambiarla: los
  umbrales y `revDeg` pasan a ser "puntos" en lugar de grados.
- La referencia se fija al armar, como **mediana de los últimos 500 ms en la zona de inicio**, y se congela durante
  la repetición. Si en IDLE armado la referencia actual difiere más de un 8 % de la del perfil de calibración, se usa
  la del perfil [H].
- Las faltas de forma se miden con **medianas en ventanas de ms**, nunca con máximos de fase (lección A1 en
  `.claude/rules/vision-cinematica.md`).

## 3. Sentadilla de frente
Articulaciones requeridas (ambos lados): hombros, caderas, rodillas y tobillos. La vista exigida es frontal (`r ≥ 0,60`,
`classifyView`).

**Señales:**
- `ρ` (principal) = `(yTobilloMedio − yCaderaMedia) / ρ_ref × 100`. Geometría verificada en `spec-cinematica` §4.3:
  - θk 170° → 99,6;
  - 120° → 85,4;
  - 100° → 74,7;
  - 90° → 68,5.
- `λ` (profundidad) = `(yRodillaMedia − yCaderaMedia) / λ_ref × 100`. Es el acortamiento del muslo: se acerca a 0
  cuando el muslo queda paralelo al suelo, pero depende de la altura del móvil. **Solo entra en `Q_rom`**, no en el
  conteo.
- `κ` (tronco) = `longitudTorso2D / κ_ref × 100`. Baja cuando el tronco se inclina hacia la cámara.
- `kneeRatio` = `|xRodillaI − xRodillaD| / |xTobilloI − xTobilloD|`.

**Tabla `SQUAT_FRONTAL_SPEC`** (valores iniciales [H], que se ajustan con la simulación de F1 sin bajar los criterios
de §1):

| Campo | Valor | Nota |
|---|---|---|
| `startThr` | 95 | armar con `ρ ≥ 95` durante 300 ms |
| `exitThr` | 93 | |
| `extremeThr` | 78 | ≈ θk 105° |
| `attemptMax` | 88 | banda de intento (78, 88] |
| `revDeg` | 3 | puntos |
| `tNoiseMs`, `stallMs`, `tMaxMs` | iguales que de lado | |

**Faltas:**
- `SQ_KNEES_IN`: mediana de `kneeRatio` en ±150 ms del fondo `< 0,85`. Severidad media.
- `SQ_TRUNK_LEAN`: mediana de `κ` en el fondo `< 57` (cos 55°), o `< κ_cal − 15` si hay calibración [H].
- `SQ_DEPTH_SHALLOW`, `SQ_TOO_FAST` y `SQ_TOO_SLOW`: igual que de lado.
- `SQ_HEELS_LIFT`: **solo de lado** (de frente el tobillo tapa el talón).

## 4. Flexión de frente
**Colocación.** El móvil va en el suelo, en vertical y apoyado, a 1-1,5 m delante de las manos, con la pantalla hacia
el usuario. Deben verse la cabeza, los hombros, los codos y las muñecas. Las caderas y los tobillos pueden quedar
tapados por el torso. Articulaciones requeridas: nariz, ambos hombros, codos y muñecas.

### 4.1 Postura de plancha vista de frente (sustituye a `ι`, que no se puede medir de frente)
Todas a la vez, con `w = anchoHombros2D`:
- las muñecas están por debajo de los hombros en la imagen (`yMuñecaMedia − yHombroMedio > 0,5·w`);
- `0,8·w ≤ |xMuñecaI − xMuñecaD| ≤ 2,5·w`;
- torso aparente acortado: `(yCaderaMedia − yHombroMedio) < 0,7·w`, o caderas con `v < 0,5`. Una persona de pie da
  ≈ 1,3·w;
- la nariz está por encima de las muñecas.

Sin postura no se arma (`PU_POSITION`, con texto de frente). En una repetición, más de 1 s sin postura es la falta
`PU_POSITION`. Es el mismo envoltorio que `pushUpStep`.

### 4.2 Señal y tabla
- `δ` (principal) = `((yMuñecaMedia − yHombroMedio) / w) / δ_ref × 100`. Arriba vale 100; abajo, con el pecho cerca
  del suelo, ≈ 25-40 según la altura del móvil (lo fija la simulación de F1).
- Al bajar, la cabeza se acerca a la cámara y `w` crece; como `δ` está dividida por `w`, eso se compensa solo.

**Tabla `PUSHUP_FRONTAL_SPEC`** [H]: `startThr 92`, `exitThr 88`, `extremeThr 55`, `attemptMax 75`, `revDeg 4`,
`armMs 500`. Tiempos iguales que de lado.

### 4.3 Faltas
- **`PU_ELBOWS_FLARE`** (nueva):
  - medida: `(|xCodoI − xHombroI| + |xCodoD − xHombroD|) / (2·w)`, con la mediana en ±150 ms del fondo;
  - aviso si es `> 0,55` [H] (codos a unos 45° del cuerpo es lo recomendado; abiertos a 90° dan ≈ 0,9 [H, F1]);
  - severidad media.
- **`PU_HEAD_DROP`** (nueva):
  - medida: `(yNariz − yHombroMedio) / w`, con la mediana del fondo frente a la mediana de arriba (500 ms antes de
    bajar);
  - aviso si baja más de 0,35·w [H];
  - severidad baja.
- `PU_DEPTH_SHALLOW`, `PU_TOO_FAST` y `PU_TOO_SLOW`: igual que de lado.
- `PU_HIPS_SAG` y `PU_HIPS_PIKE`: solo de lado. De frente dependen del spike de §6.

### 4.4 Defensa común: escala del cuerpo
Se añade por el hallazgo de la ronda 2 de B3: agacharse junto a la cámara contaba como sentadilla. De frente, el
usuario se acercará más a la pantalla, así que este caso es más frecuente.
- **Escala** = longitud del torso (sentadilla) o `w` (flexión) en IDLE armado, comparada con la del perfil de
  calibración.
- Si difiere más de un 25 % [H], **no se arma**. Si cambia más de un 25 % durante una repetición, la repetición se
  abandona sin contar (`REP_ABANDONED`).
- Sin perfil, se compara con la escala del primer armado de la sesión.
- Sentadilla de frente: además, cabeza (nariz) y tobillos deben estar dentro del cuadro durante toda la repetición
  (`OUT_OF_FRAME`).

## 5. Vista, calibración y app
- **Preferencia:** `Prefs.exerciseView: { squat: 'frontal' | 'lateral'; pushUp: 'frontal' | 'lateral' }`, con
  `'frontal'` por defecto. Va en `src/features/profile/prefs.ts`, con `parsePrefs` tolerante a valores viejos.
- **Motor:**
  - `EngineConfig.view` lo pasa la app desde la preferencia;
  - `defaultView` (`calibration/profile.ts`) pasa a devolver `'frontal'` en los tres ejercicios;
  - `resolveConfig` elige la tabla por `(ejercicio, vista)`;
  - `requiredJoints` depende también de la vista.
- **Vista equivocada:** con la vista elegida de frente y el usuario de lado durante más de 1 s, aparece
  `VIEW_WRONG_FRONT`; y al revés, `VIEW_WRONG_SIDE` (ya existen).
- **Calibración:**
  - el perfil guarda `view` y ahora también `scale`;
  - `calibrationStore` se indexa por **(ejercicio, vista)**, no solo por ejercicio. Así, cambiar de vista no
    reutiliza un perfil de la otra;
  - límites de frente: sentadilla `extremeThr ∈ [70, 88]`; flexión `[40, 70]`;
  - ROM mínima: `exitThr − extremeThr ≥ 10` puntos;
  - con umbrales permisivos en la calibración: `ρ ≤ 85` y `δ ≤ 70`.
- **Colocación sugerida** (textos y siluetas):
  - sentadilla y jumping jack: móvil en vertical a la altura de la cadera (0,6-1,2 m), a 2-3 m, cuerpo entero visible;
  - flexión: §4.
- **HUD a distancia:** el contador y el aviso deben leerse a 2-3 m, con contador ≥ 96 dp y aviso ≥ 28 dp. La voz ya
  existe.
- **Sin cambios en la sincronización:** la vista no se sube a Supabase en este plan. Queda como pregunta abierta
  (§7).

## 6. Spike 3D (world landmarks) para la cadera en la flexión de frente
- `HybridPoseLandmarker.kt` devuelve también `worldLandmarks()` (metros, centrados en la cadera) **detrás de un flag
  de desarrollo**, sin cambiar el contrato por defecto ni el coste por cuadro con el flag apagado.
- Se mide `θb3D` = ángulo hombro–cadera–tobillo en 3D, en plancha de frente, en el Pixel:
  - 60 s quieto en plancha buena;
  - 10 flexiones buenas;
  - 10 con cadera caída y 10 con cadera alta.
- **Entra en el MVP solo si** da 0 avisos falsos en lo bueno y detecta al menos el 85 % de cada falta. Si no, se
  informa con los números y la cadera de frente queda fuera.
- Referencia: la validación (preprint, sin revisión por pares) de BlazePose en ángulo de rodilla con una cámara da un
  RMSE de ~15° y depende del ángulo. Por eso esto es un spike y no una suposición.

## 7. Abierto
- ¿Subir la vista de cada sesión a Supabase para el historial? Necesita una migración; se decide tras F7.
- Ajuste fino de los umbrales [H] con un entrenador (spec-cinematica D7).
