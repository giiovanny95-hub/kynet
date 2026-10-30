/** Fechas de día (`YYYY-MM-DD`) con el corte de las 03:00 locales (spec de datos §2.1). Sin reloj global. */

const DAY_CUTOFF_HOUR = 3;
const DAY_MS = 86_400_000;

function parts(ms: number, tz: string): { y: number; m: number; d: number; h: number } {
  let fmt: Intl.DateTimeFormat;
  try {
    fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' });
  } catch {
    fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' });
  }
  const get = (type: string) => Number(fmt.formatToParts(new Date(ms)).find((p) => p.type === type)?.value ?? 0);
  return { y: get('year'), m: get('month'), d: get('day'), h: get('hour') };
}

function fromUtcDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Día local de un instante en la zona `tz`: la hora local menos 3 h (reloj de pared), como `(ts AT TIME ZONE tz - 3h)::date`. */
export function localDate(ms: number, tz: string): string {
  const p = parts(ms, tz);
  const day = new Date(Date.UTC(p.y, p.m - 1, p.d));
  return fromUtcDate(p.h < DAY_CUTOFF_HOUR ? new Date(day.getTime() - DAY_MS) : day);
}

export function addDays(date: string, n: number): string {
  return fromUtcDate(new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY_MS));
}

/** Lunes de la semana de `date` (las misiones semanales empiezan el lunes a las 03:00). */
export function weekStart(date: string): string {
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = domingo
  return addDays(date, -((dow + 6) % 7));
}
