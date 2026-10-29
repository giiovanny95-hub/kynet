# Contrato: módulo nativo → cinemática

Qué debe poner la capa de visión en cada `PoseFrame` que pasa a `step()` del motor (`src/kinematics`). Las decisiones marcadas **[DISPOSITIVO]** se confirman en la parte 1 con la pantalla `spike`.

| Campo | Regla |
|-------|-------|
| `raw` | 33 landmarks de MediaPipe (`x, y, z, visibilidad`) normalizados a la imagen que vio el modelo. Si no hay persona, `toPoseFrame(undefined, meta)` devuelve un cuadro vacío (todas `v = 0`): el motor pausa y, tras 3 s, abandona la repetición. **No** se salta el cuadro. |
| `meta.tMs` | Marca de tiempo de cámara en **milisegundos** (`frame.timestamp` de CameraX viene en nanosegundos: dividir entre 1e6). Debe crecer; cuadros con marca repetida o menor se ignoran. |
| `meta.width`, `meta.height` | Medidas de la imagen **ya en vertical** (la orientación en la que el usuario está de pie). |
| `meta.rotation` | Giro que aún falta aplicar a las coordenadas para que queden en vertical. El módulo Kotlin pasa `imageInfo.rotationDegrees` a MediaPipe, así que se asume que las coordenadas ya vienen en vertical y `rotation = 0`. **[DISPOSITIVO]**: con el móvil en vertical, levantar la mano izquierda y comprobar que `lWrist` aparece arriba en el lado correcto; si no, ajustar aquí y en el adaptador. |
| `meta.mirrored` | `true` solo si los **píxeles que vio el modelo** eran un espejo de la escena (entonces izquierda/derecha vienen cambiadas). Se calcula con `modelSawMirroredPixels({ outputMirrored, frameIsMirrored })`. **Nunca** pasar `frame.isMirrored` directamente: en VisionCamera 5 ese valor es `true` justo cuando el buffer *no* está espejado. Con la configuración por defecto (sin `enablePhysicalBufferRotation`) el resultado es `false`. |
| Pantalla | El espejo de la vista previa (cámara frontal) se aplica solo al **dibujar** (`x' = 1 − x`), nunca a los datos de la cinemática. |
| Estado térmico | `thermalStatus` del módulo: 0-6 según `PowerManager`; `-1` en Android < 10 (sin API). |
