# Requisitos consolidados: FitPose (nombre provisional)

Fuentes: Informe 1 (blueprint técnico), Informe 2 (infraestructura con Claude Code), Informe 3 (benchmark de 10 apps) y las decisiones del usuario. Estado: borrador para aprobación.

## 1. Visión
App móvil para adultos que entrenan en casa. La cámara del teléfono detecta la pose en el dispositivo, cuenta repeticiones y avisa de errores de forma. Un sistema de hábito inspirado en Duolingo (XP, racha, misiones y, en la etapa 2, protector de racha y ranking por temporadas) fomenta el uso diario. El vídeo nunca sale del teléfono.

Diferenciador frente al mercado (Informe 3): casi todas las apps son juegos arcade sin técnica ni progresión. FitPose combina conteo y corrección de forma con motivación diaria.

## 2. Decisiones cerradas
| Tema | Decisión |
|------|----------|
| Stack | React Native + Expo (development build), TypeScript `strict`, VisionCamera + worklets, Skia, SQLite local, Supabase |
| Plataforma inicial | Solo Android (Galaxy S26 Ultra, Pixel 7 Pro) |
| iOS | Etapa posterior (requiere Apple Developer; iPhone 12 mini disponible) |
| Idioma | Español primero (LATAM/ES), i18n desde el inicio |
| Login | Google vía Supabase; Apple Sign-In en etapa posterior |
| Ejercicios MVP | Sentadilla, jumping jack, flexión (móvil de lado) |
| Equipo y plazo | Una persona, 6-8 semanas |
| Anti-trampas | Fuera de alcance; el ranking no es confiable en el MVP |
| Backend | Proyecto Supabase nuevo y aislado; el proyecto del CRM de Verse no se toca |
| Premium de pago | Etapa posterior |

## 3. Alcance del MVP (partes 0 a 6) y criterios de aceptación
| Parte | Entregable | Criterio de aceptación |
|-------|-----------|------------------------|
| 0 | Repo, entorno, `CLAUDE.md`, Supabase aislado, EAS | `npm run typecheck` sin errores; build de desarrollo instalable en ambos Android |
| 1 | Spike de cámara y pose | Landmarks en vivo a 30 FPS sin bloquear el hilo de UI en S26 Ultra y Pixel 7 Pro; descarte de cuadros por contrapresión verificado |
| 2 | Módulo de cinemática | Ángulos 2D/3D, filtro One-Euro y FSM de sentadilla y jumping jack con pruebas headless; precisión de conteo mayor a 95% en fixtures; suite en menos de 2 s |
| 3 | Pantalla de entrenamiento | HUD, esqueleto Skia a 60 Hz, conteo, aviso de postura, audio y háptica sin retardo perceptible; sesión de 15 min sin caer de 25 FPS |
| 4 | Flexiones | Conteo con el móvil de lado; precisión mayor a 90% en sesión controlada; instrucciones de colocación en pantalla |
| 5 | Login y sesiones | Google funciona; sesiones guardadas en local y sincronizadas con Supabase con RLS; la app funciona sin conexión |
| 6 | Hábito | XP y niveles, racha (sin protector en el MVP), misiones diarias y semanales; reglas de zona horaria y de día cerrado definidas y probadas |

## 4. Requisitos técnicos transversales
- La inferencia, los ángulos y el filtrado no corren en el hilo de UI.
- Contrapresión: si el modelo está ocupado, el cuadro entrante se descarta.
- Inferencia a un máximo de 30 FPS; esqueleto dibujado a la tasa de la pantalla con valores interpolados.
- Resolución de entrada moderada (por ejemplo 640x480) y tensor de 192-256 px.
- Si el sistema reporta estado térmico severo, bajar a 20 FPS sin cambiar la lógica de conteo.
- Visibilidad media de los landmarks requeridos menor a 0.65 durante 3 cuadros: pausar el conteo y avisar al usuario.
- Calibración inicial de 3 repeticiones guiadas; umbrales ajustados con tolerancia de más o menos 10 grados.
- Audio de efectos precargado en memoria; háptica en paralelo.
- TypeScript `strict`, sin `any`; datos de landmarks con tipos inmutables.
- Las pruebas de cinemática usan fixtures JSON de landmarks, sin cámara ni modelo.

## 5. Contradicciones entre informes y resolución propuesta
| Tema | Informe 1 | Informe 2 | Propuesta |
|------|-----------|-----------|-----------|
| Estados de la FSM | START, ECCENTRIC, INFLECTION, CONCENTRIC, COMPLETED, FAULT | IDLE, DESCENDING, INFLECTION, ASCENDING, COMPLETED | Unificar con FAULT (sin él no hay corrección de forma): IDLE, DESCENDING, INFLECTION, ASCENDING, COMPLETED y FAULT |
| Base de datos local | SQLite o Isar | op-sqlite | op-sqlite (SQLite); confirmar compatibilidad con Expo en T3 |
| Dataset de ejercicios | RepDB (WebP) | free-exercise-db o RepDB | Decidir tras T2 y T4 (licencias); el MVP solo necesita 3 ejercicios |
| Umbral de jank | n/a | 5% en script y 3% en el paso 6 | 5% como mínimo y 3% como objetivo |
| Cuerpo | MediaPipe 33 puntos | MediaPipe vía fast-tflite | Decidir en T3; el binding es el mayor riesgo |

## 6. Aprendizajes del benchmark que entran al diseño
- Calibración de silueta y de distancia al inicio (todas las apps).
- Aviso de colocación del móvil; en flexiones, indicar de lado.
- Controlar la térmica: bajar FPS, evitar duplicar pantalla en el MVP.
- Calentamiento y enfriamiento guiados (ninguna app los tiene): etapa 2.
- Dificultad adaptada a la fatiga y calidad de forma: etapa 2.
- Evitar anuncios y muros de pago agresivos.
- Desfase audio-movimiento: calibrador solo si hay modo de ritmo (fuera del MVP).

## 7. Fuera del alcance del MVP
Ligas y ranking global, push, iOS y Apple Sign-In, pase de batalla, carril premium, anti-trampas, clips, minijuegos, modo 2 jugadores, modo infantil, Health Connect y Apple Health, catálogo de más ejercicios.

## 8. Riesgos y preguntas abiertas
1. Binding de MediaPipe en React Native (spike en T3 y parte 1).
2. Detección de flexiones con el cuerpo horizontal.
3. Térmica en gama media (sin dispositivo de prueba).
4. Racha y misiones sin servidor de tiempo confiable: definir zona horaria y manejo offline.
5. Privacidad: datos de salud y cuenta; política de privacidad antes de publicar.
6. Licencias de datasets y atribución.
7. Nombre definitivo e identificador de paquete (provisional: FitPose).

## 9. Decisiones de la revisión cruzada de specs (ronda 4)
| Tema | Decisión del usuario | Efecto en los documentos |
|------|----------------------|--------------------------|
| Corte del día | 03:00 local | `spec-datos-supabase.md` y `spec-arquitectura.md` deben calcular `local_date` con el corte de las 03:00 (restar 3 h a la hora local antes de tomar la fecha) |
| Día de racha | 20 repeticiones válidas o 3 minutos | `spec-arquitectura.md` (decía "una sesión válida") y `daily_activity.qualified` en datos se alinean con esta regla |
| Modelo de pose | Ir directo a MediaPipe con módulo nativo Kotlin | Parte 1 pasa de un spike a construir `fitpose-native` con PoseLandmarker (33 puntos). Estimación de la spec: 2 a 4 semanas |
| Edad mínima | **18 años** (ronda 5; sustituye al 16 de la ronda 4). Se ampliará después | Sin consentimiento parental por ahora; pantalla de fecha de nacimiento con bloqueo de menores. Ampliar el rango exigirá revisión legal por país |
| Organización de Supabase | **"Personal"** (`kowimqojmwwasqvzotkl`), separada de la organización del CRM de Verse (ronda 6) | Proyecto creado: `fitpose-dev` (`eqdjmaarjfsdfomkducz`, us-east-1, plan gratuito, 2026-10-29). URL y clave publicable en `.env.local` (no versionado) y en las variables de EAS. Desde esta sesión ya no se ven el CRM ni "Geovanni AV"; la eliminación de "Geovanni AV" la confirma el usuario en el panel (respaldo en `/home/user/backups/geovanni-av-2026-10-28/`) |
| Login | Después de la primera sesión (ronda 5) | Cuenta local al inicio; Google tras la primera sesión con importación inicial de las sesiones locales (`spec-datos-supabase.md`, DA2) |
| Protector de racha, pausa, reparación y compra | **Fuera del MVP** (ronda 5) | Un día cerrado sin actividad rompe la racha; columna `protectors_available` reservada con valor 0 |

### Consecuencias a vigilar
- **Plazo:** el módulo nativo puede consumir de 2 a 4 de las 6-8 semanas antes de tener la pantalla de entrenamiento. Como medida de seguridad, el adaptador de landmarks sigue siendo independiente del modelo y MoveNet queda como plan B si el módulo no funciona a 30 FPS en el Pixel 7 Pro o el S26 Ultra a mitad del plazo. Punto de decisión propuesto: al final de la semana 3.
- **Revisión legal:** con 18+ se evitan las reglas de menores, pero sigue recomendándose que un abogado revise la política de privacidad y el tratamiento de datos de salud antes de publicar. Cuando se amplíe el rango de edades, repetir la revisión por país.
- **Racha más frágil:** sin protector, un solo día perdido la rompe. Es un riesgo de retención; se mide en la beta y se reconsidera para la etapa 2.
- **Escalas de calidad por unificar** (propuesta, pendiente de validar con grabaciones): `form_score = round(100 × Q)` con Q de `spec-cinematica.md`. Para XP: limpia = `form_score` de 80 o más, aceptable = de 50 a 79, fallo = menos de 50 o falta crítica. Las bandas Miss/Good/Great/Perfect del juego se derivan de la misma Q; hay que reconciliar sus cortes (0,25/0,70/0,90) con 50/80 antes de la parte 3.
- **Pruebas:** reducir el plan de fixtures de la spec de cinemática al mínimo viable del MVP (sintéticos paramétricos primero; grabados reales solo para validar), para que quepa en el plazo.
