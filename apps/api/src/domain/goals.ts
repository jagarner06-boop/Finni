import type { GoalCadence } from "@finni/shared";

export const cadenceLabel = (c: GoalCadence): "weekly" | "every 2 weeks" | "monthly" => (c === "weekly" ? "weekly" : c === "biweekly" ? "every 2 weeks" : "monthly");

/** `steps` contributions after `date` (YYYY-MM-DD); monthly steps keep the day, clamped to the month's last day. */
function addSteps(date: string, cadence: GoalCadence, steps: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (cadence !== "monthly") {
    d.setUTCDate(d.getUTCDate() + steps * (cadence === "weekly" ? 7 : 14));
    return d.toISOString().slice(0, 10);
  }
  const month = d.getUTCMonth() + steps;
  const last = new Date(Date.UTC(d.getUTCFullYear(), month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(d.getUTCFullYear(), month, Math.min(d.getUTCDate(), last))).toISOString().slice(0, 10);
}

/** The contribution date after `date`. */
export const advanceContribution = (date: string, cadence: GoalCadence): string => addSteps(date, cadence, 1);

/** Plans longer than this have no meaningful ETA. */
const MAX_ETA_YEARS = 50;

/**
 * When the plan reaches the target: contributions land every cadence starting one cadence after today.
 * Today when already funded; null without a plan or when it would take over 50 years.
 */
export function goalEta(g: { currentCents: number; targetCents: number; contributionCents: number | null; cadence: GoalCadence | null }, today: string): string | null {
  const remaining = g.targetCents - g.currentCents;
  if (remaining <= 0) return today;
  if (!g.cadence || !g.contributionCents || g.contributionCents <= 0) return null;
  const steps = Math.ceil(remaining / g.contributionCents);
  const perYear = g.cadence === "weekly" ? 52 : g.cadence === "biweekly" ? 26 : 12;
  if (steps > MAX_ETA_YEARS * perYear) return null;
  return addSteps(today, g.cadence, steps);
}

export const isBehind = (eta: string | null, targetDate: string | null): boolean => !!eta && !!targetDate && eta > targetDate;

/** A rounded display percentage must not complete a goal before it is fully funded. */
export function goalPercent(currentCents: number, targetCents: number): number {
  if (targetCents <= 0) return 0;
  if (currentCents >= targetCents) return 100;
  return Math.max(0, Math.min(99, Math.round(currentCents / targetCents * 100)));
}
