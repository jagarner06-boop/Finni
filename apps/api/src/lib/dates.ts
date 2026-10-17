const DAY_MS = 86_400_000;

// "Today" is the user's calendar day, not UTC's: after 8pm Eastern, UTC is already tomorrow, which
// dated new transactions a day ahead and made "due in 2 days" read 1. One zone for the app (the
// persona lives in Gainesville); override with APP_TIME_ZONE.
const TIME_ZONE = process.env.APP_TIME_ZONE || "America/New_York";
const calendarDay = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });

/** Calendar date (YYYY-MM-DD) `days` from today in the app's time zone; negative = past. */
export const isoDay = (days = 0): string => {
  const today = calendarDay.format(new Date());
  return days === 0 ? today : new Date(Date.parse(`${today}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
};

/** Whole days from today until a YYYY-MM-DD date (negative = past). */
export const daysUntil = (date: string): number => Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${isoDay()}T00:00:00Z`)) / DAY_MS);

/** Next calendar date (today or later) that falls on day-of-month `day`. */
export function nextMonthDay(day: number): string {
  const now = new Date(`${isoDay()}T00:00:00Z`);
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day));
  if (d < now) d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}
