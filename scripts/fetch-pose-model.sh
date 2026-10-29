#!/usr/bin/env bash
# Descarga el modelo de MediaPipe PoseLandmarker (lite, float16, versión 1) y verifica su huella.
set -euo pipefail
DEST="$(dirname "$0")/../assets/models/pose_landmarker_lite.task"
URL="https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"
SHA256="59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a"
mkdir -p "$(dirname "$DEST")"
if [ ! -f "$DEST" ] || ! echo "$SHA256  $DEST" | sha256sum -c --status; then
  curl -sSfL -o "$DEST.tmp" "$URL"
  echo "$SHA256  $DEST.tmp" | sha256sum -c --status || { echo "Huella del modelo incorrecta" >&2; rm -f "$DEST.tmp"; exit 1; }
  mv "$DEST.tmp" "$DEST"
fi
echo "Modelo listo: $DEST"
