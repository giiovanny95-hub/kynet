# Mockup de Stitch: inventario

Exportado el 2026-10-30 del proyecto de Stitch `17277584496938994624` (solo lectura) con
`herramientas/exportar-stitch.mjs` en la PC. Stitch manda en lo visual; la navegación y el alcance siguen las specs
(`CLAUDE.md`).

- `NN-*.png`: captura de cada pantalla (ancho de 780 px, es decir 390 dp a 2x).
- `code/NN-*.html`: el HTML con Tailwind que genera Stitch. Abre en un navegador; se ven las fuentes, los iconos
  Material Symbols y los estados alternativos, que el HTML alterna con botones o clases.
- `tema.md`: el `DESIGN.md` del sistema de diseño de Stitch ("Intelligent Biomechanical Athletic System"), sin
  editar, con todos los tokens. `tema.json` es la respuesta completa de `list_design_systems`.

## Sistema de diseño (resumen de `tema.md`)

| Token | Valor |
|---|---|
| Fondo raíz (Midnight) | `#080F14` |
| Tarjeta (Deep Card Surface) | `#101A22` + borde 1 px `#263640` |
| Barras, hojas y navegación (Slate) | `#1E2C3A` + borde superior `#263640` |
| HUD sobre la cámara | `rgba(30,44,58,0.85)` con desenfoque de fondo de 12 px |
| Primario (Electric Teal) | `#00E5C8`; texto encima en `#080F14` |
| Secundario (Deep Teal) | `#00A896` |
| Texto principal (Ice White) | `#EBEEF2` |
| Texto secundario, unidades e inactivos (Muted Slate) | `#8FA3B8` |
| Éxito, aviso y error | `#22C997`, `#F5B942` y `#FF5C69` |
| Neutro u ocluido (confianza < 0,65) | `#8FA3B8`: los colores de estado se apagan |
| Tipografía | Montserrat (títulos, números y HUD) e Inter (interfaz y datos) |
| Escala (tamaño / interlineado) | display-hero 56/64 (800) · display-lg 44/52 (800) · display-md 32/40 (700) · headline-lg 24/32 (700) · headline-md 20/28 (600) · title-sm 16/22 (600) · body 16/24 · body-sm 14/20 · label-caps 12/16 (700, +0,06em) · metric-lg 48/52 (800) · metric-md 28/34 (700) |
| Radios | controles 12 px · tarjetas 16 px · chips 4–8 px · píldoras del HUD 9999 px |
| Espaciado | ritmo de 4/8 px; margen de 16 px (24 en tablet); 12 px entre tarjetas y 24 entre secciones |
| Botón primario | 52 px de alto, radio 12; al pulsar escala 0,98 y opacidad 90 % |
| Botón secundario | 48 px de alto, Slate o transparente, borde `#263640` |
| Área táctil mínima | 48 × 48 dp |
| Sombras | prohibidas: la profundidad se da con las capas de superficie y el borde de 1 px; con foco, borde teal sin brillo |
| HUD de visión | esqueleto de 33 puntos con trazo de 2 px teal al 45 % (100 % con buena forma); contador de 56 px en el tercio inferior; mensajes de 4 palabras como máximo; el 70 % central de la cámara queda libre |

Diferencias con `src/ui/tokens.ts`: coinciden la paleta base y las fuentes. Faltan las variantes Material
(`primary #70FFE4`, `surface-container-*`, etc.), la escala tipográfica, el radio de 4–8 de los chips y el HUD
translúcido con desenfoque.

## Pantallas

| Archivo | Nombre en Stitch | Para qué sirve | Componentes | Estados alternativos (en el HTML) |
|---|---|---|---|---|
| `01-hoy.png` · `code/01-hoy.html` | KYNET — Hoy (Dashboard Principal) | Pestaña **Hoy** | Encabezado con fecha, saludo y avatar; tarjeta "Tu actividad" (minutos, reps, racha); objetivo semanal con barra; tarjeta principal "¿Listo para entrenar?" (calibración y botón ENTRENAR AHORA); lista "Entrena a tu manera" (3 ejercicios con cámara y meta); nivel y XP con barra; "Misiones de hoy" con barras; barra inferior Hoy · Progreso · Misiones · Perfil | No visibles (sin vacío ni carga) |
| `02-vision-live-y-resumen.png` · `code/02-vision-live-y-resumen.html` | KYNET Vision — Live Workout & Resumen (Final Polish) | **Entrenamiento en vivo** y resumen | Píldora "Análisis en tu dispositivo"; cronómetro; tarjeta del ejercicio con serie, meta y "En curso"; esqueleto teal; contador "8 / 12 repeticiones" con válidas y forma media; píldora de aviso ("Baja un poco más"); Pausar y Finalizar entrenamiento | En el HTML: **en pausa** (tiempo, reps y Reanudar), **confirmar fin** ("¿Finalizar entrenamiento?") y **resumen** ("¡Buen trabajo!", XP, duración y tiempo activo) |
| `03-historial.png` · `code/03-historial.html` | Historial de Entrenamientos (Final Polish) | Pestaña **Progreso** (historial) | Indicador "Guardado en este dispositivo" y sincronizar; 3 métricas (sesiones, reps y forma media); segmentos semana / mes / 3 meses; chips por ejercicio; tarjetas de sesión por día (XP, reps válidas, forma y un consejo técnico); botón "+ Nuevo entreno"; barra inferior | En el HTML: **vacío** ("Sin entrenamientos para este filtro"), aviso "Acción completada" y **detalle de sesión** (duración, desglose por serie y cadencia) |
| `04-iniciar-sesion.png` · `code/04-iniciar-sesion.html` | KYNET — Iniciar Sesión y Vincular Cuenta | Login con Google y "Guardar mi progreso" | Logotipo y descriptor; ilustración del esqueleto con ángulo ("92° PROFUND.", "CV LOCKED"); titular; botón "Continuar con Google" (blanco, colores de Google); "Continuar sin cuenta"; tarjeta de privacidad; enlaces legales y versión | En el HTML: **inicial**, **conectando** ("Conectando con Google..."), **error** y **sin conexión** (selector de prototipo al pie) |
| `90-referencia-panel-ux-ui.jpg` | Panel UX_UI de KYNET Fitness Inteligente.png | Imagen de referencia **subida por el usuario**, no generada | Panel de 8 módulos (Inicio, Entrenamiento, Vision, Rendimiento, Nutrición, Bienestar, Objetivos y Perfil) con 3 teléfonos por módulo y la paleta al pie | — |
| `code/91-referencia-manual-visual.md` | kynet_manual_visual_y_estructura.md | El manual visual, subido a Stitch como contexto | Igual que `docs/marca/` | — |

## Notas
- `90-referencia-panel-ux-ui` va en JPG (calidad 88, 1214×1295, 335 KB): como PNG pesaba 1,84 MB y no bajaba de
  1 MB ni a 800 px.
- **Privacidad:** en `01-hoy` se cambió el nombre del saludo por "Ana" (en la PNG y en el HTML). El avatar es una
  imagen generada por Stitch (`lh3.googleusercontent.com/aida-public/...`), no una foto real. Los nombres del panel
  de referencia ("Carlos", "Carlos Martínez") son ficticios.
- El HTML carga Tailwind, Google Fonts y Material Symbols desde CDN: es solo referencia visual y no forma parte de
  la app.
- Pantallas del manual que **no** están en Stitch: onboarding, lista de ejercicios, colocación y calibración,
  Misiones, Perfil y aviso médico.
