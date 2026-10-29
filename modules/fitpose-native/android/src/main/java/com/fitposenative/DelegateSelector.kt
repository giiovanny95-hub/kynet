package com.fitposenative

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
 */
internal class DelegateSelector(
  private val prefs: SharedPreferences,
  private val key: String,
  private val create: (Delegate) -> PoseLandmarker?,
) {
  private enum class Phase { BENCH_CPU, BENCH_GPU, DONE }

  private var phase = Phase.DONE
  private var active: PoseLandmarker? = null
  private var cpu: PoseLandmarker? = null
  private val cpuSamples = ArrayList<Long>(SAMPLES)
  private val gpuSamples = ArrayList<Long>(SAMPLES)
  private var seen = 0

  /** El landmarker para el cuadro actual. */
  fun current(): PoseLandmarker {
    active?.let { return it }
    val saved = prefs.getString(key, null)?.let { runCatching { Delegate.valueOf(it) }.getOrNull() }
    if (saved != null) {
      val other = if (saved == Delegate.CPU) Delegate.GPU else Delegate.CPU
      Log.i(TAG, "delegado guardado para este teléfono: $saved")
      return (create(saved) ?: create(other) ?: noLandmarker()).also { active = it; phase = Phase.DONE }
    }
    val first = create(Delegate.CPU)
    if (first != null) {
      cpu = first
      phase = Phase.BENCH_CPU
      return first.also { active = it }
    }
    // Sin CPU no hay nada que comparar.
    return (create(Delegate.GPU) ?: noLandmarker()).also { active = it; phase = Phase.DONE }
  }

  /** Registra la duración de la inferencia del cuadro actual y avanza la medición si está en curso. */
  fun record(inferNanos: Long) {
    when (phase) {
      Phase.DONE -> return
      Phase.BENCH_CPU -> if (collect(cpuSamples, inferNanos)) startGpu()
      Phase.BENCH_GPU -> if (collect(gpuSamples, inferNanos)) decide()
    }
  }

  fun close() {
    if (cpu !== active) cpu?.close()
    active?.close()
    active = null
    cpu = null
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
    active = gpu
    phase = Phase.BENCH_GPU
  }

  private fun decide() {
    val cpuMs = median(cpuSamples) / 1e6
    val gpuMs = median(gpuSamples) / 1e6
    val winner = if (gpuMs < cpuMs) Delegate.GPU else Delegate.CPU
    if (winner == Delegate.CPU) {
      active?.close()
      active = cpu
    } else {
      cpu?.close()
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
    const val TAG = "FitposeNative"
    /** Cuadros descartados al empezar con cada delegado: la primera inferencia es mucho más lenta. */
    const val WARMUP = 5
    const val SAMPLES = 30

    fun median(values: List<Long>): Long = values.sorted()[values.size / 2]
  }
}
