/**
 * Date helpers using device local time only.
 * Never use toISOString() for day keys (UTC causes off-by-one near midnight).
 */

/** YYYY-MM-DD in device local time. Use for day keys and comparisons. */
export function getLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Start of today in local time (00:00:00). */
export function startOfToday(): Date {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

/** Monday of the week containing d (weekStartsOn = 1). */
export function startOfWeek(d: Date): Date {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  const day = t.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  t.setDate(t.getDate() + mondayOffset);
  return t;
}

/** Add n days in local time (no UTC shift). */
export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/** Format weekday e.g. "Mon" (local). */
export function formatWeekday(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 3).toUpperCase();
}

/** Format weekday in French e.g. "LUN", "MAR". */
export function formatWeekdayFr(d: Date): string {
  return d.toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 3).toUpperCase();
}

/** Format date for display e.g. "Feb 28" (local). */
export function formatShortDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Format date in French e.g. "9 fév" (day + short month). */
export function formatShortDateFr(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/** Plan week number (1..durationWeeks) anchored on planStartDate (day 0 = start date). */
export function getPlanWeekNumber(planStartDate: Date, d: Date, durationWeeks: number): number {
  const anchor = new Date(planStartDate);
  anchor.setHours(0, 0, 0, 0);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  const diffMs = day.getTime() - anchor.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const week = Math.floor(diffDays / 7) + 1;
  return Math.min(durationWeeks, Math.max(1, week));
}

/** The 7 local dates for plan week N (1-based), anchored to planStartDate. */
export function getPlanWeekDates(planStartDate: Date, weekNumber: number): Date[] {
  const anchor = new Date(planStartDate);
  anchor.setHours(0, 0, 0, 0);
  const weekStart = addDays(anchor, (weekNumber - 1) * 7);
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    dates.push(addDays(weekStart, i));
  }
  return dates;
}
