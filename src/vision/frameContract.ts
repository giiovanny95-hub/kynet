/**
 * Contrato entre el cuadro de VisionCamera y la cinemática (ver docs/contrato-nativo-cinematica.md).
 *
 * `Frame.isMirrored` de VisionCamera dice cómo **presentar** los píxeles, no si el modelo los vio espejados:
 * es `true` cuando la salida está espejada pero el buffer no. `FrameMeta.mirrored` de la cinemática significa
 * "los píxeles que vio el modelo eran un espejo de la escena" (entonces izquierda y derecha vienen cambiadas).
 * Nunca pases `frame.isMirrored` directamente a `FrameMeta.mirrored`.
 */
export function modelSawMirroredPixels(o: { readonly outputMirrored: boolean; readonly frameIsMirrored: boolean }): boolean {
  'worklet';
  return o.outputMirrored && !o.frameIsMirrored;
}
