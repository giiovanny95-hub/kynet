# Spec de producto: FitPose (nombre provisional)

Estado: borrador para aprobación. Alcance: MVP (partes 0-6 de `requirements.md`). Idioma de la app: español neutro LATAM/ES, tuteo.

## 1. Propuesta de valor y principios

**Propuesta:** "Entrena en casa con un entrenador que te ve, te cuenta las repeticiones y te corrige la técnica. Tu vídeo no sale del móvil."

**Usuario:** adulto (18+) que entrena en casa sin equipo, con poco espacio y poca paciencia para configurar cosas.

**Diferenciador:** las apps del benchmark son juegos arcade sin técnica ni progresión. FitPose cuenta, corrige la forma y motiva a volver cada día.

**Principios de diseño**
1. **Forma antes que volumen.** Una repetición limpia vale más que una sucia. Nunca premiamos el movimiento brusco ni el cansancio extremo.
2. **Cinco minutos al primer valor.** Del primer arranque a la primera repetición contada en menos de 3 min. Calibración mínima y saltable.
3. **Privado por diseño.** El vídeo se procesa en el dispositivo y no se guarda. Lo decimos en pantalla, no solo en la política.
4. **Constancia sin culpa.** Rachas con mensajes amables al romperse y racha máxima conservada (protectores y pausas llegan en la etapa 2). Sin castigos, sin cuentas atrás agresivas.
5. **Sin fricción comercial.** Sin anuncios ni muros de pago en el MVP.
6. **Sin letra pequeña en la pantalla de entrenar.** Pantalla grande, mensajes de máximo 4 palabras, audio y háptica.
7. **Cuidar el dispositivo.** Si el móvil se calienta, la app baja la carga y avisa; no se bloquea.

## 2. Onboarding mínimo (5 pasos, ~60-90 s)

Se puede saltar todo salvo la cámara (solo se pide al primer entrenamiento). El login con Google va al final, tras la primera sesión ("Guarda tu progreso"). Antes de eso se usa una cuenta local.

| Paso | Contenido | Texto de ejemplo |
|---|---|---|
| 1. Bienvenida | Propuesta + garantía de privacidad | "Cuento tus repeticiones y te corrijo la postura. Todo ocurre en tu móvil: el vídeo nunca sale de aquí." Botón: "Empezar" |
| 2. Nivel | 3 opciones | "¿Cómo te sientes con el ejercicio? **Estoy empezando** / **Entreno de vez en cuando** / **Entreno con regularidad**" (define repeticiones objetivo, ver 4.6) |
| 3. Objetivo | 3 opciones + frecuencia | "¿Qué buscas? **Crear el hábito** / **Ponerme en forma** / **Mejorar mi técnica**". "¿Cuántos días por semana?" 2 / 3 / 4 / 5+ (por defecto 3). Es una meta orientativa, no afecta la racha. |
| 4. Colocación | Ilustración y reglas | "Apoya el móvil en el suelo o en una silla, a 2 m de ti. Sentadilla y jumping jack: de frente. Flexiones: de lado. Que se te vea de pies a cabeza." |
| 5. Permisos | Cámara (contextual) y notificaciones | Cámara: "Necesito la cámara para ver tu postura. No grabo ni subo nada: el análisis se hace en tu teléfono." Botón "Permitir cámara". Notificaciones (opcional; en Android 13+ pide `POST_NOTIFICATIONS`): "¿Quieres un recordatorio amable a la hora que elijas? Puedes cambiarlo cuando quieras." Botón "Ahora no" igual de visible. |

Reglas: si deniega cámara, pantalla explicativa con botón "Abrir ajustes" y sin bloqueo del resto de la app. Si deniega notificaciones, no se vuelve a pedir hasta que el usuario lo active en Perfil. Aviso médico breve (ver 5.4) con casilla de aceptación antes del primer entrenamiento, no en el onboarding inicial.

## 3. Pantallas clave del MVP

Navegación inferior: **Hoy · Progreso · Misiones · Perfil**. Entrenar se abre desde Hoy.

### 3.1 Inicio / Hoy
Contenido: saludo, racha (llama + días), anillo de meta del día, tarjeta "Entreno de hoy" (sugerido por nivel), misiones diarias (resumen), XP y nivel.

```
┌──────────────────────────────┐
│ Hola, Ana         🔥 5   🛡 1 │
│ Nivel 4 ▓▓▓▓▓░░░ 120/220 XP  │
│                              │
│  ┌────────────────────────┐  │
│  │ Entreno de hoy · 8 min │  │
│  │ 10 sentadillas         │  │
│  │ 20 jumping jacks       │  │
│  │ 8 flexiones            │  │
│  │ [   EMPEZAR   ]       │  │
│  └────────────────────────┘  │
│  Misiones de hoy  1/3        │
│  ◉ 20 sentadillas  +20 XP    │
│  ○ Forma limpia ≥80%         │
│  ○ Prueba flexiones          │
│ [Hoy][Progreso][Misiones][Perfil]│
└──────────────────────────────┘
```
Estados: primera vez (sin racha: "Empieza hoy tu racha"); día completado (anillo lleno, "Hecho. Mañana más."); racha en riesgo tras las 18:00 local sin sesión (texto neutro "Aún puedes mantener tu racha hoy"); sin conexión (indicador discreto, todo funciona); sesión interrumpida (tarjeta "Retomar").

### 3.2 Elegir ejercicio
Lista de 3 tarjetas: sentadilla, jumping jack, flexión (icono, posición del móvil, nivel de impacto, última marca). Selector de series y repeticiones (por defecto según nivel). Opción "Sesión completa" (los 3). Estados: ejercicio con etiqueta "De lado" en flexiones; jumping jack con aviso "Impacto: apto solo si no tienes molestias en rodillas o tobillos"; modo bajo impacto (jumping jack sin salto: "step jack"), como alternativa sugerida, pospuesto si no cabe en el MVP (decisión abierta 9.5).

### 3.3 Colocación y calibración
Paso A: guía de colocación con silueta en pantalla. Verde cuando se ven los landmarks requeridos (visibilidad media ≥0.65), aviso en rojo si no ("Aléjate un paso", "Sube el móvil", "Gírate de lado").
Paso B: calibración de 3 repeticiones guiadas, solo la primera vez por ejercicio y por usuario, con botón "Omitir (usar valores estándar)" siempre visible. Umbrales ajustados ±10°.

```
┌──────────────────────────────┐
│ ✕           Sentadilla       │
│     ┌────────────┐           │
│     │  silueta   │  ✔ Cuerpo │
│     │  guía      │  ✔ Luz    │
│     │            │  ✔ Distancia│
│     └────────────┘           │
│  "Perfecto. Haz 3 sentadillas│
│   despacio para calibrar"    │
│   Repetición 1 de 3  ● ○ ○   │
│   [Omitir]                   │
└──────────────────────────────┘
```
Estados: sin permiso de cámara; poca luz; cuerpo parcial; usuario se mueve durante la cuenta atrás; calibración fallida dos veces (se ofrece valores estándar, no se bloquea); cámara ocupada por otra app.

### 3.4 Entrenamiento (HUD)
Cámara a pantalla completa, esqueleto superpuesto, contador de repeticiones grande, barra de calidad, mensaje de postura de una línea, serie actual, temporizador, botón pausa. Audio (tono por repetición, voz opcional) y háptica.

```
┌──────────────────────────────┐
│ ⏸  Sentadilla   Serie 2/3  4:12│
│                              │
│        (esqueleto Skia)      │
│                              │
│  ⚠ "Baja un poco más"        │
│                              │
│            12 / 15           │
│  Forma ▓▓▓▓▓▓▓░░  Limpias 10 │
└──────────────────────────────┘
```
Estados: pausa automática si visibilidad <0.65 durante 3 cuadros ("No te veo. Colócate en el encuadre."); térmica severa (baja a 20 FPS, aviso discreto "Tu móvil está caliente; bajamos la carga"); aviso a los 15 min ("Llevas 15 min; considera descansar"); descanso entre series (cuenta atrás de 30 s, saltable, con consejo); interrupción (llamada, app en segundo plano): sesión se pausa y se puede reanudar hasta 30 min después; batería <10% (aviso).

### 3.5 Resumen de sesión
Contenido: repeticiones totales y limpias, porcentaje de forma, XP ganado (desglose), progreso de nivel, racha del día, misiones completadas, un único consejo de técnica (el error más frecuente), botones "Listo" y "Otra serie".

```
┌──────────────────────────────┐
│   ¡Buen trabajo, Ana!        │
│   +94 XP    🔥 Racha: 6      │
│   Reps 38   Limpias 31 (82%) │
│   Consejo: "Mantén el pecho  │
│   arriba al bajar"           │
│   ✔ Misión: 20 sentadillas   │
│   Nivel 4 ▓▓▓▓▓▓░░           │
│   [   LISTO   ]              │
└──────────────────────────────┘
```
Estados: sesión corta (<1 min o <5 repeticiones: "Cuenta como día activo si haces 20 reps" ver 4.4, sin XP de sesión); mala forma persistente (tono neutro: "Bajemos el ritmo la próxima vez"); nivel subido (animación breve); sin conexión (guardado local, "se sincronizará luego").

### 3.6 Progreso / racha
Calendario mensual con días activos; racha actual y máxima; XP semanal; repeticiones totales; forma limpia media por ejercicio (gráfico de 4 semanas); récords personales. Estados: vacío (primer día), racha rota (copy amable, 4.4 y 4.7).

### 3.7 Misiones
Pestañas "Diarias" y "Semanales". Cada misión: título, progreso, recompensa. Estados: completada (check y XP reclamable automáticamente), expira en X horas (solo informativo), todas completadas ("¡Día redondo! +15 XP").

### 3.8 Perfil
Avatar y nombre, nivel y XP, ajustes: objetivo y frecuencia, nivel de dificultad, recordatorios (hora), sonido/voz/háptica, idioma, protección de privacidad (qué guardamos), exportar datos, cerrar sesión, eliminar cuenta, aviso médico, versión. Estados: cuenta local sin login ("Guarda tu progreso" con Google), sincronizando, error de sincronización (reintentar).

## 4. Mecánicas de hábito (números y justificación)

### 4.1 XP por repetición (según calidad)
Cada repetición recibe una puntuación de forma (0-100) de la FSM:
| Calidad | Puntuación | XP |
|---|---|---|
| Limpia | ≥80 | **2** |
| Aceptable | 50-79 | **1** |
| Con fallo (profundidad/alineación) | <50 | **0** (se cuenta pero no puntúa) |
| Demasiado rápida (<0.8 s sentadilla y flexión) | n/a | **0** y aviso |

Justificación: la diferencia entre 2 y 1 es suficiente para que la calidad importe sin hacer sentir castigo (siempre se cuenta). 0 XP en las rápidas desincentiva el movimiento balístico. Los umbrales de 80 y 50 se ajustan con datos de beta (D1-D7).

### 4.2 XP por sesión
- Completar sesión (≥1 serie completa): **+20**
- Primera sesión del día: **+10**
- Forma limpia media ≥80% en la sesión: **+10**
- Probar un ejercicio por primera vez: **+15** (una vez por ejercicio)
- Tope de XP por repetición: **300 por día** (evita ranking de volumen y sobreentrenamiento).

Sesión típica (10 sentadillas, 20 jumping jacks, 8 flexiones, 80% limpias): ≈ 38 reps × ~1,8 = ~68 + 20 + 10 + 10 = **~108 XP**.

### 4.3 Curva de niveles
XP para pasar del nivel n al n+1: `100 + 40·(n−1)`. Acumulado para llegar al nivel L: `100(L−1) + 20(L−1)(L−2)`.
| Nivel | XP acumulado | Tiempo estimado (4 sesiones/semana ≈ 500 XP/semana con misiones) |
|---|---|---|
| 2 | 100 | Primera sesión |
| 5 | 640 | ~1,5 semanas |
| 10 | 2.340 | ~5 semanas |
| 20 | 8.740 | ~17 semanas |
| 30 | 19.140 | ~38 semanas |

Justificación: subidas rápidas al inicio (3 niveles en la primera semana) para dar recompensa en el periodo de mayor abandono; curva suave luego para que haya meta a largo plazo cuando el efecto novedad desaparece (semanas 3-4). Títulos cada 5 niveles (cosmético).

### 4.4 Racha
**Qué cuenta como día activo:** al menos una sesión con **≥20 repeticiones contadas (cualquier calidad) o ≥3 min activos**. Umbral bajo a propósito: el día malo también cuenta. La calibración no cuenta.

**Zona horaria y día:**
- El día es la fecha **local del dispositivo**, con el corte a las **03:00** (la sesión de las 00:40 cuenta para el día anterior). Cada sesión guarda `timestamp UTC`, `tz_offset` y `fecha_de_racha` calculada al cerrar la sesión.
- Viaje o cambio de zona: se respeta la fecha local de cada sesión; un día nunca se cuenta dos veces ni se pierde por cambiar de zona (máximo 1 día por `fecha_de_racha`).
- Offline: la racha se calcula en el cliente con el reloj del dispositivo y se sincroniza. El servidor acepta fechas hasta 1 día en el futuro respecto a su hora UTC y rechaza retrocesos del reloj mayores a 24 h respecto a la última sincronización (sin anti-trampas completo, solo coherencia). Los conflictos entre dispositivos se resuelven tomando la unión de días activos.

> **Decisión ronda 5: protector, pausa, reparación y compra quedan FUERA del MVP (etapa 2).** En el MVP, un día cerrado sin actividad rompe la racha (se conserva la racha máxima y el mensaje es amable). El resto de esta sección describe el diseño de la etapa 2 y no se implementa ahora. Riesgo: sin protector la racha es más frágil y puede aumentar el abandono; medirlo en la beta.

**Protector (racha en peligro) - ETAPA 2:**
- Se empieza con **1**.
- Se gana **1 cada 7 días de racha** (7, 14, 21...). Máximo almacenado: **2**.
- Se gasta **automáticamente** al cerrar un día sin sesión (a las 03:00 del día siguiente). Cubre 1 día; si faltan 2 días seguidos y hay 2 protectores, cubre ambos. Un día protegido no suma a la racha, solo la mantiene.
- Se puede **comprar** con **400 XP** (si se tiene espacio); el XP gastado no baja el nivel (nivel basado en XP histórico).

**Pausa de racha (ETAPA 2):** una vez cada 30 días el usuario puede activar "Pausa" de hasta 7 días (enfermedad, viaje, lesión) sin gastar protector.

**Racha rota (MVP):** la racha vuelve a 0 y se conserva "racha máxima". "Reparar" (completar 2 sesiones activas en las siguientes 24 h para restaurar la racha anterior) es ETAPA 2. Copy: "Fue un descanso, no un fracaso. Retomemos."

Justificación: 7 días por protector da el primer premio antes de la ventana crítica de abandono; el tope de 2 evita acumular indefinidamente. Corte a las 03:00 evita perder la racha por entrenar de madrugada.

### 4.5 Misiones diarias
Tres por día, a las 03:00 local, generadas con semilla `userId + fecha`. Una fácil, una media y una de calidad.
| Tipo | Ejemplo | Recompensa |
|---|---|---|
| Fácil | "Haz 15 sentadillas" / "Entrena 3 minutos" | 20 XP |
| Media | "Completa 20 jumping jacks" / "Haz 2 series de flexiones" | 30 XP |
| Calidad | "Termina una sesión con ≥80% de forma limpia" | 30 XP |
| Exploración | "Prueba un ejercicio que no hiciste esta semana" | 20 XP |

Bonus por completar las tres: **+15 XP**.

Reglas de generación:
- Objetivo numérico = mediana de repeticiones por sesión de los últimos 7 días × 1,0 (fácil) / 1,3 (media), redondeado a 5, con mínimo por nivel inicial (empezando: 10; regular: 15; avanzado: 20) y tope de +25% respecto a la semana previa.
- Sin repetir la misma misión dos días seguidos ni ejercicios que el usuario haya desactivado.
- Una misión de calidad solo si hay ≥3 sesiones previas con forma estimada.
- Si el usuario falló todas las misiones los 2 días anteriores, la fácil se reduce un 30% (anti-frustración).
- Una sesión puede completar varias misiones. Todas se pueden cumplir con una sola sesión de ~8 min.

### 4.6 Misiones semanales (lunes 03:00 local)
Tres, con objetivo personalizado a la meta de días del onboarding:
| Misión | Regla | Recompensa |
|---|---|---|
| Constancia | Entrena los días de la meta (2-5) | 100 XP |
| Volumen | Reps = media de las 2 semanas previas × 1,1 (mín. 60, tope +20%) | 80 XP |
| Variedad | Haz los 3 ejercicios | 60 XP |

Completar las tres: insignia semanal (cosmética). (En la etapa 2 también dará +1 protector, ver 4.4.) Progreso no se pierde al cambiar de semana si la sesión empezó antes del corte.

Repeticiones objetivo por sesión según nivel de onboarding: empezando 8/12/6 (sentadilla/jumping jack/flexión); regular 12/20/10; avanzado 15/30/15; 2-3 series.

### 4.7 Anti-frustración y tono
- Nunca se quita XP ni nivel. Nunca hay mensajes de culpa ("perdiste", "fallaste").
- Racha rota: copy empático + camino de reparación (4.4). Máximo 1 recordatorio push al día (etapa 2) y pausable.
- Reenganche: tras 3 días sin entrenar, la sesión sugerida es corta (5 min) y las misiones se reducen. Mensaje: "Bienvenida de nuevo. Empecemos suave."
- Celebraciones breves y saltables; sin pantallas de venta tras el entrenamiento.
- Texto en positivo: "Casi: baja un poco más", no "Mal".
- Los errores del sensor nunca se atribuyen al usuario: "No te veo bien" en lugar de "Postura incorrecta".

## 5. Dificultad y seguridad

### 5.1 Avisos de forma (por ejercicio)
| Ejercicio | Avisos (máx. 1 cada 4 s, el más grave primero) |
|---|---|
| Sentadilla | "Baja un poco más" (profundidad), "Rodillas hacia fuera" (valgo), "Pecho arriba" (inclinación excesiva del tronco), "Sube sin impulso" (rápida) |
| Jumping jack | "Abre más los brazos", "Aterriza suave" (impacto), "Ritmo constante" |
| Flexión | "Cuerpo recto" (cadera caída o levantada), "Baja más", "Codos pegados" |

Cada aviso se acompaña de háptica corta; la voz es opcional. Si el mismo error ocurre 3 veces seguidas, el aviso pasa a una tarjeta de pausa con la corrección ilustrada.

### 5.2 Fatiga y mala forma
- **Detección:** la puntuación media de las últimas 3 repeticiones cae ≥20 puntos respecto a las primeras 5, o hay 3 repeticiones consecutivas con fallo.
- **Respuesta:** la app detiene el conteo con un mensaje: "Tu forma está bajando. Descansa 30-60 s o termina aquí." Botones "Descansar", "Terminar serie", "Seguir". No es un bloqueo; si sigue, no gana XP por repeticiones con fallo (ya es 0).
- **Descanso mínimo entre series:** 30 s por defecto (saltable con confirmación).
- **Aviso de duración:** a los 15 min, sugerencia de terminar; a los 25 min, recomendación más firme. Tope sugerido por sesión: 20 min.
- **Movimientos balísticos:** repeticiones por debajo de la velocidad mínima no puntúan (4.1). Jumping jack: sin metas de velocidad ni "récords de ritmo".
- **Progresión:** subir repeticiones objetivo solo si las últimas 2 sesiones tuvieron forma limpia media ≥75% y ninguna alerta de fatiga. Se ofrece, no se impone. Bajar objetivo automático tras 2 sesiones consecutivas con alertas de fatiga.
- Calentamiento y enfriamiento guiados quedan para la etapa 2; en el MVP, el entrenamiento incluye una sugerencia de 1 minuto de movilidad antes de empezar (omitible, sin cámara).

### 5.3 Dificultad adaptativa
Tres niveles de onboarding fijan reps iniciales (4.6). Ajuste automático moderado: ±10% reps, máximo una vez por semana. Sin cambios de dificultad dentro de una sesión.

### 5.4 Advertencia médica y descargo
Pantalla obligatoria antes del primer entrenamiento (casilla "Entiendo y acepto"):
> "FitPose es una herramienta de apoyo para entrenar y no sustituye el consejo de un profesional sanitario. Consulta a tu médico antes de empezar si tienes una condición cardíaca, respiratoria, articular o embarazo, o si llevas tiempo sin hacer ejercicio. Detente si sientes dolor, mareo, falta de aire u opresión en el pecho. Entrena en un espacio libre de obstáculos. El análisis de postura es aproximado y puede fallar: tu cuerpo manda."
Se repite resumida en Perfil > Aviso médico y en los términos. La app no da diagnósticos ni consejos clínicos ni de pérdida de peso. Opción en onboarding "Tengo una lesión" abre el aviso extendido y sugiere omitir el ejercicio afectado (sin lógica médica).

## 6. Privacidad

### 6.1 Qué datos se guardan
| Dato | Dónde | Notas |
|---|---|---|
| Fotogramas / vídeo | Memoria del dispositivo, solo en procesamiento | **No se guardan ni se envían.** |
| Landmarks de pose | Memoria, descartados al terminar la serie | No se persisten ni suben en el MVP. |
| Resultados de sesión (ejercicio, repeticiones, calidad media, duración, fecha, XP) | SQLite local + Supabase (RLS por usuario) | Datos de actividad física: se tratan como datos de salud. |
| Cuenta (ID de Google, correo, nombre) | Supabase | Solo con login. |
| Preferencias (nivel, objetivo, hora de recordatorio) | Local + Supabase | |
| Telemetría de producto (eventos agregados) | Opcional, activable | Sin identificadores publicitarios; ver 7. |

### 6.2 Consentimiento de cámara y mensaje
- Permiso de cámara solicitado al primer entrenamiento, con pantalla previa que explica el uso.
- Mensaje fijo en pantalla de colocación y en Perfil: "El vídeo se analiza en tu teléfono y nunca sale de él. No lo guardamos ni lo enviamos."
- Indicador de cámara activa durante el entrenamiento; la cámara se libera al salir o poner la app en segundo plano.
- Sin capturas de pantalla del vídeo ni clips (fuera del MVP).

### 6.3 Datos de salud, edad y legales
- **Consentimiento explícito** (casilla separada, no premarcada) para el tratamiento de datos de actividad física y su sincronización con la nube. Sin consentimiento, la app funciona solo en local.
- **Edad mínima: 18 años** (decisión del usuario, ronda 5; autodeclaración con pantalla neutral de fecha de nacimiento y bloqueo de menores). Evita consentimiento parental y requisitos de Families Policy de Google Play por ahora. Ampliar el rango de edades llegará después y exigirá revisión legal por país. Ver decisión 9.4.
- Marco: RGPD/LOPDGDD (España), LFPDPPP (México), Ley 1581 (Colombia), Ley 19.628/21.719 (Chile), Ley 25.326 (Argentina). Responsable del tratamiento, base legal (consentimiento), derechos ARCO/ARSULIPO, contacto de privacidad y transferencias internacionales (si Supabase se aloja fuera de la región del usuario) se detallan en la política. Revisión legal antes de publicar.
- **Retención:** datos de cuenta y sesiones hasta que el usuario elimine la cuenta; inactividad de 24 meses: aviso y borrado.
- **Exportación:** JSON desde Perfil.

### 6.4 Eliminación de cuenta
Desde Perfil > Eliminar cuenta, con confirmación. Borra de Supabase todos los datos del usuario (sesiones, preferencias, cuenta) en un máximo de 30 días (objetivo: inmediato), y los datos locales. Debe existir también un **enlace web de solicitud de eliminación** (requisito de Google Play).

### 6.5 Requisitos de Google Play
- **Política de privacidad:** URL pública, enlazada en la ficha y dentro de la app, en español (y en inglés).
- **Sección Seguridad de los datos (Data safety):** declarar *Salud y forma física* (actividad física), *Información personal* (correo, nombre, ID de usuario), *Actividad en la app*. Datos cifrados en tránsito: sí. Opción de eliminar datos: sí (con enlace). Compartidos con terceros: no. El vídeo/fotos: **no recopilados** (procesamiento solo en el dispositivo; verificar que ninguna librería lo envíe).
- **Declaración de apps de salud** (formulario de Play Console) y categoría "Salud y bienestar". Aclarar que no es un producto médico.
- **Permisos:** `CAMERA`, `POST_NOTIFICATIONS` (etapa 2) y nada más; sin ubicación ni micrófono. Evitar `RECORD_AUDIO`.
- Cumplir el nivel de API objetivo vigente, clasificación de contenido IARC y pruebas cerradas requeridas para cuentas personales nuevas (revisar el requisito vigente al publicar).
- Sin SDKs publicitarios.

## 7. Métricas de éxito del MVP

Beta cerrada inicial de 30-50 usuarios (amigos y comunidad); los umbrales son objetivos de aprendizaje, no de negocio.
| Métrica | Definición | Objetivo |
|---|---|---|
| **Activación** | % de instalaciones que completan una sesión con ≥10 repeticiones contadas en las primeras 24 h | ≥ 60% |
| **Tiempo al primer valor** | Mediana desde el primer arranque a la primera repetición contada | ≤ 3 min |
| **Finalización de calibración** | % que termina las 3 repeticiones guiadas sin omitir | ≥ 80% (y omitir ≤ 15%) |
| **Retención D1 / D7 / D30** | Usuarios activos (sesión) en ese día respecto a nuevos | 40% / 20% / 8% (referencia de fitness: ~25-30% D1) |
| **Sesiones por semana** | Mediana en usuarios activos de la semana | ≥ 3 |
| **Racha media** | Mediana de racha máxima entre usuarios con ≥7 días | ≥ 5 |
| **Precisión percibida** | Encuesta de 1 pregunta tras sesiones 3 y 10: "¿Contó bien tus repeticiones?" (1-5) | ≥ 4,0; ≥85% responde 4-5 |
| **Reclamaciones de conteo** | Botón "Mal contado" en resumen (tasa por sesión) | ≤ 8% |
| **Estabilidad** | Sesiones sin cierre inesperado; aviso térmico por sesión | ≥ 99,5%; ≤ 10% |
| **Abandono en semanas 3-4** | Caída de sesiones/semana entre S2 y S4 | ≤ 35% |

Instrumentación mínima: eventos locales anonimizados (`onboarding_step`, `calibration_end`, `session_start/end`, `rep_flag_wrong`, `streak_break`), activados por consentimiento, sin PII. Herramienta ligera (por ejemplo, tablas en Supabase y consultas) en lugar de SDK de analítica de terceros en el MVP.

## 8. Fuera del MVP y orden de la etapa 2

**Fuera del MVP:** ligas y ranking, push, pase de batalla, premium, anti-trampas, iOS y Apple Sign-In, Health Connect, clips, minijuegos, modo infantil, catálogo ampliado, calentamiento/enfriamiento guiados, modo de ritmo con calibrador de audio.

**Orden recomendado de la etapa 2 (cada paso con criterio de entrada):**
1. **Recordatorios push** (bajo coste, mayor efecto en retención D7). Entrada: D7 ≥ 15%. Máx. 1/día, hora elegida por el usuario, pausa en un toque.
2. **Calentamiento y enfriamiento guiados + dificultad adaptativa por fatiga** (diferenciador del informe 3 y reduce lesiones).
3. **Catálogo ampliado** (plancha, zancadas, puente de glúteos...), que alimenta misiones y variedad.
4. **Anti-trampas básico** (plausibilidad de ritmo, tope por día, confianza por dispositivo). Prerrequisito de cualquier ranking público.
5. **Ligas semanales** con ascenso/descenso, grupos de ~30 en cohortes por nivel, ranking solo de XP validado. Entrada: ≥ 300 usuarios activos semanales para poblar ligas.
6. **Pase de batalla por temporadas** (cosmético: avatares, marcos, sonidos de repetición; sin ventaja competitiva).
7. **iOS** y Apple Sign-In (en paralelo cuando haya dispositivo y cuenta de desarrollador).
8. **Carril premium de pago:** análisis detallado de forma, planes, historial extendido, temas. Nunca el conteo básico, la racha ni el protector. Sin anuncios.

### 8.1 Sugerencia de monetización (no decidida; benchmark de 10 apps, 2026-10-29)
Propuesta a validar cuando se diseñe el carril premium; las cifras del benchmark son afirmaciones de un informe externo sin verificar.
- **Gratis e ilimitado:** conteo manos libres por cámara, diario de entrenamiento, racha y misiones. Según el informe, cobrar por el conteo básico provoca desinstalaciones inmediatas.
- **De pago (valor alto):** coaching de voz con corrección postural en vivo, análisis a largo plazo de forma y desequilibrios, y retos o clasificaciones con repeticiones validadas por cámara (anti-trampas).
- **Momento del muro de pago:** después de que el usuario haya comprobado que el conteo funciona (no en la primera sesión ni antes de entrenar).
- **Referencias de precio del informe:** suscripciones de 4 a 15 USD al mes o 23 a 80 USD al año; Form Coach y SmartSight venden pagos únicos de 5 a 15 USD.

## 9. Riesgos y decisiones abiertas

**Riesgos**
| Riesgo | Impacto | Mitigación |
|---|---|---|
| Conteo impreciso (sobre todo flexiones de lado) | Alto: rompe la confianza | Botón "Mal contado", calibración opcional, métrica de reclamaciones, fixtures de prueba |
| Térmica y batería en 15-20 min | Medio | Bajar a 20 FPS, aviso a 15 min, tope sugerido de 20 min |
| Efecto novedad (abandono S3-S4) | Alto | Misiones adaptativas, curva de niveles lenta, reenganche suave (protector en etapa 2); push en etapa 2 |
| Lesiones o malas formas incentivadas por la gamificación | Alto | XP por calidad, 0 XP en rápidas, topes diarios, avisos de fatiga, descargo |
| Racha incorrecta por hora/zona/offline | Medio | Reglas de 4.4, pruebas unitarias de fronteras (03:00, DST, viaje) |
| Privacidad: datos de salud y cuenta | Alto | Local-first, consentimiento explícito, RLS, eliminación, revisión legal |
| Alcance para una persona en 6-8 semanas | Alto | Recortar misiones semanales y Progreso antes que calibración o conteo (el protector ya salió del MVP) |
| Aprobación en Google Play (cuenta nueva, pruebas cerradas) | Medio | Empezar pruebas cerradas en cuanto haya build estable |

**Decisiones abiertas para el usuario**
1. **Corte del día:** ¿03:00 local (recomendado) o medianoche?
2. **Día de descanso:** **Resuelta (ronda 5):** sin protector ni pausa en el MVP. Pendiente (etapa 2): protector + pausa o un "día de descanso" semanal gratuito para reducir el riesgo de sobreentrenamiento.
3. **Compra de protector con XP (400):** **Resuelta (ronda 5): etapa 2.**
4. **Edad mínima:** **Resuelta (ronda 5): 18+.** Se ampliará a más edades más adelante, con revisión legal por país.
5. **Alternativa de bajo impacto** del jumping jack ("step jack"): ¿en el MVP o etapa 2?
6. **Sesión sin login:** **Resuelta (ronda 5):** uso local hasta después de la primera sesión; luego se ofrece el login con Google ("Guarda tu progreso") y se importan las sesiones locales.
7. **Telemetría:** ¿tablas propias en Supabase (recomendado) o un SDK de analítica (cambia la Data safety)?
8. **Umbrales de calidad (80/50) y velocidad mínima (0,8 s):** validar con grabaciones reales antes de fijarlos.
9. **Nombre definitivo, identificador de paquete y región de Supabase** (afecta la política de privacidad).
10. **Audio:** ¿voz en español neutro grabada, síntesis del dispositivo, o solo tonos en el MVP?
