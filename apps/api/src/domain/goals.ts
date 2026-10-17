import type { GoalCadence } from "@finni/shared";

export const cadenceLabel = (c: GoalCadence): "weekly" | "every 2 weeks" | "monthly" => (c === "weekly" ? "weekly" : c === "biweekly" ? "every 2 weeks" : "monthly");

/** The contribution date after `date` (YYYY-MM-DD); monthly steps clamp to the month's last day. */
export function advanceContribution(date: string, cadence: GoalCadence): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (cadence !== "monthly") {
    d.setUTCDate(d.getUTCDate() + (cadence === "weekly" ? 7 : 14));
    return d.toISOString().slice(0, 10);
  }
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(d.getUTCDate(), last))).toISOString().slice(0, 10);
}

/**
 * When the plan reaches the target: contributions land every cadence starting one cadence after today.
 * Today when already funded; null without a plan.
 */
export function goalEta(g: { currentCents: number; targetCents: number; contributionCents: number | null; cadence: GoalCadence | null }, today: string): string | null {
  const remaining = g.targetCents - g.currentCents;
  if (remaining <= 0) return today;
  if (!g.cadence || !g.contributionCents || g.contributionCents <= 0) return null;
  let date = today;
  for (let n = Math.ceil(remaining / g.contributionCents); n > 0; n--) date = advanceContribution(date, g.cadence);
  return date;
}

export const isBehind = (eta: string | null, targetDate: string | null): boolean => !!eta && !!targetDate && eta > targetDate;
