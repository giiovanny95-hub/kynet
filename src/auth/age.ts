/** Solo mayores de 18 (CLAUDE.md; spec-datos-supabase §6.2). Fechas `YYYY-MM-DD`, sin reloj global. */
export const MIN_AGE = 18;

function parse(d: string): { y: number; m: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const day = Number(m[3]);
  const check = new Date(Date.UTC(y, mo - 1, day));
  return check.getUTCMonth() === mo - 1 && check.getUTCDate() === day ? { y, m: mo, day } : null;
}

/** El 29 de febrero se cumple años el 1 de marzo en años no bisiestos. */
export function isAdult(birthDate: string, today: string): boolean {
  const b = parse(birthDate);
  const t = parse(today);
  if (!b || !t) return false;
  let age = t.y - b.y;
  if (t.m < b.m || (t.m === b.m && t.day < b.day)) age--;
  return age >= MIN_AGE;
}

/** Fecha de nacimiento a partir de los tres campos del formulario; `null` si no existe o es futura. */
export function birthDateFrom(day: string, month: string, year: string, today: string): string | null {
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (!Number.isInteger(d) || !Number.isInteger(m) || !Number.isInteger(y) || y < 1900) return null;
  const iso = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return parse(iso) !== null && iso <= today ? iso : null;
}
