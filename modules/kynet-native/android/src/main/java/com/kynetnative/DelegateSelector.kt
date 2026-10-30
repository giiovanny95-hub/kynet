package com.kynetnative

import android.content.SharedPreferences
import android.util.Log
import com.google.mediapipe.tasks.core.Delegate
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarker

/**
 * Elige el delegado de MediaPipe (CPU o GPU) midiendo los dos en el propio teléfono, porque el más rápido cambia
 * según el chip: con pose_landmarker_lite, en el Galaxy S26 Ultra la CPU tarda ~25 ms y la GPU ~46 ms; en el
 * Pixel 7 Pro la GPU ~33 ms y la CPU 46-87 ms (medido el 2026-10-29).
 *
 * La primera vez en cada teléfono se infieren unos cuadros con cada delegado (sin dejar de detectar), se queda con
 * el de menor mediana y guarda la elección; las siguientes veces arranca directamente con ella.
 *
 * En modo `LIVE_STREAM` los tiempos llegan en el hilo de MediaPipe y `current()` se llama en el de la cámara: todo
 * está sincronizado, y los landmarkers que sobran se cierran desde `current()`, nunca desde su propio callback.
 */
internal class DelegateSelector(
  private val prefs: SharedPreferences,
  private val key: String,
  private val create: (Delegate) -> PoseLandmarker?,
) {
  private enum class Phase { BENCH_CPU, BENCH_GPU, DONE }

  private var phase = Phase.DONE
  private var active: PoseLandmarker? = null
  private var activeDelegate: Delegate? = null
  private var cpu: PoseLandmarker? = null
  private val pendingClose = ArrayList<PoseLandmarker>()
  private val cpuSamples = ArrayList<Long>(SAMPLES)
  private val gpuSamples = ArrayList<Long>(SAMPLES)
  private var seen = 0

  /** El landmarker para el cuadro actual. */
  @Synchronized
  fun current(): PoseLandmarker {
    closePending()
    active?.let { return it }
    val saved = prefs.getString(key, null)?.let { runCatching { Delegate.valueOf(it) }.getOrNull() }
    if (saved != null) {
      Log.i(TAG, "delegado guardado para este teléfono: $saved")
      val other = if (saved == Delegate.CPU) Delegate.GPU else Delegate.CPU
      create(saved)?.let { return use(it, saved, Phase.DONE) }
      return use(create(other) ?: noLandmarker(), other, Phase.DONE)
    }
    create(Delegate.CPU)?.let {
      cpu = it
      return use(it, Delegate.CPU, Phase.BENCH_CPU)
    }
    // Sin CPU no hay nada que comparar.
    return use(create(Delegate.GPU) ?: noLandmarker(), Delegate.GPU, Phase.DONE)
  }

  /** Registra la duración de una inferencia hecha con `delegate` y avanza la medición si está en curso. */
  @Synchronized
  fun record(delegate: Delegate, inferNanos: Long) {
    // Tras cambiar de delegado aún pueden llegar resultados del anterior: no cuentan.
    if (delegate != activeDelegate) return
    when (phase) {
      Phase.DONE -> return
      Phase.BENCH_CPU -> if (collect(cpuSamples, inferNanos)) startGpu()
      Phase.BENCH_GPU -> if (collect(gpuSamples, inferNanos)) decide()
    }
  }

  @Synchronized
  fun close() {
    if (cpu !== active) cpu?.let { pendingClose.add(it) }
    active?.let { pendingClose.add(it) }
    active = null
    activeDelegate = null
    cpu = null
    closePending()
  }

  private fun use(landmarker: PoseLandmarker, delegate: Delegate, next: Phase): PoseLandmarker {
    active = landmarker
    activeDelegate = delegate
    phase = next
    return landmarker
  }

  private fun closePending() {
    for (l in pendingClose) runCatching { l.close() }
    pendingClose.clear()
  }

  private fun collect(samples: MutableList<Long>, nanos: Long): Boolean {
    seen++
    if (seen > WARMUP) samples.add(nanos)
    return samples.size >= SAMPLES
  }

  private fun startGpu() {
    seen = 0
    val gpu = create(Delegate.GPU)
    if (gpu == null) {
      choose(Delegate.CPU, "la GPU no arranca")
      return
    }
    use(gpu, Delegate.GPU, Phase.BENCH_GPU)
  }

  private fun decide() {
    val cpuMs = median(cpuSamples) / 1e6
    val gpuMs = median(gpuSamples) / 1e6
    val winner = if (gpuMs < cpuMs) Delegate.GPU else Delegate.CPU
    if (winner == Delegate.CPU) {
      active?.let { pendingClose.add(it) }
      cpu?.let { use(it, Delegate.CPU, Phase.DONE) }
    } else {
      cpu?.let { pendingClose.add(it) }
    }
    cpu = null
    choose(winner, "mediana CPU %.1f ms, GPU %.1f ms".format(cpuMs, gpuMs))
  }

  private fun choose(delegate: Delegate, reason: String) {
    phase = Phase.DONE
    prefs.edit().putString(key, delegate.name).apply()
    Log.i(TAG, "delegado elegido: $delegate ($reason)")
  }

  private fun noLandmarker(): Nothing = throw IllegalStateException("No se pudo crear PoseLandmarker")

  private companion object {
    const val TAG = "KynetNative"
    /** Cuadros descartados al empezar con cada delegado: la primera inferencia es mucho más lenta. */
    const val WARMUP = 5
    const val SAMPLES = 30

    fun median(values: List<Long>): Long = values.sorted()[values.size / 2]
  }
}
