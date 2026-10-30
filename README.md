# Buzón de coordinación KYNET (rama `coordinacion`)

Canal automático entre las dos sesiones de Claude Code del proyecto:

- **Nube = planificación** (sesión remota "Aplicación móvil fitness con tracking"). Investiga, escribe specs y
  planes en `docs/superpowers/plans/`, mantiene `docs/estado.md` y `docs/decisions.md`, prepara preguntas para el
  usuario y revisa lo que entrega la PC. No tiene teléfono ni SDK de Android.
- **Local = ejecución** (cualquier sesión de Claude Code en la PC con Windows, repo en `C:\dev\KYNET-App\app`,
  buzón en `C:\dev\KYNET-App\buzon`). Implementa los planes, compila Android, instala en los teléfonos (Pixel 7
  Pro y Galaxy S26 Ultra por USB), mide, usa Chrome y sube a `feat/*`. Reparto completo en `CLAUDE.md`.

Esta rama es huérfana: solo contiene el buzón. El código va en `feat/partes-0-1-2` y el resumen vivo en
`docs/estado.md` de esa rama. Las escrituras aquí no disparan el CI.

## Carpetas (un solo escritor por carpeta: nunca hay conflictos)

| Carpeta | La escribe | La lee |
|---|---|---|
| `para-local/` | Nube | Local |
| `para-nube/` | Local | Nube |

Nadie edita ni borra archivos de la carpeta del otro. Para responder, se crea un archivo nuevo en la
carpeta propia con `responde-a`.

## Formato de un mensaje

Nombre: `AAAAMMDD-HHMM-<slug>.md` (hora UTC), por ejemplo `20261029-1950-medir-bitmap-reutilizado.md`.

```markdown
---
id: 20261029-1950-medir-bitmap-reutilizado
de: nube            # nube | local
tipo: solicitud     # plan | solicitud | respuesta | estado | bloqueo
requiere: telefono  # pc | telefono | usuario | nada
responde-a:         # id del mensaje al que responde (vacío si es nuevo)
commit:             # rama@sha a probar o producido (opcional)
---

Qué hay que hacer o qué pasó, en pocas líneas. Criterio de terminado y qué medir.
```

- `tipo: plan`: la nube entrega un plan para ejecutar; el cuerpo da la ruta del plan, el commit y el orden de
  las tareas. La PC responde con `tipo: estado` por cada bloque terminado.
- `tipo: bloqueo`: hace falta el usuario (estar frente a la cámara, conectar un teléfono, aprobar algo).
- Una solicitud por archivo. Si cambia, se envía una nueva que la sustituya (`responde-a`).

## Cómo funciona

1. **Nube → local:** la nube hace commit y push de un archivo en `para-local/`. La sesión local vigila
   la rama con `git fetch` cada 60 s y se despierta sola cuando aparece algo nuevo (toda sesión local lo hace:
   su hook de inicio, en `.claude/settings.local.json`, le da el comando del vigilante).
2. **Local → nube:** la sesión local responde con un archivo en `para-nube/`, hace push, actualiza
   `docs/estado.md` en `feat/partes-0-1-2` y además envía un mensaje directo a la sesión de la nube
   (SendMessage) con el resumen y el nombre del archivo. La nube no puede enviar mensajes directos a la
   local: su única vía de vuelta es este buzón.

## Reglas

- Push permitido sin preguntar solo a `coordinacion` y `feat/partes-0-1-2`. Nunca a `main`, nunca
  fusionar ni marcar el PR como listo, nunca reescribir historial.
- Lo que no se delega (`CLAUDE.md` del proyecto y del usuario) se sigue deteniendo: migraciones,
  credenciales, borrado de datos, acciones que cuestan dinero. Se pide con `tipo: bloqueo`.
- Nada de secretos en esta rama.
- Las cifras de rendimiento solo valen medidas en dispositivo; la nube no las da por buenas sin un
  mensaje de la local con el commit probado.
