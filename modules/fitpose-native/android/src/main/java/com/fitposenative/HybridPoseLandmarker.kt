package com.fitposenative

import android.content.Context
import android.os.Build
import android.os.PowerManager
import android.util.Log
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.core.Delegate
import com.google.mediapipe.tasks.vision.core.ImageProcessingOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarker
import com.margelo.nitro.NitroModules
import com.margelo.nitro.camera.HybridFrameSpec
import com.margelo.nitro.camera.public.NativeFrame
import com.margelo.nitro.core.ArrayBuffer
import com.margelo.nitro.fitposenative.HybridPoseLandmarkerSpec
import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * MediaPipe PoseLandmarker en modo VIDEO (síncrono): VisionCamera ya descarta cuadros
 * mientras `detect` está ocupado, así que no hace falta cola propia.
 */
class HybridPoseLandmarker : HybridPoseLandmarkerSpec() {
  private val context: Context
    get() = NitroModules.applicationContext ?: throw IllegalStateException("Sin contexto de aplicación")

  private val landmarker: PoseLandmarker by lazy { create(Delegate.GPU) ?: create(Delegate.CPU) ?: throw IllegalStateException("No se pudo crear PoseLandmarker") }

  private var lastTimestampMs = -1L

  private fun create(delegate: Delegate): PoseLandmarker? =
    try {
      val base = BaseOptions.builder().setModelAssetPath(MODEL_ASSET).setDelegate(delegate).build()
      val options = PoseLandmarker.PoseLandmarkerOptions.builder()
        .setBaseOptions(base)
        .setRunningMode(RunningMode.VIDEO)
        .setNumPoses(1)
        .build()
      PoseLandmarker.createFromOptions(context, options)
    } catch (e: Throwable) {
      Log.w(TAG, "PoseLandmarker con $delegate falló: ${e.message}")
      null
    }

  override fun detect(frame: HybridFrameSpec): ArrayBuffer? {
    val image = (frame as? NativeFrame)?.image ?: return null
    // MediaPipe exige marcas de tiempo estrictamente crecientes en modo VIDEO.
    val tMs = image.imageInfo.timestamp / 1_000_000L
    if (tMs <= lastTimestampMs) return null
    lastTimestampMs = tMs

    val bitmap = image.toBitmap()
    val mpImage = BitmapImageBuilder(bitmap).build()
    val rotation = image.imageInfo.rotationDegrees
    val processing = ImageProcessingOptions.builder()
      .setRotationDegrees(rotation)
      .build()
    val result = landmarker.detectForVideo(mpImage, processing, tMs)
    val pose = result.landmarks().firstOrNull() ?: return null
    if (pose.size != LANDMARKS) return null

    val buffer = ByteBuffer.allocateDirect(LANDMARKS * 4 * Float.SIZE_BYTES).order(ByteOrder.nativeOrder())
    for (lm in pose) {
      // MediaPipe devuelve las coordenadas en el marco del buffer sin girar (medido en el Galaxy S26 Ultra:
      // el esqueleto salía acostado). Se giran aquí para que JS reciba la imagen ya en vertical (rotation = 0).
      val (x, y) = toUpright(lm.x(), lm.y(), rotation)
      buffer.putFloat(x)
      buffer.putFloat(y)
      buffer.putFloat(lm.z())
      buffer.putFloat(lm.visibility().orElse(0f))
    }
    buffer.rewind()
    return ArrayBuffer.wrap(buffer)
  }

  /** Estado térmico de `PowerManager` (API 29+); en versiones anteriores devuelve -1 (desconocido). */
  override val thermalStatus: Double
    get() {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return -1.0
      val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
      return pm.currentThermalStatus.toDouble()
    }

  companion object {
    /** Gira un punto normalizado `rotationDegrees` en sentido horario (convención de `ImageInfo` de CameraX). */
    private fun toUpright(x: Float, y: Float, rotationDegrees: Int): Pair<Float, Float> =
      when (rotationDegrees) {
        90 -> Pair(1f - y, x)
        180 -> Pair(1f - x, 1f - y)
        270 -> Pair(y, 1f - x)
        else -> Pair(x, y)
      }

    private const val TAG = "FitposeNative"
    private const val MODEL_ASSET = "pose_landmarker_lite.task"
    private const val LANDMARKS = 33
  }
}
