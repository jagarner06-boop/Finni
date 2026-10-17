import { isoDay } from "./dates.js";

/** The last `days` calendar dates, oldest first, ending today. */
export const dayRange = (days: number): string[] => Array.from({ length: days }, (_, i) => isoDay(i - days + 1));

/** Monday of the week containing `date` (YYYY-MM-DD). */
export function weekStart(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** "Oct 3" */
export const shortDate = (date: string): string =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
