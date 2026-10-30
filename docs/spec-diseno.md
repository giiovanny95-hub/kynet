# Spec de diseño de KYNET (premium, visual y dinámico)

Fecha: 2026-10-30. Fuentes:
- Mockup de Stitch exportado en `docs/diseno/stitch/`: 4 pantallas, `tema.md` y el inventario en `README.md`.
- Manual `docs/marca/kynet.md`.
- Investigación `docs/diseno/investigacion-animacion.md`.

**Stitch manda en lo visual. La navegación y el alcance siguen las specs** (decisión del usuario). Ante una duda
visual, manda la PNG de Stitch; ante una duda de comportamiento, `spec-producto.md`.

## 1. Principios
1. **Premium por precisión, no por adorno.**
   - Sin sombras, sin brillos en los bordes y sin aspecto de videojuego (`tema.md`, Elevation & Depth).
   - La profundidad se da con capas de superficie y un borde de 1 px.
   - Lo "vivo" lo aporta el **movimiento**: cifras que cuentan, barras y anillos que se llenan, entradas escalonadas
     y celebraciones contenidas.
2. **El movimiento informa.** Cada animación responde a un cambio de estado: progreso, logro o aviso. No hay
   animaciones decorativas en bucle, salvo el pulso de "en curso" y la llama de la racha, que se apagan con "reducir
   movimiento".
3. **La cámara manda.** En el entrenamiento solo hay efectos de `transform` y `opacity`, medidos para mantener 30 FPS.
4. **Accesible:**
   - "Reducir movimiento" respetado;
   - contraste AA;
   - áreas táctiles de al menos 48 dp;
   - nunca solo color: siempre icono y texto.

## 2. Mapa Stitch → app
| Stitch | Ruta de la app | Notas |
|---|---|---|
| `01-hoy` | `app/(tabs)/index.tsx` | Sin avatar con foto: iniciales sobre Slate, por privacidad. Los nombres de ejercicio son los del MVP (Sentadilla, Jumping jack, Flexión), no "profunda" ni "isométrica". "Entrena a tu manera" lleva al flujo `workout/[exercise]/setup`. "ENTRENAR AHORA" abre `exercises`. La tarjeta de calibración solo aparece si hay perfil de calibración |
| `02-vision-live-y-resumen` (en vivo) | `app/workout/[exercise]/live.tsx` | Píldora "Análisis en tu dispositivo", cronómetro, tarjeta del ejercicio con serie y meta, contador grande, aviso en píldora, Pausar y Finalizar con confirmación |
| `02` (resumen) | `app/workout/summary.tsx` | "¡Buen trabajo!", XP, duración, tiempo activo, más lo que ya existe (racha, misiones y nivel). Botón "Guardar mi progreso" si no hay cuenta |
| `03-historial` | `app/(tabs)/progress.tsx` | **Combinado** (decisión del usuario): arriba, las 3 métricas, la racha actual y máxima y los últimos 7 días; debajo, el historial con segmentos (semana, mes, 3 meses), chips por ejercicio y tarjetas por día. Estado vacío del HTML |
| `03` (detalle) | `app/workout/session/[id].tsx`, nueva | **Versión simple** (decisión del usuario): duración, válidas/total, gráfica de forma por repetición y consejo. La cadencia por serie queda fuera del MVP |
| `04-iniciar-sesion` | `app/account.tsx`, nueva | **No es la primera pantalla.** Se abre desde el resumen ("Guardar mi progreso") y desde Perfil, porque el login va después de la primera sesión (spec). Estados: inicial, conectando, error y sin conexión. "Continuar sin cuenta" cierra la pantalla |
| No está en Stitch | `onboarding`, `medical`, `exercises`, `workout/[exercise]/setup`, `missions` y `profile` | Se diseñan con el mismo sistema: componentes de §4 y patrones de Hoy e Historial |

## 3. Tokens (ampliación de `src/ui/tokens.ts`)
- **Color:** la paleta de `tokens` no cambia. Se añaden:
  - `hud: 'rgba(30,44,58,0.85)'`, para las píldoras sobre la cámara, **sin desenfoque** (el desenfoque en Android se
    mide aparte);
  - `tealSoft: '#00E5C81F'` (12 %), para los chips y el fondo del "+XP";
  - `teal45: '#00E5C873'`, para el esqueleto en reposo.
- **Tipografía:** se añade `type` con la escala de `tema.md`. Cada entrada lleva la familia `fonts.*` correcta, sin
  `fontWeight`:
  - `displayHero` 56/64 y `displayLg` 44/52;
  - `displayMd` 32/40;
  - `headlineLg` 24/32 y `headlineMd` 20/28;
  - `titleSm` 16/22;
  - `body` 16/24 y `bodySm` 14/20;
  - `labelCaps` 12/16, con espaciado 0,72;
  - `metricLg` 48/52 y `metricMd` 28/34.
- **Espaciado:** `space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 }`. Margen de pantalla 16, separación entre
  tarjetas 12 y entre secciones 24.
- **Radios:** `radius = { chip: 6, control: 12, card: 16, pill: 9999 }`.
- **Botones:** primario de 52 dp; secundario de 48 dp.
- **Iconos:** **Lucide** (manual), con trazo de 1,75 y tamaños 20 y 24. Se usa el equivalente Lucide del Material
  Symbol de Stitch:
  - Hoy → `flame`;
  - Progreso → `chart-line`;
  - Misiones → `award`;
  - Perfil → `user-round`.

## 4. Sistema de movimiento (`src/ui/motion.ts`)
- **Duraciones:** `fast` 120 ms, `base` 220 ms, `emphasis` 360 ms y `celebrate` 700 ms.
- **Curvas:**
  - `standard`: `Easing.bezier(0.2, 0, 0, 1)`;
  - `exit`: `Easing.bezier(0.3, 0, 1, 1)`.
- **Muelles:**
  - `snappy`: `{ damping: 20, stiffness: 300 }`, para pulsaciones e indicadores;
  - `gentle`: `{ damping: 18, stiffness: 160 }`, para barras y anillos;
  - `bouncy`: `{ damping: 10, stiffness: 180 }`, **solo en celebraciones**.
- **Escalonado:** 40 ms entre elementos, con 6 como máximo; a partir del séptimo aparecen sin retraso.
- **Hook `useMotion()`:** devuelve los tokens y `reduced`, que sale de `useReducedMotion`. Si `reduced` es true:
  - duraciones a 0;
  - sin bucles;
  - sin confeti;
  - las cifras saltan al valor final.

### Componentes animados (en `src/ui/`)
| Componente | Comportamiento | Técnica |
|---|---|---|
| `PressableScale` | Al pulsar, escala 0,98 y opacidad 0,9 (`tema.md`) y vuelve con `snappy`; vibración `selection` opcional | gesture-handler + Reanimated |
| `AnimatedNumber` | Cuenta desde el valor anterior hasta el nuevo en `emphasis`, con dígitos tabulares | Reanimated |
| `ProgressBar` (rehecha) | Relleno con `gentle` al montar y al cambiar; degradado teal → deep teal | Reanimated + `expo-linear-gradient` |
| `ProgressRing` | Anillo con degradado; meta del día y objetivo semanal | Skia (`Path` con `end` animado) |
| `StaggerIn` | Envoltorio de entrada: `FadeInDown`, 12 px y `base`, con retraso escalonado | Reanimated `entering` |
| `StreakFlame` | Llama con un pulso suave (escala 1 → 1,06, 1,6 s, en bucle) si la racha está viva; sin bucle si está en riesgo o con `reduced` | Reanimated (animación CSS) |
| `XpToast` | "+XP" que sube 24 px y se desvanece | Reanimated |
| `Confetti` | Unas 60 partículas teal, deep teal e ice durante 1,2 s, solo al subir de nivel o completar las 3 misiones | Skia + Reanimated |
| `Celebration` | Lottie recoloreada (nivel y misión) sobre el resumen; nunca sobre la cámara | `lottie-react-native` |
| `TabBar` | Indicador teal que se desliza bajo la pestaña activa (`snappy`); icono activo con escala 1,08 | Reanimated |
| `Segmented` | Fondo activo que se desliza entre segmentos | Reanimated `layout` |
| `Skeleton` de carga | Bloques Slate con un brillo que se desplaza (1,2 s); sin bucle con `reduced` | Reanimated |

## 5. Coreografía por pantalla
- **Hoy:**
  - Entrada escalonada: encabezado → actividad → objetivo semanal → tarjeta de entrenar → ejercicios → nivel →
    misiones.
  - Los números de actividad cuentan y la barra semanal y la de XP se llenan.
  - El botón ENTRENAR AHORA tiene un pulso de borde una sola vez al entrar, no en bucle.
- **Resumen** (secuencia ~2 s; tocar la salta):
  1. título;
  2. repeticiones contando;
  3. forma;
  4. "+XP" contando, más `XpToast`;
  5. racha, con la llama;
  6. misiones cumplidas con check animado y vibración `notificationSuccess`;
  7. barra de nivel. **Si se sube de nivel**, se muestra la celebración: `Confetti` + Lottie + "Nivel N · Título".
- **Progreso:** métricas que cuentan, segmentos deslizantes, la lista se reordena con `layout` al filtrar y el
  estado vacío entra con un fundido.
- **Misiones:** barras que se llenan. Una misión completada muestra su check y "+XP"; las tres del día lanzan
  `Confetti`.
- **Entrenamiento (en vivo):**
  - Contador con "pop" en cada repetición: escala 1 → 1,12 → 1 con `snappy`, más vibración `impactLight` (ya
    existe).
  - Borde y esqueleto con **transición de color** de 220 ms según la forma: el esqueleto pasa del 45 % al 100 % con
    buena forma, como dice `tema.md`.
  - El aviso entra con deslizamiento corto y fundido y sale a los 2,5 s.
  - Pausa y confirmación en hoja inferior con `base`.
  - **Nada de Lottie, Skia extra ni desenfoque sobre la cámara.**
- **Navegación:**
  - pila con desplazamiento lateral y fundido (`animation: 'slide_from_right'`, o `fade_from_bottom` en las
    modales: login y confirmar fin);
  - pestañas con fundido cruzado de 120 ms.
- **Onboarding:** pasos con transición horizontal y barra de progreso arriba; el bloqueo de menores sin animación.

## 6. Vibraciones (`expo-haptics`, opcional desde Perfil)
| Momento | Vibración |
|---|---|
| Tocar una pestaña, un segmento o un chip | `selectionAsync` |
| Repetición válida | `impactAsync(Light)` (ya existe) |
| Misión, nivel o fin de serie | `notificationAsync(Success)` |
| Aviso de forma o pausa | `notificationAsync(Warning)` |

## 7. Títulos de nivel (decisión del usuario: solo títulos)
Es solo visual. Se calcula a partir del nivel en `src/gamification/levelTitle.ts`, una función pura con test:
| Niveles | Título | Rango |
|---|---|---|
| 1–2 | Novato | Bronce |
| 3–5 | Explorador | Plata |
| 6–9 | Atleta | Oro |
| 10–14 | Élite | Platino |
| 15+ | Leyenda | Diamante |

- El rango se muestra como etiqueta teal en mayúsculas, como en Stitch, **sin colores nuevos**: los colores de
  estado no son decoración.
- Textos por i18n (es y en).

## 8. Datos que piden las pantallas
- **Historial:** `SessionSummary` (ejercicio, inicio, duración, repeticiones, forma) y `sessionXp` de
  `provisionalState`.
  - Consejo técnico: la falta más repetida en `reps[].faults`, con su texto `feedback.*`.
  - Filtros por periodo y ejercicio: funciones puras con test en `src/features/progress/history.ts`.
- **Detalle de sesión:** `getSession(id)`. Gráfica de forma por repetición con barras Skia, con la línea de 80 %
  marcada.
- **Hoy:** "Tiempo activo" y "Registradas" del día salen de `aggregateDays`; el objetivo semanal sale de los días
  cualificados de la semana frente a `prefs.weeklyGoalDays`.

## 9. Fuera de alcance
- Avatar con foto.
- Nutrición y bienestar del panel de referencia.
- Cadencia por serie.
- Desenfoque real sobre la cámara (solo translúcido).
- Rive.
