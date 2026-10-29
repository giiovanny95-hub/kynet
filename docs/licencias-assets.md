# Licencias de assets de ejercicios (investigación)

Fecha de verificación: 2026-10-28. Solo investigación; no se descargó ningún dataset.
**No es asesoría legal.** Lo marcado con [ABOGADO] debe revisarlo un abogado antes de publicar la app.

## 1. Tabla comparativa

| Repo | URL verificada | Código / estructura | Datos (texto) | Imágenes / animaciones | Uso comercial | Atribución / copyleft | Riesgo |
|---|---|---|---|---|---|---|---|
| RepDB/exercise-dataset | https://github.com/RepDB/exercise-dataset (existe) | Visor `index.html`: MIT (LICENSE-CODE) | LICENSE-DATA.md propia (no estándar) | Mismas condiciones propias. Gratis: 701 ejercicios, WebP plano 512x512. Animaciones y 1024px son de pago. Según el licenciante, creadas con herramientas de IA que encargó | Sí, dentro de apps, con atribución | Atribución obligatoria: enlace visible "Exercise data by RepDB (repdb.co)" en créditos/footer. Sin copyleft, pero: prohibido redistribuir como dataset/API, prohibido usar las imágenes como entrada de IA generativa, `premium-samples/` solo evaluación | Medio. Licencia a medida, de un único titular (Sergei Argutin, Berlín); la parte "creadas con IA" y la protección por copyright es discutible. [ABOGADO] |
| hasaneyldrm/exercises-dataset | https://github.com/hasaneyldrm/exercises-dataset (existe, 1324 ejercicios) | MIT (código, estructura, textos de instrucciones) | MIT | **Excluidas de MIT.** GIF/miniaturas son "© Gym visual", incluidas "con permiso" del dueño del repo a 180x180. Reutilizar exige cumplir los T&C de GymVisual y, según el repo, licencia propia de GymVisual | **No para las imágenes** sin licencia de GymVisual. El repo dice "educational and research purposes" | Debe mantenerse "© Gym visual". Clonar no otorga derechos | **Alto** para imágenes. Datos de texto MIT utilizables, pero su origen tampoco está acreditado. |
| wger-project/wger | https://github.com/wger-project/wger (existe) | AGPL-3.0-or-later | "Creative Commons (ver cada entrada)"; docs CC-BY-SA-4.0. Fuentes secundarias indican que los datos iniciales son CC-BY-SA 3.0 | Licencia y autor por entrada; el README no la fija para imágenes | Posible, según licencia de cada entrada | AGPL: copyleft de red si usas/modificas el código y lo sirves. CC-BY-SA: atribución por entrada + share-alike sobre adaptaciones | Medio-alto (mezcla de licencias; SA sobre obras derivadas). [ABOGADO] |
| yuhonas/free-exercise-db | https://github.com/yuhonas/free-exercise-db (existe, "800+") | Unlicense (dominio público) | Unlicense | Sin declaración de procedencia en el README. Reestructurado desde wrkout/exercises.json (Ollie Jennings), también "Unlicense" y sin explicar el origen de las imágenes | En apariencia sí; la Unlicense solo cubre lo que el publicante pudo ceder | Ninguna. Créditos de cortesía recomendados | **Medio por procedencia**: la licencia es limpia, pero el origen de las imágenes no está verificado y una dedicación a dominio público no sana derechos de terceros. [ABOGADO] |

## 2. Hallazgos clave

- El informe acierta en RepDB solo a medias: "permisiva con atribución" es una simplificación. Hay restricciones relevantes (sin redistribución, sin IA generativa, animaciones de pago). Además, cuenta 701 ejercicios incluso en la versión de pago, con 544 animados y 157 estáticos.
- hasaneyldrm: la licencia MIT del repo **no** cubre las imágenes. Son de GymVisual. No usar sin licencia propia de ellos.
- wger: es el único cuyo código es AGPL; para un uso solo de datos el problema son las licencias CC por entrada, no la AGPL. No incrustes código de wger en una app cerrada.
- yuhonas: licencia más permisiva, pero procedencia de imágenes sin verificar.

## 3. No pude verificar

- Texto completo de LICENSE-DATA.md de RepDB (solo resumen vía fetch) y ATTRIBUTION.md.
- Términos de GymVisual (https://gymvisual.com/content/3-terms-and-conditions-of-use): el dominio estaba bloqueado en esta sesión.
- Licencia exacta por imagen/ejercicio de wger (wger.de y wger.readthedocs.io bloqueados). Solo hay README oficial y fuentes secundarias.
- Origen real de las imágenes de free-exercise-db y wrkout/exercises.json.
- Si los textos de ejercicios de cada repo tienen derechos de terceros.

## 4. Alternativas con licencia clara

1. **Ilustraciones propias** (diseñador o ilustrador contratado con cesión de derechos escrita, work-for-hire). Máxima claridad.
2. **Animaciones propias en Lottie o Rive**: vectoriales, ligeras, controlables por código y válidas para un premium. Crear a partir de un rig simple (figura de palitos o maniquí).
3. **Render propio desde la pose**: dado que el proyecto se llama fitpose, se puede dibujar un esqueleto/figura animada generada por código a partir de keyframes propios. Sin riesgo de terceros.
4. **Generación con IA propia**: revisar los términos de la herramienta y la protección por copyright de resultados IA. [ABOGADO]
5. **Licenciar de pago** un catálogo (GymVisual o RepDB de pago) con contrato claro, cuando haya catálogo y presupuesto.
6. Bancos de ilustración con licencia comercial clara (verificar cada licencia antes de usar).

## 5. Recomendación para el MVP (sentadilla, jumping jack, flexión)

- **Crear los 3 ejercicios con arte propio** (Lottie/Rive o ilustración vectorial). Son solo 3; el coste es bajo y elimina el riesgo.
- No incluir hasaneyldrm (GymVisual) ni nada de wger en el MVP.
- Si hace falta un catálogo rápido después: RepDB (con atribución y respetando sus restricciones) o licencia de pago, previa revisión de un abogado.
- Para textos (nombres, músculos, instrucciones) escribir los propios o usar datos de free-exercise-db tras revisar procedencia.
- Antes del premium de pago, guardar un registro de procedencia (de dónde viene cada asset y su licencia).

## 6. Plan de atribución

- Pantalla "Créditos / Licencias" accesible desde Ajustes, y copia en el sitio web.
- Si se usa RepDB: "Exercise data by RepDB (repdb.co)" con enlace visible.
- Si se usa wger o cualquier CC: autor, licencia y enlace por ejercicio, más aviso de adaptación.
- Si se usa GymVisual (con licencia): mantener "© Gym visual" según contrato.
- Arte propio: sin atribución obligatoria; guardar los contratos de cesión.
- Mantener un archivo `ASSETS.csv` con: id, origen, URL, licencia, autor, fecha, versión del texto de licencia.
- Incluir descargo de responsabilidad de salud (no es consejo médico).

## 7. Qué debe revisar un abogado

- Licencia a medida de RepDB y la titularidad de imágenes creadas con IA.
- Si cualquier asset puede usarse en una app de pago (premium) y en tiendas de apps.
- Condiciones de GymVisual y si hay permiso real de redistribución.
- Efecto del share-alike CC-BY-SA en tu app si usas datos de wger.
- Validez de la Unlicense frente a derechos de terceros sobre imágenes sin procedencia.
- Descargos de responsabilidad de salud y términos de la app.

## 8. Fuentes consultadas

- https://github.com/RepDB/exercise-dataset
- https://raw.githubusercontent.com/RepDB/exercise-dataset/main/LICENSE-DATA.md
- https://github.com/hasaneyldrm/exercises-dataset
- https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/NOTICE.md
- https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/LICENSE
- https://github.com/wger-project/wger
- https://github.com/yuhonas/free-exercise-db
- https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/LICENSE.md
- https://github.com/wrkout/exercises.json
- Búsqueda web sobre licencias wger (fuentes secundarias: https://pypi.org/project/wger/1.4/ , https://github.com/exercemus/exercises)

## Audio
Los tonos de `assets/audio/` son arte propio: senos generados por `scripts/gen-tones.ts` a partir de `src/audio/tones.ts`. Sin licencias de terceros.
