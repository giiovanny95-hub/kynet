package com.kynetnative

import android.util.Log

/**
 * Tiempos por etapa de `detect()` para el Paso C del plan de rendimiento: cada `WINDOW` cuadros escribe en logcat
 * (`adb logcat -s KynetNative`) el p50 y el p95 de cada etapa en ms y vacía la ventana.
 * Cada instancia se usa desde un solo hilo.
 */
internal class StageTimings(private val label: String, private val names: List<String>) {
  private val samples = names.map { LongArray(WINDOW) }
  private var count = 0

  fun add(vararg nanos: Long) {
    for (i in names.indices) samples[i][count] = nanos.getOrElse(i) { 0L }
    count++
    if (count == WINDOW) flush()
  }

  private fun flush() {
    val line = names.indices.joinToString("  ") { i ->
      val sorted = samples[i].copyOf(count).also { it.sort() }
      "${names[i]} p50 ${ms(sorted[count / 2])} p95 ${ms(sorted[(count * 95 / 100).coerceAtMost(count - 1)])}"
    }
    Log.i(TAG, "tiempos $label ($count): $line")
    count = 0
  }

  private fun ms(nanos: Long): String = "%.1f".format(nanos / 1_000_000.0)

  private companion object {
    const val WINDOW = 150
    const val TAG = "KynetNative"
  }
}
