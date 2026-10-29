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

  private val delegates: DelegateSelector by lazy {
    DelegateSelector(
      prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE),
      key = "delegado:${Build.MANUFACTURER}/${Build.MODEL}:$MODEL_ASSET",
      create = ::create,
    )
  }

  private var lastTimestampMs = -1L
  private var lastWidth = 0
  private var lastHeight = 0
  private val timings = StageTimings(listOf("imagen", "mpimage", "inferencia", "empaquetado", "total", "intervalo"))

  private fun create(delegate: Delegate): PoseLandmarker? =
    try {
      val base = BaseOptions.builder().setModelAssetPath(MODEL_ASSET).setDelegate(delegate).build()
      val options = PoseLandmarker.PoseLandmarkerOptions.builder()
        .setBaseOptions(base)
        .setRunningMode(RunningMode.VIDEO)
        .setNumPoses(1)
        .build()
      PoseLandmarker.createFromOptions(context, options).also { Log.i(TAG, "PoseLandmarker creado con delegado $delegate") }
    } catch (e: Throwable) {
      Log.w(TAG, "PoseLandmarker con $delegate falló: ${e.message}")
      null
    }

  override fun detect(frame: HybridFrameSpec): ArrayBuffer? {
    val image = (frame as? NativeFrame)?.image ?: return null
    // MediaPipe exige marcas de tiempo estrictamente crecientes en modo VIDEO.
    val tMs = image.imageInfo.timestamp / 1_000_000L
    if (tMs <= lastTimestampMs) return null
    val intervalNs = if (lastTimestampMs < 0) 0L else (tMs - lastTimestampMs) * 1_000_000L
    lastTimestampMs = tMs

    if (image.width != lastWidth || image.height != lastHeight) {
      lastWidth = image.width
      lastHeight = image.height
      Log.i(TAG, "cuadro ${image.width}x${image.height}, formato ${image.format}, giro ${image.imageInfo.rotationDegrees}")
    }

    val t0 = System.nanoTime()
    // toBitmap() cuesta ~0,3 ms y girar dentro de MediaPipe ~1 ms (medido en el S26 Ultra): no compensa
    // optimizarlos. El coste está en la inferencia.
    val bitmap = image.toBitmap()
    val t1 = System.nanoTime()
    val mpImage = BitmapImageBuilder(bitmap).build()
    val rotation = image.imageInfo.rotationDegrees
    val processing = ImageProcessingOptions.builder()
      .setRotationDegrees(rotation)
      .build()
    val t2 = System.nanoTime()
    val result = delegates.current().detectForVideo(mpImage, processing, tMs)
    val t3 = System.nanoTime()
    delegates.record(t3 - t2)
    val pose = result.landmarks().firstOrNull()
    if (pose == null || pose.size != LANDMARKS) {
      timings.add(t1 - t0, t2 - t1, t3 - t2, 0L, t3 - t0, intervalNs)
      return null
    }

    val buffer = ByteBuffer.allocateDirect(LANDMARKS * 4 * Float.SIZE_BYTES).order(ByteOrder.nativeOrder())
    for (lm in pose) {
      // MediaPipe devuelve las coordenadas en el marco del buffer sin girar (medido en el Galaxy S26 Ultra:
      // el esqueleto salía acostado). Se giran aquí para que JS reciba la imagen ya en vertical (rotation = 0).
      val (x, y) = toUpright(lm.x(), lm.y(), rotation)
      buffer.putFloat(x)
      buffer.putFloat(y)
      buffer.putFloat(lm.z())
      // `presence` es la probabilidad de que el punto esté dentro del cuadro. Con los pies fuera de cuadro
      // MediaPipe los inventa con visibility ~0,7 y presence ~0,1 (medido en el S26 Ultra): sin esto se
      // dibujaban y llegaban a la cinemática como válidos.
      buffer.putFloat(minOf(lm.visibility().orElse(0f), lm.presence().orElse(0f)))
    }
    buffer.rewind()
    val t4 = System.nanoTime()
    timings.add(t1 - t0, t2 - t1, t3 - t2, t4 - t3, t4 - t0, intervalNs)
    return ArrayBuffer.wrap(buffer)
  }

  override fun dispose() {
    delegates.close()
    super.dispose()
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
    private const val PREFS = "fitpose_native"
    private const val LANDMARKS = 33
  }
}
