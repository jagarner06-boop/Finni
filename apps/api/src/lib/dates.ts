const DAY_MS = 86_400_000;

/** Calendar date (YYYY-MM-DD) `days` from today; negative = past. */
export const isoDay = (days = 0): string => new Date(Date.now() + days * DAY_MS).toISOString().slice(0, 10);

/** Whole days from today until a YYYY-MM-DD date (negative = past). */
export const daysUntil = (date: string): number => Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${isoDay()}T00:00:00Z`)) / DAY_MS);

/** Next calendar date (today or later) that falls on day-of-month `day`. */
export function nextMonthDay(day: number): string {
  const now = new Date(`${isoDay()}T00:00:00Z`);
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day));
  if (d < now) d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}
