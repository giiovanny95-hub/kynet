# KYNET: INTELLIGENT FITNESS
## MANUAL VISUAL Y ESTRUCTURA COMPLETA DE LA APP

**TRAIN SMARTER. EVOLVE FASTER.**

*Diseño de experiencia móvil | Dashboard | Módulos | Flujos | Componentes*

Documento de referencia para diseño UX/UI, definición funcional y desarrollo de la plataforma KYNET.
*Versión 1.0. 29 de octubre de 2026*

---

## 01. Visión general del producto

KYNET es una propuesta de plataforma de fitness inteligente que integra entrenamiento personalizado, análisis de movimiento mediante cámara, métricas de rendimiento, nutrición y bienestar. La experiencia debe sentirse como un producto digital premium: precisa, clara, elegante y fácil de utilizar durante la actividad física.

### Objetivo de experiencia
* Convertir los datos de entrenamiento y movimiento en información útil y recomendaciones comprensibles.
* Permitir que el usuario inicie una sesión y acceda al análisis de técnica con pocos pasos.
* Unificar rutinas, resultados, objetivos y hábitos dentro de una misma aplicación.
* Mantener una interfaz consistente en móvil, tablet y dashboard web.

### Principios de diseño
* **Clarity first:** cada pantalla prioriza una acción principal y evita saturación.
* **Data with meaning:** las métricas muestran unidades, contexto y periodo.
* **Motion intelligence:** la visualización del movimiento debe ser central en KYNET Vision.
* **Premium restraint:** uso medido del color, espacios generosos y jerarquía tipográfica.
* **Actionable feedback:** cada corrección debe indicar qué se observó y cómo mejorar.

### Identidad base
* **Descriptor:** INTELLIGENT FITNESS
* **Tagline:** TRAIN SMARTER. EVOLVE FASTER.
* **Promesa:** Tu entrenamiento, impulsado por inteligencia artificial.

---

## 02. Dashboard de análisis - experiencia de escritorio

El dashboard web funciona como centro avanzado de análisis. Está orientado a revisar sesiones, observar la ejecución de ejercicios y consultar indicadores de movimiento en una vista amplia.

### Estructura del dashboard

| Zona | Elementos visuales | Función |
| :--- | :--- | :--- |
| **Barra superior** | Wordmark KYNET, descriptor, perfil y contexto | Identidad, cuenta y contexto del usuario. |
| **Navegación lateral** | Inicio, Entrenamiento, Análisis, Nutrición, Bienestar, Objetivos, Configuración | Acceso persistente a los módulos. |
| **Panel de análisis / Métricas** | Video principal, esqueleto de pose, timeline y miniaturas. Velocidad, rango de movimiento, fuerza de impacto, estabilidad y calidad técnica | Revisión de técnica y selección de momentos de la sesión. Seguimiento cuantitativo de la ejecución. |
| **Comparación postural** | Vista correcta frente a ejecución que requiere ajuste | Comunicar diferencias de alineación y técnica. |
| **Resumen** | Duración, calorías, repeticiones y enfoque de sesión | Síntesis de la sesión y resultados. |
| **Recomendación IA** | Tarjeta destacada con recomendación contextual | Traducir el análisis en una acción concreta. |

---

## 03. Aplicación móvil - mapa visual completo

La propuesta móvil organiza las funciones principales en pantallas específicas. El conjunto de vistas conceptuales abarca: bienvenida, inicio, detalle de entrenamiento, análisis en tiempo real, progreso, nutrición, perfil, notificaciones y objetivos.

### Lectura de las pantallas presentadas

| Pantalla | Objetivo UX | Contenido esencial |
| :--- | :--- | :--- |
| **Splash / bienvenida** | Presentar la marca y orientar al usuario. | Wordmark, descriptor, imagen de impacto y botón Comenzar. |
| **Inicio/dashboard** | Dar contexto diario y acceso inmediato. | Saludo, plan del día, iniciar entrenamiento, resumen semanal y métricas. |
| **Detalle de entrenamiento** | Preparar al usuario antes de iniciar. | Tipo de sesión, duración, nivel, ejercicios, series y repeticiones. |
| **Análisis en tiempo real** | Acompañar la ejecución y ofrecer feedback. | Vista de cámara, esqueleto, indicador de técnica, métricas y controles de sesión. |
| **Progreso / estadísticas** | Hacer visible la evolución. | Gráfica temporal, indicadores clave y comparativas. |
| **Nutrición** | Relacionar alimentación con objetivos. | Calorías, macros, comidas y plan diario. |
| **Perfil/configuración** | Gestionar identidad y preferencias. | Datos, objetivos, dispositivos, preferencias y configuración. |
| **Notificaciones** | Mantener continuidad y motivación. | Avisos de sesión, recomendaciones y recordatorios. |
| **Objetivos** | Definir una meta prioritaria. | Pérdida de peso, masa muscular, rendimiento o bienestar. |

---

## 04. Especificación de pantallas móviles

Las siguientes especificaciones convierten las vistas conceptuales en una guía de contenido y comportamiento. *(Los valores de métricas incluidos son ilustrativos y deben sustituirse por datos reales cuando se implemente el producto).*

### 04.1 Splash / bienvenida
* **Objetivo:** Presentar KYNET y comunicar su promesa de valor.
* **Contenido:**
  * Logotipo KYNET y descriptor INTELLIGENT FITNESS.
  * Imagen deportiva de alto impacto con tratamiento oscuro.
  * Texto breve: entrenamiento inteligente, resultados reales.
  * Acción primaria: Comenzar.
  * Acceso posterior a iniciar sesión o crear cuenta, si el flujo de autenticación lo requiere.
* **Criterio de diseño:** El primer contacto debe ser limpio y aspiracional. Evitar explicar demasiadas funciones en la portada.

### 04.2 Inicio / dashboard móvil
* **Objetivo:** Ser el punto de entrada diario y mostrar qué conviene hacer a continuación.
* **Contenido:**
  * Saludo personalizado y avatar.
  * Tarjeta "Tu plan de hoy" con objetivo, duración y nivel.
  * Botón principal "Iniciar entrenamiento".
  * Resumen de la semana: sesiones realizadas frente a objetivo.
  * Tarjetas de progreso: calorías estimadas y tiempo activo.
  * Acceso a recomendaciones y métricas.
* **Criterio de diseño:** Priorizar la acción principal. Los resúmenes deben ser escaneables en pocos segundos.

### 04.3 Detalle de entrenamiento
* **Objetivo:** Permitir revisar una sesión antes de comenzarla.
* **Contenido:**
  * Nombre de rutina y objetivo (por ejemplo, fuerza / tren superior).
  * Duración estimada y nivel.
  * Imagen o demostración de la sesión.
  * Lista ordenada de ejercicios.
  * Series, repeticiones y descansos por ejercicio.
  * Acción para iniciar la sesión.
* **Criterio de diseño:** La pantalla debe responder rápidamente: qué voy a hacer, cuánto dura y qué necesito.

### 04.4 KYNET Vision - análisis en tiempo real
* **Objetivo:** Mostrar el seguimiento corporal y retroalimentación mientras el usuario ejecuta un ejercicio.
* **Contenido:**
  * Vista de cámara en tiempo real.
  * Esqueleto y landmarks superpuestos sobre el cuerpo.
  * Indicador de confianza/detección y estado de cámara.
  * Nombre del ejercicio y fase de repetición.
  * Indicador de calidad técnica o criterio evaluado.
  * Métricas contextuales: rango de movimiento, velocidad u otras aplicables.
  * Controles para pausar, reanudar o finalizar.
  * Feedback visual, sonoro o háptico configurable.
* **Criterio de diseño:** El feedback debe ser breve y oportuno. Si la detección no es fiable, solicitar ajustar el encuadre en lugar de emitir una corrección.

### 04.5 Progreso / estadísticas
* **Objetivo:** Mostrar tendencias y dar contexto al avance.
* **Contenido:**
  * Selector de periodo: semana, mes, trimestre.
  * Gráfica de evolución del rendimiento.
  * Métricas clave: fuerza, resistencia, movilidad y composición corporal, si se dispone de datos.
  * Indicadores de cambio frente al periodo anterior.
  * Historial y detalle de sesiones.
* **Criterio de diseño:** No mostrar porcentajes de mejora sin una línea base y un periodo de comparación claramente definidos.

### 04.6 Nutrición
* **Objetivo:** Apoyar el seguimiento de hábitos alimentarios.
* **Contenido:**
  * Plan diario y objetivo calórico.
  * Distribución de macronutrientes.
  * Registro de comidas.
  * Recetas o sugerencias.
  * Resumen del cumplimiento diario.
* **Criterio de diseño:** Presentar los datos como orientación general y permitir personalizar objetivos.

### 04.7 Perfil / configuración
* **Objetivo:** Centralizar información personal y controles.
* **Contenido:**
  * Avatar, nombre y nivel de entrenamiento.
  * Objetivos y preferencias.
  * Dispositivos y servicios conectados.
  * Notificaciones, idioma y unidades.
  * Privacidad, permisos, ayuda y cierre de sesión.
* **Criterio de diseño:** Los permisos y las integraciones deben explicarse con lenguaje claro.

### 04.8 Notificaciones
* **Objetivo:** Mantener al usuario informado sin saturarlo.
* **Contenido:**
  * Confirmación de sesión completada.
  * Nueva recomendación de IA.
  * Recordatorios configurables.
  * Resumen semanal y hitos.
* **Criterio de diseño:** Permitir controlar frecuencia, categorías y canales de notificación.

### 04.9 Objetivos
* **Objetivo:** Ayudar a definir la meta prioritaria del usuario.
* **Contenido:**
  * Bajar de peso.
  * Ganar masa muscular.
  * Mejorar rendimiento.
  * Mejorar técnica o movilidad.
  * Bienestar general.
  * Acción para continuar y establecer objetivos medibles.
* **Criterio de diseño:** La selección inicial debe poder modificarse posteriormente y no encasillar al usuario.

---

## 05. Arquitectura funcional y módulos

La arquitectura propuesta separa las capacidades por dominio, pero conserva una navegación común y un mismo sistema visual.

| Módulo | Responsabilidad | Capacidades principales |
| :--- | :--- | :--- |
| **KYNET AI** | Inteligencia y recomendaciones | Motor de recomendaciones, adaptación de planes y explicación de tendencias. |
| **KYNET VISION** | Análisis postural y biomecánico | Cámara, estimación de pose, seguimiento de articulaciones, evaluación técnica y feedback. |
| **KYNET TRAIN** | Entrenamiento personalizado | Rutinas, biblioteca de ejercicios, sesiones, programación e historial. |
| **KYNET PERFORMANCE** | Rendimiento y métricas | Progreso, fuerza, movilidad, consistencia, estadísticas y comparativas. |
| **KYNET NUTRITION** | Nutrición | Calorías, macronutrientes, registro alimentario y objetivos. |
| **KYNET WELLNESS** | Recuperación y bienestar | Descanso, recuperación, actividad diaria y hábitos. |

### Navegación móvil recomendada
* **Inicio:** resumen, plan de hoy y recomendaciones.
* **Entreno:** rutinas, biblioteca, sesión activa e historial.
* **Progreso:** estadísticas, tendencias y objetivos.
* **Perfil:** cuenta, preferencias, dispositivos y configuración.

La cámara y KYNET Vision deben ser accesibles desde el flujo de entrenamiento, evitando convertir la barra inferior en una lista excesiva de módulos. Nutrición y Bienestar pueden estar disponibles desde Inicio o como secciones dentro de Explorar/Perfil, según las pruebas de usabilidad.

### Flujo de usuario: sesión de entrenamiento
`Inicio` ➔ `Plan del día` ➔ `Detalle de entrenamiento` ➔ `Preparación y permisos` ➔ `Sesión activa / KYNET Vision` ➔ `Resumen de sesión` ➔ `Recomendaciones` ➔ `Progreso`.

---

## 06. KYNET Vision - estructura del análisis

KYNET Vision es el diferenciador central de la experiencia. La interfaz debe separar claramente la visualización de cámara, la información de detección y las recomendaciones para no distraer al usuario.

### Capas de la experiencia
1. **Captura:** cámara, encuadre, iluminación y posición del usuario.
2. **Estimación:** detección de landmarks y confianza de cada punto corporal.
3. **Seguimiento:** estabilización temporal para reducir jitter y movimientos falsos.
4. **Interpretación:** cálculo de ángulos, rangos y fases del movimiento según el ejercicio.
5. **Evaluación:** reglas específicas de técnica y criterios de repetición.
6. **Feedback:** indicación concreta, contextual y graduada según la confianza del análisis.

### Estados visuales recomendados

| Estado | Color / señal | Mensaje UX |
| :--- | :--- | :--- |
| **Correcto** | Turquesa / verde + check | Criterio cumplido. Reforzar el movimiento correcto. |
| **Ajuste requerido** | Rojo o ámbar + alerta | Explicar qué ajustar con una instrucción breve. |
| **Detección insuficiente** | Neutro/gris | Ajusta la distancia, iluminación o encuadre. |
| **Procesando** | Turquesa animado | Analizando movimiento. Evitar mostrar conclusiones prematuras. |

### Métricas posibles en la interfaz
* Rango de movimiento (grados), cuando el modelo y el ejercicio permitan estimarlo.
* Repeticiones y series, basadas en estados/fases del ejercicio.
* Calidad técnica, como indicador compuesto y explicable.
* Velocidad o potencia, solo si existe una metodología y fuente de datos válidas.
* Estabilidad y simetría, cuando puedan estimarse de forma suficientemente robusta.

> **Importante:** las métricas de la visualización son ejemplos ilustrativos. No deben interpretarse como resultados validados ni como evaluación médica. Los criterios deben probarse y calibrarse por ejercicio y población.

---

## 07. Sistema visual y componentes de interfaz

### Paleta cromática
* **Primary - Electric Teal:** `#00E5C8` (Acciones principales, selección y datos activos).
* **Secondary - Deep Teal:** `#00A896` (Series secundarias y acentos).
* **Background - Midnight:** `#080F14` (Fondo principal).
* **Surface - Slate:** `#1E2C3A` (Navegación y paneles).
* **Card / Deep Surface:** `#101A22` (Tarjetas y paneles elevados).
* **Text - Ice White:** `#EBEEF2` (Texto principal).
* **Text - Muted:** `#8FA3B8` (Texto secundario).
* **Border:** `#263640` (Divisores y contornos).
* **Success:** `#22C997` (Confirmación y logro).
* **Warning:** `#F5B942` (Atención requerida).
* **Error:** `#FF5C69` (Error o corrección importante).

### Tipografía
* **Montserrat:** títulos, encabezados, cifras destacadas y elementos de marca.
* **Inter:** texto general, etiquetas, datos, formularios y lectura prolongada.

### Componentes base
* **Botón primario:** Electric Teal con texto Midnight; radio de 12-16 px.
* **Botón secundario:** transparente o Slate, borde Border y texto Ice White.
* **Tarjeta:** Deep Surface, borde discreto y radio de 16 px.
* **Gráfica:** línea turquesa, ejes y unidades legibles, periodo visible.
* **Indicador circular:** avance de objetivo con porcentaje y etiqueta.
* **Badge de estado:** punto de color más texto; nunca depender solo del color.
* **Iconos:** estilo lineal consistente, preferentemente Lucide.

### Reglas de composición móvil
* Diseñar primero para una pantalla móvil compacta; adaptar a tamaños mayores sin estirar componentes.
* Mantener una acción primaria por pantalla.
* Respetar zonas seguras del sistema operativo y tamaños táctiles cómodos.
* Evitar texto pequeño en métricas críticas durante una sesión activa.
* Usar contraste alto y no codificar información únicamente mediante color.

---

## 08. Tokens de diseño y handoff de desarrollo

### Guía de implementación por etapas
* **Etapa 1:** Base de producto: sistema de diseño, navegación, onboarding, perfil, objetivos y dashboard.
* **Etapa 2:** Entrenamiento: biblioteca de ejercicios, rutinas, temporizador, registro de sesiones e historial.
* **Etapa 3:** KYNET Vision: captura de cámara, estimación de pose, landmarks, suavizado temporal y superposición.
* **Etapa 4:** Análisis: cinemática, reglas por ejercicio, fases, conteo de repeticiones y feedback.
* **Etapa 5:** Ecosistema: progreso avanzado, recomendaciones adaptativas, nutrición, bienestar e integraciones.

### Consideraciones técnicas y de confianza
* Evaluar MediaPipe BlazePose o MoveNet considerando precisión, licencia, rendimiento y compatibilidad.
* Diseñar fallback cuando la detección sea insuficiente o la cámara no esté disponible.
* Validar en distintas alturas, cuerpos, condiciones de luz, ropa, cámaras y ángulos.
* Explicar el uso de cámara y datos de movimiento antes de solicitar permisos.
* Definir qué datos se procesan localmente y cuáles se envían a servicios externos.
* Incluir consentimiento, retención, exportación y eliminación de datos.
* No presentar las métricas como diagnóstico médico ni como garantía de prevención de lesiones.

---

## 09. Alcance, criterios de aceptación y evolución

### Criterios de aceptación UX/UI
* El usuario identifica en segundos cómo iniciar su entrenamiento desde Inicio.
* El usuario puede comprender la rutina antes de comenzar: duración, nivel y ejercicios.
* Durante KYNET Vision, cámara, estado de detección, ejercicio y controles son claramente visibles.
* El feedback indica un ajuste concreto y no aparece cuando la confianza del análisis es insuficiente.
* Las métricas incluyen unidad, contexto y periodo cuando corresponda.
* Los estados correcto, advertencia y error mantienen los mismos significados en toda la app.
* El sistema visual es consistente entre pantallas móviles y dashboard web.

### Entregables de diseño y desarrollo derivados de este manual
* Design system: colores, tipografías, espaciado, radios, iconos y componentes.
* Wireframes y prototipos de alta fidelidad para las nueve pantallas móviles descritas.
* Dashboard web con vista de análisis y panel de métricas.
* Flujos de usuario: onboarding, iniciar sesión, entrenamiento, análisis, resumen y progreso.
* Especificación de estados vacíos, carga, error, permisos y detección insuficiente.
* Especificación de eventos y datos necesarios para alimentar métricas y recomendaciones.

### Arquitectura de marca
* **KYNET AI** - Inteligencia y recomendaciones
* **KYNET VISION** - Análisis de postura y movimiento
* **KYNET TRAIN** - Entrenamiento personalizado
* **KYNET PERFORMANCE** - Rendimiento y métricas
* **KYNET NUTRITION** - Nutrición
* **KYNET WELLNESS** - Recuperación y bienestar

### Cierre
Esta propuesta establece una base visual y funcional para que KYNET evolucione como una plataforma integral de fitness inteligente. La experiencia combina una interfaz premium, análisis de movimiento y módulos de rendimiento, nutrición y bienestar dentro de un único sistema coherente.

> **Nota:** Las pantallas y métricas mostradas son conceptos visuales y ejemplos de interfaz. No representan funcionalidades implementadas ni datos de rendimiento validados. La marca KYNET requiere validación legal y comercial antes de su adopción definitiva.