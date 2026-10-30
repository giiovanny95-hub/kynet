# Spec de diseño: módulo de cinemática (Parte 2)

Estado: borrador para aprobación. Alcance: sentadilla, jumping jack y flexión. Entradas: `requirements.md` y `pose-spike-research.md`. Sin código de producto; los fragmentos son ilustrativos. Los números marcados **[V]** se verificaron con simulaciones numéricas propias (sección 11); los **[H]** son hipótesis iniciales que deben ajustarse con fixtures grabados.

## 0. Principios y contrato

- Módulo **puro, sin RN, sin cámara, sin reloj propio**: `step(state, frame) -> { state, events, hud }`. El tiempo viene solo de `frame.tMs` (timestamp de cámara, monótono). Nada de `Date.now()`, `Math.random()`, `console`, clases con métodos ni closures sobre objetos no serializables.
- Corre dentro de un worklet. Cada función exportada lleva `'worklet'` (inocuo en Vitest); un test de lint comprueba que ninguna exportada lo omita. El estado es un objeto plano serializable (unos cientos de bytes); crear uno nuevo por cuadro (30/s) es despreciable. Riesgo abierto R1 (importar módulos desde worklets).
- TypeScript `strict`, sin `any`, sin `as` salvo en el adaptador de entrada. Landmarks, config y perfiles son `Readonly`/`readonly`.
- El módulo emite **códigos**, nunca texto. El texto en español sale de i18n (`kin.<ejercicio>.<codigo>`).
- Coordenadas internas: **unidades de alto de cuadro, orientación vertical del usuario** (`x' = x·W/H`, `y' = y`). Así la métrica es isótropa y los ángulos no se deforman. Motivo [V]: un segmento real de 45° en un cuadro 720x1280 sale a 29,4° si se usan coordenadas normalizadas sin corregir (error de 15,6°).

## 1. Adaptador de landmarks y tipos

Se trabaja con 13 articulaciones canónicas comunes a COCO-17 y BlazePose-33, más 4 opcionales solo de 33 puntos.

```ts
export type JointId =
  | 'nose' | 'lEye' | 'rEye' | 'lEar' | 'rEar'
  | 'lShoulder' | 'rShoulder' | 'lElbow' | 'rElbow' | 'lWrist' | 'rWrist'
  | 'lHip' | 'rHip' | 'lKnee' | 'rKnee' | 'lAnkle' | 'rAnkle'
  | 'lHeel' | 'rHeel' | 'lFootIndex' | 'rFootIndex';          // las 4 últimas: solo 33

export interface ModelSpec {
  readonly id: 'movenet17' | 'blazepose33';
  readonly count: 17 | 33;
  readonly hasZ: boolean;                       // MoveNet false
  readonly index: Readonly<Partial<Record<JointId, number>>>;
  readonly layout: 'yxs' | 'xyzv';              // MoveNet entrega (y, x, score); MediaPipe (x, y, z, visibility)
  readonly visThreshold: number;                // 0.65 inicial en ambos; se recalibra por modelo
  readonly capabilities: Readonly<{ heel: boolean; footIndex: boolean; z: boolean }>;
}

export interface Landmark { readonly x: number; readonly y: number; readonly z: number; readonly v: number }
export interface FrameMeta {
  readonly tMs: number;                          // timestamp de cámara, ms
  readonly width: number; readonly height: number;   // tamaño del cuadro tras rotar a vertical
  readonly rotation: 0 | 90 | 180 | 270; readonly mirrored: boolean;
}
export interface PoseFrame { readonly meta: FrameMeta; readonly model: ModelSpec['id']; readonly raw: readonly Landmark[] }
export interface Pose { readonly tMs: number; readonly joints: Readonly<Partial<Record<JointId, Landmark>>>; readonly torso: number | null }
```

Índices: COCO `nose0 lEye1 rEye2 lEar3 rEar4 lSh5 rSh6 lEl7 rEl8 lWr9 rWr10 lHip11 rHip12 lKn13 rKn14 lAnk15 rAnk16`. BlazePose `nose0 lEye2 rEye5 lEar7 rEar8 lSh11 rSh12 lEl13 rEl14 lWr15 rWr16 lHip23 rHip24 lKn25 rKn26 lAnk27 rAnk28 lHeel29 rHeel30 lFoot31 rFoot32`.

Precondiciones del adaptador (documentadas y con tests):
1. MoveNet devuelve `[y, x, score]` en espacio del recorte; la capa nativa/worklet **debe** reproyectar al cuadro completo antes de llamar al módulo.
2. `toUpright` aplica `rotation` y `mirrored` (el espejo intercambia izquierda y derecha).
3. `score` de MoveNet y `visibility` de MediaPipe no tienen la misma distribución; por eso `visThreshold` es por modelo.
4. Una articulación ausente en el modelo no aparece en `joints`; las señales declaran `requires: JointId[]` y `optional: JointId[]`. Si falta un requerido, la señal es `null` y la FSM degrada (por ejemplo, sin `lHeel` no existe `SQ_HEELS_LIFT`).
5. Fixtures JSON usan `p: number[]` plano (`x,y,z,v` por punto) y el adaptador `fromFlat`.

## 2. Visibilidad y oclusión

- `required(ejercicio, vista, lado)` define el conjunto de articulaciones. Sentadilla y flexión (lateral): hombro, cadera, rodilla, tobillo (flexión añade codo y muñeca) **del lado cercano**. Jumping jack (frontal): ambos hombros, caderas, muñecas y tobillos.
- `meanVis` = media de `v` de las requeridas, por cuadro. **Pausa** tras 3 cuadros consecutivos con `meanVis < 0.65` (100 ms a 30 FPS, 150 ms a 20 FPS). **Reanuda** con `meanVis >= 0.70` durante 5 cuadros (histéresis, evita parpadeo).
- Además, una articulación con `v < 0.30` invalida solo las señales que la usan (la FSM mantiene el estado, no avanza).
- Selección de lado (lateral): se elige el lado con mayor visibilidad media de la ventana de 15 cuadros; solo cambia si el otro supera por 0.15 durante 1 s. Tras calibrar el lado queda fijado en la sesión.
- Oclusión corta (<= 200 ms, 6 cuadros a 30 FPS): se conserva el último valor filtrado sin extrapolar y no se alimenta el filtro. Mayor a 250 ms: el filtro de esa articulación se reinicia al reaparecer.
- Estado `PAUSED` (flag ortogonal a la FSM): congela estado y temporizadores (el tiempo en pausa no cuenta en la duración de la repetición). Si la pausa dura > 3 s con repetición en curso: se abandona (sin evento de repetición, evento `REP_ABANDONED`) y vuelve a IDLE sin armar.
- Causas de pausa (códigos): `VIS_LOW`, `OUT_OF_FRAME` (articulación requerida a menos de 2 % del borde), `VIEW_INVALID`, `SUBJECT_CHANGED`.
- **Persona distinta / dos personas**: los modelos son de una sola pose y pueden saltar a otra persona. Se rechaza el cuadro como outlier si la longitud de torso (punto medio hombros a punto medio caderas) cambia > 30 % entre cuadros aceptados, o el centro de caderas salta > 0.5 longitudes de torso en un cuadro (7 m/s, imposible). 3 rechazos seguidos: se acepta como sujeto nuevo, se reinicia filtros y FSM y se emite `SUBJECT_CHANGED`.
- **Validación de vista** (cociente `r = anchoHombros2D / longitudTorso2D`; frontal teórico ≈ 0.8, `r = 0.8·cos(guiñada)`): frontal válida si `r >= 0.60` (guiñada <= 41°), lateral válida si `r <= 0.35` (guiñada >= 64°) [V]. Entre ambos: `VIEW_AMBIGUOUS` (aviso, sigue contando). Jumping jack exige frontal; sentadilla y flexión, la vista que elija el usuario (frontal por defecto desde 2026-10-30, ver `spec-vista-frontal.md`).

## 3. Filtro One-Euro

### 3.1 Qué estaba mal en los informes [V]
1. **Alcance parcial.** Hay que filtrar **todas** las coordenadas de **todas** las articulaciones usadas: x, y (y z si existe), una instancia por canal. Dejar sin filtrar una (en la simulación, el tobillo) hace que el ángulo de rodilla herede su ruido: con σ=0.008 y umbral de inversión de 8° el conteo fallaba el 21 % de las repeticiones (media 7.9/10); filtrando todo, 10/10 en 30 semillas.
2. **Parámetros sin escala.** `beta = 0.007` está pensado para píxeles. En unidades de alto de cuadro (velocidad típica 0.15 u/s en cadera de sentadilla), `beta·|dx| ≈ 0.001 Hz`: es inerte y el filtro queda fijo en `fc_min = 1 Hz`, con **retardo ≈ 133 ms** y en jumping jack **atenúa la amplitud de la muñeca al 65 %** (picos recortados, umbral de brazos inalcanzable).
3. **Timestamps.** `alpha` debe calcularse con el `Te` real de cada cuadro, no con `1/fps`.

### 3.2 Algoritmo (por canal)
```ts
// alpha(Te, fc) = 1 / (1 + tau/Te), tau = 1/(2*PI*fc)
function filterStep(s: OneEuroState | null, tSec: number, x: number, p: OneEuroParams): OneEuroState {
  'worklet';
  if (s === null || tSec - s.t > p.maxGapSec) return { t: tSec, xRaw: x, xHat: x, dHat: 0 }; // arranque o hueco largo
  const te = tSec - s.t;
  if (te < p.minTeSec) return s;                         // timestamp duplicado o casi: ignora el cuadro
  const dRaw = (x - s.xRaw) / te;
  const dHat = s.dHat + alpha(te, p.dCutoff) * (dRaw - s.dHat);
  const fc = p.fcMin + p.beta * Math.abs(dHat);
  const xHat = s.xHat + alpha(te, fc) * (x - s.xHat);
  return { t: tSec, xRaw: x, xHat, dHat };
}
```
- `minTeSec = 0.002` (cuadros casi simultáneos se ignoran), `maxGapSec = 0.25` (reinicio), timestamps no monótonos: el cuadro se descarta y se cuenta en métricas.
- Cuadros perdidos por contrapresión (20 a 30 FPS efectivos): no requieren tratamiento, `Te` crece y `alpha` se adapta. Con jitter de timestamp ±6 ms los resultados no cambian [V].
- Articulación con `v < 0.30`: no alimenta el filtro ni actualiza `t` (el hueco largo la reinicia).
- Se filtra **antes** de calcular ángulos. Los ángulos no se vuelven a filtrar (evita doble retardo).

### 3.3 Parámetros iniciales [V en simulación a 30 FPS, ruido σ=0.004 alto de cuadro]
| Parámetro | Informes | Propuesta | Razón |
|---|---|---|---|
| `fcMin` | 1.0 Hz | **1.5 Hz** | ruido en reposo 0.004 a ~0.0016 (x0.40 medido; ver nota) |
| `beta` (unidades de alto por segundo) | 0.007 | **8** | a 3 u/s de muñeca en jumping jack sube fc a ~25 Hz |
| `dCutoff` | 1.0 | 1.0 | sin cambio |

Resultados comparados (retardo / amplitud pico a pico / jitter en reposo):

| Config | Sentadilla | Jumping jack (P=0.9 s) |
|---|---|---|
| Informes (1.0, 0.007) | 133 ms / 0.96 / 0.0013 | 100 ms / **0.65** / 0.0013 |
| Propuesta (1.5, 8) | 67 ms / 1.02 / 0.0013 | **33 ms** / 0.99 / 0.0014 |

**Nota (implementación, 2026-10-29):** con `fcMin` 1,5 Hz a 30 FPS una EMA pura deja √(α/(2−α)) = 0,368·σ (α = 0,239) y el término `beta` sube `fc` a ~1,8 Hz con el ruido de la derivada: medido 0,40·σ en 3 semillas. La cifra 0,0013 (x0,33) y la restricción "jitter <= 0.35·σ" no son alcanzables con estos parámetros; la prueba usa <= 0,45·σ y la rejilla debe usar ese límite o bajar `fcMin`.

Ajuste: **búsqueda en rejilla** offline sobre los fixtures (`fcMin ∈ {1,1.5,2,3}`, `beta ∈ {2,4,8,12}`) con restricciones: jitter en reposo <= 0.35·σ_crudo, retardo <= 70 ms, razón de amplitud ∈ [0.97, 1.07]; entre las que cumplen, minimizar RMSE. Sube `fcMin` si se nota lentitud; sube `beta` si hay retardo en movimientos rápidos; baja `fcMin` si el esqueleto/ángulos tiemblan en reposo. Por ejercicio se permite un override (`jumpingJack.beta`). El retardo medio (~50 ms) se asume en todos los umbrales de tiempo.

## 4. Señales y FSM unificada

### 4.1 Geometría
```ts
// ángulo sin signo en [0,180], estable en 0 y 180 (no usa acos)
const angle2D = (a: P, b: P, c: P) => Math.abs(Math.atan2(cross(a-b, c-b), dot(a-b, c-b))) * 180 / Math.PI;
const signedAngle2D = ...   // misma fórmula sin abs; se usa para distinguir cadera caída/elevada
// 3D (solo blazepose33, opcional): acos(clamp(dot(u,v)/(|u||v|), -1, 1)), con z escalada igual que x
```
Verificado: 90° → 90.0, 180° → 180.0, 0° → 0.0 [V]. **Decisión:** las señales primarias son 2D en la vista recomendada (la z de MediaPipe es ruidosa y MoveNet no tiene z); el 3D queda detrás de un flag para vistas oblicuas (D2). Ruido medido: con σ_landmark = 0.004 el ángulo de rodilla (muslo 0.15, pantorrilla 0.145) tiene σ ≈ 3.1–3.8° y el de codo (antebrazo 0.11, brazo 0.12) ≈ 3.8°–5° sin filtrar; tras One-Euro ≈ 1.3° [V]. Por eso las histéresis son >= 8–10° (>= 5σ filtrado).

### 4.2 Estados
`IDLE, DESCENDING, INFLECTION, ASCENDING, COMPLETED, FAULT` (+ flag `paused`). Los nombres son genéricos: DESCENDING = fase de ida (bajar / abrir / flexionar codo), INFLECTION = extremo, ASCENDING = retorno. Cada ejercicio define una **señal principal** `s(t)` (ángulo o razón), con una `zona de inicio`, una `zona extrema` y parámetros comunes:

| Parámetro | Significado |
|---|---|
| `startThr` / `exitThr` | entrar a zona de inicio / salir de ella (histéresis `startThr - exitThr` = 10°) |
| `extremeThr` | alcanzar el extremo (cuenta la profundidad) |
| `revDeg` | inversión mínima desde el extremo para cambiar de fase: 8° |
| `armMs` | permanencia en zona de inicio para "armar": 300 ms |
| `confirmFrames` | cuadros consecutivos para confirmar un cruce: 2 |
| `tNoise` | duración mínima de una repetición (por debajo es ruido y se ignora sin evento) |
| `tStall*` | máximos por fase antes de FAULT |

Reglas generales:
- `IDLE -> DESCENDING`: armado, y `s` cruza `exitThr` (2 cuadros).
- `DESCENDING -> INFLECTION`: `s` cruza `extremeThr`.
- `DESCENDING -> IDLE` (**repetición incompleta**): inversión > `revDeg` sin llegar al extremo. Si el mínimo alcanzado entró en la "banda de intento" (ver tablas) se emite `REP{outcome:'incomplete'}`; si no, se ignora (agacharse a atarse el zapato no es repetición). Queda sin armar hasta volver a la zona de inicio.
- `INFLECTION -> ASCENDING`: inversión > `revDeg`; se registra extremo y `tBottom`.
- `ASCENDING -> COMPLETED`: `s` regresa a `startThr`. Si `D >= tNoise` emite `REP{outcome:'valid'}` con puntuación; se evalúan faltas suaves. `COMPLETED -> IDLE` en el cuadro siguiente (armado).
- `ASCENDING -> INFLECTION`: re-descenso con inversión > `revDeg` (rebote); sigue siendo la misma repetición.
- `* -> FAULT`: **falta crítica** (no cuenta): tiempo de fase > `tStall*`, `D > tMax`, postura inválida (flexión no horizontal) durante > 1 s. Emite `REP{outcome:'fault', code}`. `FAULT -> IDLE`: señal en zona de inicio 300 ms, o 5 s.
- **Falta suave**: la repetición cuenta, pero baja la calidad (`P_form`) y emite feedback.
- Con `paused` la FSM no avanza (ver sección 2).

Tres resultados de repetición: **válida** (cuenta), **incompleta** (no cuenta, avisa de la causa) y **falta de forma** crítica (`fault`, no cuenta). Las faltas suaves no cambian el conteo.

### 4.3 Sentadilla (lateral, lado cercano) [V sim. en geometría 2D]
La sentadilla y la flexión **de frente** se definen en `spec-vista-frontal.md` (decisión del usuario, 2026-10-30).

Señal principal `θk` = ángulo cadera–rodilla–tobillo. Secundarias: `τ` = inclinación del tronco respecto a la vertical (vector cadera→hombro, 0° erguido); `ρ` en el modo frontal.

| Transición | Condición inicial | Notas |
|---|---|---|
| armar IDLE | `θk >= 160°` durante 300 ms | `startThr=160`, `exitThr=150` |
| IDLE → DESC | `θk < 150°`, 2 cuadros | |
| DESC → INFL | `θk <= 100°` (`extremeThr = T_fondo + 10`, T por defecto 90°) | |
| DESC → IDLE incompleta | inversión > 8° sin llegar a 100°; evento solo si mínimo `<= 130°` | banda de intento (100, 130] |
| INFL → ASC | `θk > θmin + 8°` | también se registra `τ` mínimo/máximo en la ventana de +/-100 ms del fondo |
| ASC → COMPLETED | `θk >= 160°` | |
| FAULT | DESC > 6 s, INFL > 5 s, ASC > 6 s, D > 12 s | |
| `tNoise` | 0.5 s | repeticiones < 0.5 s se ignoran |

Verificación: 10 repeticiones de 2.5 s, fondo 88°: 10/10 con σ=0.004 y 0.008; mezcla [88,120,88,125,88,140,88] da 4 válidas + 2 incompletas (120 y 125) y 140 ignorada; 8 repeticiones de 1.2 s con timestamps irregulares: 8/8; 60 s de pie con ruido σ=0.008: 0 falsos positivos [V].

Faltas suaves (en el fondo): `τ > max(55°, τ_cal + 15°)` → `SQ_TRUNK_LEAN`; ver tabla de feedback.

**Modo frontal (degradado).** En vista frontal el muslo y la pantorrilla se proyectan casi colineales: el ángulo de rodilla 2D queda ≈ 180° siempre y **no sirve** [V razonamiento geométrico]. Señal alternativa: altura relativa de cadera `ρ = (yTobilloMedio − yCaderaMedia) / ρ_de_pie` (se mide en IDLE armado). En el modelo geométrico: θk=170° → ρ=0.996; 120° → 0.854; 100° → 0.747; 90° → 0.685 [V]. Umbrales iniciales [H]: `exitThr=0.93`, `extremeThr=0.78` (≈ θk 105°), `startThr=0.95`. Sensible a inclinación del móvil y distancia: se marca `mode:'frontal'` y `Q_rom` solo se calcula con ρ (peso reducido, D4). Permite además `SQ_KNEES_IN` (cociente separación de rodillas / separación de tobillos en el fondo `< 0.85` [H]).

### 4.4 Jumping jack (frontal)
Señales (promedio de ambos lados salvo la asimetría): `α` = ángulo en el hombro entre cadera y muñeca (brazo abajo ≈ 20°, arriba ≈ 178° [V geom.]); `ρf = |xTobilloI − xTobilloD| / anchoHombros` (pies juntos 0.45–0.6, abiertos con semiángulo de pierna 15° ≈ 1.55, 25° ≈ 2.25 [V geom.]).

| Transición | Condición |
|---|---|
| armar IDLE (cerrado) | `α <= 60°` y `ρf <= 1.0` durante 300 ms |
| IDLE → DESC ("abriendo") | `α > 85°` o `ρf > 1.3` |
| DESC → INFL ("abierto") | `α >= 130°` **y** `ρf >= 1.4` (los dos picos pueden diferir hasta 300 ms: se acumulan banderas dentro de la fase) |
| INFL → ASC | `α < 100°` o `ρf < 1.15` |
| ASC → COMPLETED | `α <= 60°` y `ρf <= 1.0` |
| DESC → IDLE incompleta | cierra sin llegar al abierto; evento si `αpico >= 100°` o `ρfpico >= 1.15` |
| FAULT | DESC > 2 s, INFL > 3 s, ASC > 2 s |
| `tNoise` | 0.30 s |

Las dos condiciones del abierto explican los códigos de incompleta: brazos suben pero pies no (`JJ_FEET_NARROW`), pies abren pero brazos no (`JJ_ARMS_LOW`).

Verificación (simulación completa con One-Euro, 15 repeticiones): periodos 0.5, 0.6, 0.7 y 1.0 s con σ=0, 0.004 y 0.008: **15/15 siempre** [V]. Con umbrales ingenuos (`α_cerrado<=40`, `ρf_cerrado<=0.8`, `α<110` para cerrar) el periodo 0.5 s perdía 2–4 repeticiones de 15: se aflojó el cierre. Solo brazos (pies juntos) y solo pies (brazos quietos) durante 30 s: 0 conteos [V]. Faltas suaves: `|αI − αD| > 35°` en el pico → `JJ_ASYMMETRY`.

### 4.5 Flexión (lateral; el cuerpo es horizontal)
No se usa ninguna señal que dependa de "arriba" en el cuadro. Todo son ángulos articulares (invariantes a orientación) y una comprobación de postura.
- `θe` = codo (hombro–codo–muñeca), lado cercano. Principal.
- `θb` = alineación del cuerpo (hombro–cadera–tobillo) y su signo (`signedAngle2D`) para distinguir cadera caída (`sag`) de cadera elevada (`pike`).
- `ι` = ángulo del vector hombro→tobillo respecto a la horizontal (postura): válida si `ι <= 30°`.

| Transición | Condición |
|---|---|
| armar IDLE | `ι <= 30°`, `θe >= 155°`, `θb >= 150°` durante 500 ms (si no, `PU_POSITION`) |
| IDLE → DESC | `θe < 145°`, 2 cuadros |
| DESC → INFL | `θe <= 100°` (`T_fondo + 10`, T por defecto 90°) |
| DESC → IDLE incompleta | inversión > 8° sin llegar a 100°; evento si mínimo `<= 130°` |
| INFL → ASC | `θe > θmin + 8°` |
| ASC → COMPLETED | `θe >= 155°` |
| FAULT | DESC > 6 s, INFL > 4 s, ASC > 6 s, `ι > 30°` más de 1 s |
| `tNoise` | 0.5 s |

Faltas suaves (en el fondo y subida): `θb < 160°` con signo de cadera baja → `PU_HIPS_SAG`; cadera alta → `PU_HIPS_PIKE`. Referencia geométrica: `θb=165°` ≈ 8.4 cm de desviación (6 % de la longitud del cuerpo), 160° ≈ 11 cm (8 %) [V]. Con 17 puntos hay tobillo, por lo que `θb` es posible sin talones. Codos abiertos (flare) y cabeza caída **no se detectan** de lado. Con el móvil de lado, el ángulo de codo 2D es fiable hasta una guiñada de ~20° (D3).

Filas comunes de calibración y `tNoise` en 4.2. Entre ejercicios la FSM es la misma máquina parametrizada por una tabla (`ExerciseSpec`), no tres implementaciones.

## 5. Calibración (3 repeticiones guiadas)

1. `CAL_WAIT` (posición correcta, vista válida, armado) → `CAL_REP_1..3` → `CAL_DONE | CAL_FAIL`.
2. Durante la calibración la FSM usa umbrales **permisivos** por defecto (sentadilla/flexión `extremeThr=115°`; jumping jack `α>=110`, `ρf>=1.2`) para detectar el intento. Por repetición se guardan: extremo, valor de inicio (mediana de los últimos 500 ms antes de salir), `τ`/`θb` en el extremo, `tDown`, `tUp`, `D`.
3. Perfil = **mediana** de las 3. Consistencia: si algún valor angular difiere > 10° de la mediana, se pide una repetición extra (máx. 2) y se vuelve a calcular con las 3 mejores.
4. Umbrales personalizados (tolerancia +/-10°):
   - `T_fondo = mediana(extremos)`, `T_inicio = mediana(inicios)`.
   - `extremeThr = clamp(T_fondo + 10, límites)`; `startThr = clamp(T_inicio − 10, 150, 170)`; `exitThr = startThr − 10`.
   - Límites: sentadilla `extremeThr ∈ [90, 120]`, flexión `[80, 115]`; jumping jack `αU = clamp(αpico_cal − 10, 110, 150)`, `ρfU = clamp(0.85·ρfpico_cal, 1.2, 1.8)`.
   - Exigencia mínima: `exitThr − extremeThr >= 25°` (si no, `CAL_FAIL: ROM_TOO_SMALL`).
   - `τ_cal` = mediana de `τ` en el fondo; `D_cal` y `ratio_cal` para el tempo (sección 6.3).
5. El perfil es JSON versionado (`{v, exercise, view, modelId, side, ...}`), lo persiste la app. Se invalida si cambia el `modelId` (las distribuciones de score difieren), el ejercicio o la vista.
6. Sin adaptación en vivo en el MVP (D5). Si se añade, deriva máxima +/-10° respecto al perfil.

## 6. Puntuación

### 6.1 Q_rom (0 a 1)
Sentadilla y flexión (`T` = fondo calibrado, `Ttop` = inicio calibrado, `θ_f` = extremo logrado, `θ_t` = máximo de la subida):

```
Q_prof = clamp(1 − max(0, θ_f − T) / 20°, 0, 1)
Q_top  = clamp(1 − max(0, Ttop − θ_t) / 15°, 0, 1)
Q_rom  = 0.7·Q_prof + 0.3·Q_top
```
Más profundo que `T` no suma (se capa en 1). En el límite de conteo (`θ_f = T+10`) `Q_prof = 0.5`. Jumping jack: `Q_rom = 0.5·Q_brazo + 0.5·Q_pies`, con `Q_brazo = clamp(1 − max(0, αT − αpico)/50°)`, `αT` calibrado (165° por defecto), `Q_pies = clamp(1 − max(0, ρfT − ρfpico)/1.0)`, `ρfT` calibrado (2.0 por defecto).

### 6.2 Q_tempo (0 a 1)
Con `D = tDown + tUp` (segundos, sin tiempo en pausa), `r = tDown/tUp`, y el trapecio `trap(x; mn, lo, hi, mx)` = 0 fuera de (mn, mx), rampa lineal mn→lo, 1 en [lo, hi], rampa lineal hi→mx:

```
f = trap(D; Dmn, Dlo, Dhi, Dmx)
g = max(0.3, trap(r; rmn, rlo, rhi, rmx))          // sin término g en jumping jack (g = 1)
Q_tempo = f^0.7 · g^0.3
```
| Ejercicio | (Dmn, Dlo, Dhi, Dmx) s | (rmn, rlo, rhi, rmx) |
|---|---|---|
| Sentadilla | (0.9, 1.8, 4.0, 8.0) | (0.3, 0.8, 2.0, 4.0) |
| Jumping jack | (0.35, 0.6, 1.2, 2.5) | n/a |
| Flexión | (0.9, 1.4, 3.5, 7.0) | (0.3, 0.6, 1.5, 3.0) |

Personalización: meseta `[Dlo, Dhi]` = intersección de la de defecto con `[0.7·D_cal, 1.5·D_cal]`; si queda vacía (p. ej. `D_cal = 9 s`) se usa la de defecto [V: D_cal=2 → [1.8, 3.0]; 5 → [3.5, 4.0]; 9 → vacía]. El tempo nunca impide contar (solo `tNoise`); mide ritmo, no validez. Esto responde a la fórmula Q_tempo no definida en los informes.

### 6.3 Calidad y combos
```
P_form = max(0.5, Π (1 − p_i))      // p_i = 0.10 falta suave leve, 0.25 grave
Q      = (0.6·Q_rom + 0.4·Q_tempo) · P_form
```
| Calidad | Condición |
|---|---|
| **Miss** | repetición no contada (incompleta o fault) **o** `Q < 0.50` (cuenta pero 0 puntos y rompe combo) |
| **Good** | `0.50 <= Q < 0.80` |
| **Great** | `0.80 <= Q < 0.90` |
| **Perfect** | `Q >= 0.90` y sin faltas suaves |

**Alineación con producto y datos (ronda 4):** `form_score = round(100 · Q)`. Los cortes 50 y 80 coinciden con los del XP de `spec-producto.md` §4.1 (aceptable 50-79, limpia desde 80). Antes eran 0.25 / 0.70; se movieron para que una sola escala sirva al juego y al XP. Son hipótesis a validar con grabaciones reales.

Ejemplos de sentadilla con T=90° [V]: fondo 88°/top 172°, 1.4 s + 1.2 s → Q_rom 0.94, Q_tempo 1.00, **Q 0.96 Perfect**; fondo 96°, rápida 0.8+0.6 s → 0.65/0.66 → **0.66 Good**; fondo 100° → Q_rom 0.35 → **0.61 Good**; fondo 80°, lenta 3.5+2.5 s → 1.00/0.62 → **0.85 Great**.

Combo: `Great|Perfect` suma 1; `Good` lo mantiene; `Miss` lo reinicia a 0. Multiplicador `m = min(2.0, 1 + 0.25·floor(combo/5))` (0–4: x1.0, 5–9: x1.25, 10–14: x1.5, 15–19: x1.75, >=20: x2.0). Puntos de repetición `= round(100·Q·m) + (Perfect ? 20 : 0)`. El módulo devuelve `{q, qRom, qTempo, quality, combo, mult, points}`; el XP de la Parte 6 lo consume sin recalcular.

## 7. Feedback (códigos)

El evento `FEEDBACK{code, severity, rep}` se emite como máximo **uno por repetición** (el de mayor severidad) en `COMPLETED`/incompleta, salvo los de postura continua. Cooldown de 4 s por código; si el mismo código aparece en 3 repeticiones seguidas, escala (`severity+1`, el texto lo decide la UI).

| Código | Ejercicio | Disparo | Severidad | Requiere |
|---|---|---|---|---|
| `VIS_LOW`, `OUT_OF_FRAME`, `SUBJECT_CHANGED` | todos | sección 2 | pausa | |
| `VIEW_WRONG_FRONT` / `VIEW_WRONG_SIDE` | todos | vista inválida >1 s | pausa | |
| `CAL_ROM_TOO_SMALL`, `CAL_INCONSISTENT` | todos | calibración | info | |
| `SQ_DEPTH_SHALLOW` | sentadilla | incompleta (mín. en (100,130]) | alta | |
| `SQ_TRUNK_LEAN` | sentadilla | `τ` fondo `> max(55°, τ_cal+15°)` | media (p=0.10) | |
| `SQ_KNEES_IN` | sentadilla | cociente rodillas/tobillos `< 0.85` en fondo | media | frontal |
| `SQ_HEELS_LIFT` | sentadilla | talón sube respecto al tobillo (> 2 % alto de cuadro); solo se evalúa si talón y tobillo del mismo lado tienen `v >= 0.8` durante la fase, si no queda desactivada en esa repetición sin aviso | media | 33 puntos |
| `SQ_TOO_FAST` / `SQ_TOO_SLOW` | sentadilla | `D < Dlo` / `D > Dhi` | baja | |
| `JJ_ARMS_LOW` | jumping jack | pies abiertos, `αpico < αU` | alta | |
| `JJ_FEET_NARROW` | jumping jack | brazos arriba, `ρfpico < ρfU` | alta | |
| `JJ_ASYMMETRY` | jumping jack | `|αI − αD| > 35°` | baja | |
| `JJ_FACE_CAMERA` | jumping jack | vista no frontal | pausa | |
| `PU_POSITION` | flexión | `ι > 30°` o no de lado | pausa | |
| `PU_DEPTH_SHALLOW` | flexión | incompleta (mín. en (100,130]) | alta | |
| `PU_HIPS_SAG` / `PU_HIPS_PIKE` | flexión | `θb < 160°` con signo | media (p=0.25) | |
| `PU_TOO_FAST` / `PU_TOO_SLOW` | flexión | `D < Dlo` / `D > Dhi` | baja | |

Nota (decisión del usuario, 2026-10-29): se mantiene el modelo **lite** de MediaPipe; el full no cabe en 30 FPS. Con lite los talones dan `v` 0,71-0,78 de pie a 2 m (full 0,83-0,93), de ahí la condición de `v >= 0.8` de `SQ_HEELS_LIFT`. Medido por la sesión local en el S26 Ultra (docs/spike-results.md).

## 8. Estrategia de pruebas

**Formato de fixture** (JSON): `{schemaVersion, exercise, model, view, fps, width, height, meta:{noiseSigma?, tempo?, notes}, frames:[{t, p:[x,y,z,v,...]}], labels:{reps:[{t0,tBottom,t1,outcome,codes[]}]}}`. Coordenadas a 4 decimales: ~315 KB por clip de 900 cuadros (30 s a 30 FPS).

**Generación**
- **Sintéticos paramétricos** (`gen/`): cinemática 2D de segmentos rígidos (muslo, pantorrilla, tronco, brazos), trayectoria `θ(t)` coseno entre `Ttop` y `T`, ruido gaussiano σ por coordenada, jitter de timestamps, caídas de cuadros, oclusiones, `v` simulada. Etiquetas exactas por construcción. Semilla fija (PRNG propio, no `Math.random`).
- **Grabados**: se graba el vídeo en el spike, se extraen landmarks con el modelo real (los JSON no llevan imagen, privacidad) y se **etiquetan a mano** los tiempos de inicio, fondo y fin y el resultado. Dos revisores en el 20 % de los clips.

**Cantidad** (arranque)
| Tipo | Cantidad | Detalle |
|---|---|---|
| Sintéticos | 36 (12 por ejercicio) | 3 ruidos {0, 0.004, 0.008} × 2 tempos {lento, rápido} × 2 morfologías/distancias = 12 (el tempo normal se cubre en los grabados) |
| Grabados positivos | 18 (6 por ejercicio) | >= 3 personas distintas, distancia 2 y 3 m, luz buena/mala, 12 repeticiones cada uno => >= 72 repeticiones etiquetadas por ejercicio |
| Grabados negativos | 6 (2 por ejercicio) | caminar, atarse el zapato, estirar, gestos, entrar/salir de cuadro |
| Soak (suite lenta) | 2 | 60 s de pie con ruido alto, 10 min de sesión |

**Recorte del MVP (ronda 4):** el plan original era 72 / 24 / 12 / 3 y se redujo a 36 / 18 / 6 / 2 para que quepa en 6-8 semanas con una persona. Con 72 repeticiones por ejercicio la cota inferior de Wilson es más ancha que con 96, así que el criterio del MVP se evalúa por el punto estimado (>= 95 % y >= 90 % en flexión) y la cota se amplía con más grabados en la beta.

Para ser rápidos, los de la suite por defecto se limitan a <= 600 cuadros; total ≈ 100 k cuadros. Estimación (sin medir, **[NV]**): ~10 µs/cuadro → ~1 s, dentro del objetivo de 2 s. El soak va en `test:slow`.

**Casos límite** (cada uno con su fixture y resultado esperado)
| Caso | Esperado |
|---|---|
| Ruido σ 0.004 y 0.008 | conteo exacto en sintéticos |
| Oclusión 150 ms a mitad | repetición cuenta |
| Oclusión 1.5 s en el fondo | pausa, reanuda y cuenta, la pausa no cuenta en `D` |
| Oclusión > 3 s con repetición | `REP_ABANDONED`, 0 cuentas |
| Repetición corta (media sentadilla, fondo 120°) | `incomplete`, 0 cuentas |
| Pausa deliberada en el fondo 3 s | cuenta con `Q_tempo` bajo; 6 s → FAULT |
| Dos personas / sujeto distinto | `SUBJECT_CHANGED`, reinicio sin repetición fantasma |
| Timestamps con jitter ±6 ms, duplicados, no monótonos | sin NaN, sin cuentas extra |
| 15/20 FPS efectivos, ráfagas de 10 cuadros perdidos | conteo estable |
| Izquierda/derecha invertidas (espejo), vista errónea | `VIEW_*`, 0 cuentas |
| De pie 60 s con ruido | 0 falsos positivos |
| Modelo 17 vs 33 con mismo movimiento | mismo conteo |

**Métricas de aceptación** (alineadas con `requirements.md`)
- Precisión de conteo por clip `1 − |contado − real| / real`: media **>= 95 %** en sentadilla y jumping jack, **>= 90 %** en flexión (sesión controlada). Se reporta también la cota inferior de Wilson al 95 %: con 96 repeticiones, 92 aciertos dan punto 95.8 % y cota 89.8 %; 0 errores dan cota 96.2 % [V]. La puerta es el punto >= umbral y cota >= 90 %.
- Precisión/recall a nivel de evento con tolerancia de ±400 ms en `t1`.
- Falsos positivos: **0** en sintéticos de reposo; en negativos grabados <= 0.2 repeticiones falsas por minuto.
- Resultado de calidad: coincidencia con las etiquetas manuales de `incomplete/fault` >= 90 %.
- Suite completa < 2 s; cobertura de líneas >= 90 % en `math/`, `filter/`, `fsm/`, `scoring/`.
- Pruebas unitarias aparte: `angle2D` (0/90/180/valores conocidos), One-Euro (respuesta a escalón, `Te` irregular, hueco largo), adaptadores (índices, orden `yxs`), trapecio y fórmulas de Q con los ejemplos de 6.3.

## 9. Estructura de carpetas

```
src/kinematics/
  index.ts                  API pública: createEngine, step, tipos
  types.ts                  Landmark, PoseFrame, JointId, eventos, estado
  config/defaults.ts        umbrales y parámetros por ejercicio (una sola tabla)
  landmarks/
    models/movenet17.ts     ModelSpec COCO-17
    models/blazepose33.ts   ModelSpec 33
    adapter.ts              fromFlat, toUpright, normaliza unidades de alto de cuadro
  math/                     vec.ts, angle.ts, stats.ts (mediana, clamp, trap)
  filter/                   oneEuro.ts, landmarkFilter.ts (banco por articulación/canal)
  quality/                  visibility.ts, subjectGuard.ts, viewClassifier.ts
  signals/                  squat.ts, jumpingJack.ts, pushUp.ts (Pose -> señales)
  fsm/                      machine.ts (genérica), exercises/{squat,jumpingJack,pushUp}.ts (tablas)
  calibration/              calibrator.ts, profile.ts (JSON versionado)
  scoring/                  rom.ts, tempo.ts, quality.ts, combo.ts
  feedback/                 codes.ts, arbiter.ts (prioridad, cooldown)
  __tests__/                *.test.ts (Vitest)
  fixtures/{synthetic,recorded,negative}/*.json
  tools/                    gen/ (generadores), label/ (herramienta de etiquetado), tune/ (rejilla One-Euro)
```
Reglas: `kinematics/` no importa nada de `react-native*`, `expo*` ni del resto de `src/`; lo comprueba una regla de lint (`no-restricted-imports`).

## 10. Riesgos y decisiones abiertas

Riesgos
- **R1 Worklets e imports.** Los worklets de `react-native-worklets` 0.13 pueden exigir `'worklet'` en cada función importada o un modo de bundle. Mitigación: test de lint de directivas y prueba en el spike de un step real en el runtime del frame processor. **[NV]**
- **R2 Score/visibilidad de MoveNet no calibrado**: el umbral 0.65 puede ser demasiado estricto o laxo; medir distribución en fixtures y ajustar `visThreshold` por modelo.
- **R3 Retardo del filtro (~50 ms)** más latencia de cámara y modelo afecta el feedback instantáneo, no el conteo.
- **R4 Flexión con 17 puntos**: sin talones ni dedos, el ángulo de cuerpo depende de la calidad del tobillo (se pierde con ropa suelta o el pie fuera de cuadro).
- **R5 Salto de sujeto** de modelos single-pose con segunda persona al fondo: la protección de torso es heurística.
- **R6 Cambio de modelo 17→33** invalida perfiles y puede mover umbrales: se re-calibra y se repiten las pruebas de aceptación.
- **R7 Los umbrales marcados [H] vienen de simulaciones**; el ruido real de MoveNet (σ≈0.004) es una suposición hasta tener grabados.

Decisiones abiertas
- D1 ¿Pausa de visibilidad sobre cuadros consecutivos (como se especifica) o con ventana mínima en ms (para 20 FPS térmico)?
- D2 ¿Activar 3D (z de MediaPipe) para vistas oblicuas, o exigir vista estricta? **Parcial (2026-10-30):** vista estricta; el 3D solo como spike para la cadera en flexión de frente (`spec-vista-frontal.md` §6).
- D3 Tolerancia de guiñada: ¿rechazar o solo avisar cuando el móvil no está a 90° del usuario en sentadilla/flexión?
- D4 Sentadilla frontal: ¿soportarla en el MVP (modo degradado con ρ) o solo lateral? **Resuelta (2026-10-30):** sí, de frente por defecto y como modo completo, con la vista elegible por el usuario (`spec-vista-frontal.md`).
- D5 Adaptación de umbrales en vivo por fatiga (etapa 2) frente a calibración fija.
- D6 `Miss` también para repeticiones contadas con `Q < 0.25`: ¿se acepta que "cuenta pero es Miss"?
- D7 Faltas suaves leves/graves: los pesos `p_i` y los umbrales `τ`, `θb` son [H] y deben ajustarse con un entrenador.
- D8 Rango de calibración: ¿se obliga a repetirla en cada sesión o se reutiliza el perfil?

## 11. Verificación numérica realizada

Simulaciones en Python (fuera del repo) con geometría 2D de segmentos (persona = 0.62 del alto de cuadro, 30 FPS):
- `angle2D` (90°, 180°, 0°) y equivalencia con 3D: coinciden [V].
- Corrección de aspecto: segmento de 45° real en 720x1280, 29.4° sin corregir [V].
- Ruido angular por σ de landmark (3.1–5° crudo, ~1.3° filtrado) [V].
- One-Euro: comparación de 7 configuraciones en sentadilla y jumping jack, con y sin jitter de timestamps; elegida 1.5/8/1.0 [V].
- FSM sentadilla: 10/10 con σ 0.004 y 0.008 sobre 30 semillas con todas las coordenadas filtradas; 79 % con una coordenada sin filtrar; mezcla con incompletas y reposo sin falsos positivos [V].
- FSM jumping jack: 15/15 hasta periodo 0.5 s con σ 0.008; 0 falsos positivos solo brazos/solo pies [V].
- Mapeos geométricos: cociente de vista, razón de pies, altura de cadera, desviación de cadera en flexión, fórmulas de Q y Wilson [V].
Los generadores de la sección 8 deben reutilizar esta lógica y convertir estas comprobaciones en tests Vitest.
