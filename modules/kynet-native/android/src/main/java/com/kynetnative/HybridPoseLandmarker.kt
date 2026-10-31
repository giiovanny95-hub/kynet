package com.kynetnative

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
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarkerResult
import com.margelo.nitro.NitroModules
import com.margelo.nitro.camera.HybridFrameSpec
import com.margelo.nitro.camera.public.NativeFrame
import com.margelo.nitro.core.ArrayBuffer
import com.margelo.nitro.kynetnative.HybridPoseLandmarkerSpec
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.ConcurrentHashMap

/**
 * MediaPipe PoseLandmarker en modo `LIVE_STREAM` (asíncrono): `detect` prepara el cuadro, lo envía y devuelve el
 * último resultado disponible, sin esperar a la inferencia. Así la cámara no se bloquea: en modo VIDEO (síncrono)
 * el Pixel 7 Pro, con ~30 ms de inferencia, perdía ~16 % de los cuadros (2026-10-29). MediaPipe descarta él mismo
 * las entradas que llegan mientras está ocupado.
 *
 * El resultado devuelto puede ser de un cuadro anterior y repetirse en varios cuadros: tras los 33 landmarks van
 * su antigüedad y su tiempo de inferencia (ver docs/contrato-nativo-cinematica.md).
 */
class HybridPoseLandmarker : HybridPoseLandmarkerSpec() {
  private val context: Context
    get() = NitroModules.applicationContext ?: throw IllegalStateException("Sin contexto de aplicación")

  private val delegates: DelegateSelector by lazy {
    DelegateSelector(
      prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE),
      key = "delegado:${Build.MANUFACTURER}/${Build.MODEL}:$MODEL_ASSET:live",
      create = ::create,
    )
  }

  /** Un resultado de MediaPipe: lo crea el hilo de MediaPipe y lo consume el de la cámara. */
  private class Latest(val tMs: Long, val landmarks: FloatArray?, val inferMs: Float)

  /**
   * Resultados aún no entregados a JS, en orden. Con solo "el último", si MediaPipe terminaba dos resultados entre
   * dos cuadros el primero no llegaba nunca a JS: ~17-19 % de las poses perdidas en la prueba de 10 min del
   * 2026-10-29 aunque MediaPipe las produjera. Como no puede haber más resultados que cuadros, la cola no crece.
   */
  private val results = java.util.concurrent.ConcurrentLinkedQueue<Latest>()

  // Solo hilo de la cámara: el último entregado, que se repite si aún no hay uno nuevo.
  private var delivered: Latest? = null

  /** Cuadros enviados y aún sin resultado: cuándo se enviaron y con qué giro. */
  private class Pending(val sentNanos: Long, val rotation: Int)

  private val pending = ConcurrentHashMap<Long, Pending>()

  /**
   * Tras `dispose()` no se vuelve a tocar MediaPipe: un cuadro aún en vuelo recrearía el landmarker. Cada visita a
   * una pantalla con cámara que no liberaba el suyo dejaba ~80 MB de memoria nativa y de GPU (Pixel 7 Pro).
   */
  @Volatile private var disposed = false

  // Solo hilo de la cámara.
  private var lastTimestampMs = -1L
  private var lastWidth = 0
  private var lastHeight = 0
  private val cameraTimings = StageTimings("cámara", listOf("preparar", "envío", "intervalo"))

  // Solo hilo de MediaPipe.
  private var lastResultMs = -1L
  private val resultTimings = StageTimings("resultados", listOf("inferencia", "intervalo"))

  private fun create(delegate: Delegate): PoseLandmarker? =
    try {
      val base = BaseOptions.builder().setModelAssetPath(MODEL_ASSET).setDelegate(delegate).build()
      val options = PoseLandmarker.PoseLandmarkerOptions.builder()
        .setBaseOptions(base)
        .setRunningMode(RunningMode.LIVE_STREAM)
        .setNumPoses(1)
        .setResultListener { result, _ -> onResult(delegate, result) }
        .setErrorListener { e -> Log.w(TAG, "MediaPipe ($delegate): ${e.message}") }
        .build()
      PoseLandmarker.createFromOptions(context, options).also { Log.i(TAG, "PoseLandmarker creado con delegado $delegate") }
    } catch (e: Throwable) {
      Log.w(TAG, "PoseLandmarker con $delegate falló: ${e.message}")
      null
    }

  override fun detect(frame: HybridFrameSpec): ArrayBuffer? {
    if (disposed) return null
    val image = (frame as? NativeFrame)?.image ?: return null
    // MediaPipe exige marcas de tiempo estrictamente crecientes.
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
    // toBitmap() cuesta ~0,3-0,7 ms y girar dentro de MediaPipe ~1 ms: el coste está en la inferencia. El Bitmap
    // es una copia, así que sigue siendo válido después de que VisionCamera cierre el cuadro.
    val bitmap = image.toBitmap()
    val mpImage = BitmapImageBuilder(bitmap).build()
    val rotation = image.imageInfo.rotationDegrees
    val processing = ImageProcessingOptions.builder().setRotationDegrees(rotation).build()
    val t1 = System.nanoTime()
    pending[tMs] = Pending(t1, rotation)
    try {
      delegates.current().detectAsync(mpImage, processing, tMs)
    } catch (e: Throwable) {
      pending.remove(tMs)
      Log.w(TAG, "detectAsync falló: ${e.message}")
    }
    val t2 = System.nanoTime()
    cameraTimings.add(t1 - t0, t2 - t1, intervalNs)

    // El siguiente resultado sin entregar, en orden; si no hay ninguno, se repite el último entregado.
    results.poll()?.let { delivered = it }
    val last = delivered ?: return null
    val landmarks = last.landmarks ?: return null
    val buffer = ByteBuffer.allocateDirect((landmarks.size + EXTRAS) * Float.SIZE_BYTES).order(ByteOrder.nativeOrder())
    for (v in landmarks) buffer.putFloat(v)
    buffer.putFloat((tMs - last.tMs).toFloat())
    buffer.putFloat(last.inferMs)
    buffer.rewind()
    return ArrayBuffer.wrap(buffer)
  }

  /** Hilo de MediaPipe. */
  private fun onResult(delegate: Delegate, result: PoseLandmarkerResult) {
    if (disposed) return
    val tMs = result.timestampMs()
    val sent = pending.remove(tMs) ?: return
    // Las entradas que MediaPipe descartó por estar ocupado nunca tendrán resultado.
    pending.keys.removeIf { it < tMs }
    val inferNanos = System.nanoTime() - sent.sentNanos
    delegates.record(delegate, inferNanos)
    resultTimings.add(inferNanos, if (lastResultMs < 0) 0L else (tMs - lastResultMs) * 1_000_000L)
    lastResultMs = tMs

    val pose = result.landmarks().firstOrNull()
    val packed = if (pose == null || pose.size != LANDMARKS) null else FloatArray(LANDMARKS * 4).also { out ->
      pose.forEachIndexed { i, lm ->
        // MediaPipe devuelve las coordenadas en el marco del buffer sin girar (medido en el Galaxy S26 Ultra: el
        // esqueleto salía acostado). Se giran aquí para que JS reciba la imagen ya en vertical (rotation = 0).
        val (x, y) = toUpright(lm.x(), lm.y(), sent.rotation)
        out[i * 4] = x
        out[i * 4 + 1] = y
        out[i * 4 + 2] = lm.z()
        // `presence` es la probabilidad de que el punto esté dentro del cuadro. Con los pies fuera de cuadro
        // MediaPipe los inventa con visibility ~0,7 y presence ~0,1 (medido en el S26 Ultra).
        out[i * 4 + 3] = minOf(lm.visibility().orElse(0f), lm.presence().orElse(0f))
      }
    }
    results.add(Latest(tMs, packed, (inferNanos / 1_000_000.0).toFloat()))
    // Salvaguarda: si JS dejara de pedir cuadros, no acumular sin límite.
    while (results.size > MAX_QUEUED) results.poll()
  }

  override fun dispose() {
    if (disposed) return
    disposed = true
    delegates.close()
    results.clear()
    delivered = null
    pending.clear()
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

    private const val TAG = "KynetNative"
    private const val MODEL_ASSET = "pose_landmarker_lite.task"
    private const val PREFS = "kynet_native"
    private const val LANDMARKS = 33
    /** Tras los landmarks: antigüedad del resultado (ms) y su tiempo de inferencia (ms). */
    private const val EXTRAS = 2
    private const val MAX_QUEUED = 4
  }
}
