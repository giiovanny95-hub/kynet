# KYNET: identidad y estilo de diseño

Fuente: los dos manuales de esta carpeta (v1.0, 29-10-2026), entregados por el usuario como **manual de identidad,
estilo de diseño y nombre de la app**. Este archivo resume lo que hace falta para diseñar e implementar; ante
duda, mandan los PDF. Referencias visuales del usuario en `referencias/`.

- `KYNET_Manual_de_Identidad_y_Estructura_App.pdf`: marca, color, tipografía, módulos, componentes, tokens.
- `KYNET_Manual_Visual_y_Estructura_Completa.pdf`: especificación de pantallas, KYNET Vision, criterios de aceptación.

## Marca
- **Nombre:** KYNET. **Descriptor:** INTELLIGENT FITNESS. **Tagline:** TRAIN SMARTER. EVOLVE FASTER.
- **Promesa:** Tu entrenamiento, impulsado por inteligencia artificial.
- **Personalidad:** inteligente, precisa, premium, motivadora (sin exagerar), confiable.
- **Territorio:** interfaz oscura, tipografía limpia, datos visibles, acentos turquesa. Tecnológico, deportivo y
  elegante; **nunca** saturado ni con aspecto de videojuego.
- **Logotipo:** wordmark KYNET en mayúsculas, geométrico, con espaciado amplio. Isotipo propuesto: una "K" geométrica.
  Icono de la app: "K" sobre Midnight con acento Electric Teal. Versión blanca sobre fondo oscuro. No se estira,
  no se inclina y no lleva sombras.
- **Submarcas:** KYNET AI, VISION, TRAIN, PERFORMANCE, NUTRITION, WELLNESS.
- El manual advierte que KYNET es un **nombre de trabajo**: falta comprobar la disponibilidad de la marca, el
  dominio y la ficha en tiendas, y hacer una revisión legal.

## Color (tokens)
| Token | HEX | Uso |
|---|---|---|
| primary (Electric Teal) | `#00E5C8` | Acciones principales, estado activo, IA |
| secondary (Deep Teal) | `#00A896` | Gráficas, estados secundarios |
| background (Midnight) | `#080F14` | Fondo principal |
| surface (Slate) | `#1E2C3A` | Navegación y paneles |
| card (Deep Surface) | `#101A22` | Tarjetas, superficies elevadas |
| text (Ice White) | `#EBEEF2` | Texto principal, iconos |
| textMuted | `#8FA3B8` | Texto secundario |
| border | `#263640` | Divisores y bordes |
| success | `#22C997` | Correcto o logro |
| warning | `#F5B942` | Atención |
| error | `#FF5C69` | Error o corrección importante |

Reglas: texto **Midnight sobre botones turquesa**, no blanco. Los colores de estado comunican significado y no se usan
como decoración. **Nunca** se indica algo solo con el color: siempre van acompañados de icono y texto.

## Tipografía e iconos
- **Montserrat** (Bold/Semibold/Medium) para títulos, cifras destacadas y marca. **Inter** (Regular/Medium) para la
  interfaz y los datos.
- Jerarquía: display 28–36 px, título de pantalla 22–28 px, subtítulo 16–20 px, cuerpo 14–16 px, etiqueta 11–13 px.
- Iconos de línea con el mismo trazo en toda la app, preferentemente **Lucide**.

## Componentes
- **Botón primario:** fondo teal, texto Midnight, radio 12 px (rango 12–16). **Secundario:** transparente o Slate,
  con borde `border`. **Destructivo:** color `error`, solo para acciones con riesgo.
- **Tarjeta:** fondo `card`, borde `border`, radio 16 px. Sin sombras fuertes: la elevación se marca con superficies.
- **Gráficas:** línea turquesa, con unidad, periodo y escala visibles. Indicador circular para el progreso de objetivos.
- **Espaciado:** múltiplos de 4 u 8. Áreas táctiles amplias para usarlas mientras se entrena. Una acción primaria
  por pantalla. Respetar "reducir movimiento".

## Estados de KYNET Vision (pantalla de entrenamiento)
| Estado | Señal | Mensaje |
|---|---|---|
| Correcto | Turquesa/verde + check | Refuerza lo bien hecho |
| Ajuste requerido | Rojo o ámbar + alerta | Instrucción breve y accionable |
| Detección insuficiente | Neutro/gris | "Ajusta la distancia, la iluminación o el encuadre" |
| Procesando | Turquesa animado | Sin conclusiones prematuras |

Sin confianza suficiente no se corrige: se pide ajustar el encuadre. Las métricas se presentan como estimaciones,
nunca como diagnóstico.

## Pantallas del manual
Splash, Inicio, Detalle de entrenamiento, KYNET Vision en vivo, Progreso, Nutrición, Perfil, Notificaciones y
Objetivos, más un dashboard web de análisis. Navegación propuesta: **Inicio · Entreno · Progreso · Perfil**.
Etapas: 1) sistema de diseño, navegación, onboarding, perfil, objetivos y dashboard; 2) entrenamiento;
3) Vision; 4) análisis y feedback; 5) nutrición, bienestar e integraciones.

## Decisiones del usuario sobre el manual (2026-10-29)
1. **Nombre:** se renombra todo: app "KYNET", paquete `com.kynet.app` (`.dev` y `.preview` en las otras
   variantes), esquema `kynet` y módulo `modules/kynet-native`. **Excepción:** el slug sigue siendo `fitpose`,
   porque identifica el proyecto EAS. Cambiarlo exige renombrar el proyecto en expo.dev, que es un recurso
   externo y requiere confirmación. El repositorio de GitHub y el proyecto de Supabase conservan su nombre.
2. **Navegación:** mandan las specs, **Hoy · Progreso · Misiones · Perfil**. Del manual solo se toma el estilo.
3. **Alcance:** el MVP no cambia (3 ejercicios). Nutrición, bienestar, IA y web quedan para etapas posteriores.
4. **Color:** aplicado en `src/ui/tokens.ts`.
5. **Tipografías:** Montserrat e Inter instaladas y cargadas en `app/_layout.tsx` (`fonts` en `tokens.ts`).
6. El manual cita MoveNet como alternativa. El proyecto sigue con MediaPipe: cambiar requiere aprobación (CLAUDE.md).

Pendiente de diseño: icono y wordmark definitivos (la "K" geométrica). El icono actual es el genérico de Expo.
