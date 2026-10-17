/** Rounded percent of the credit limit in use. */
export const utilizationPct = (balanceCents: number, limitCents: number): number => (limitCents > 0 ? Math.round((balanceCents / limitCents) * 100) : 0);

/**
 * Card payment that brings utilization down to `targetPct` before the statement closes, paid from an
 * account with `availableCents`, always leaving `keepCents` behind. Whole dollars (Nessie drops cents).
 */
export function planCardPayment(o: { balanceCents: number; limitCents: number; availableCents: number; targetPct?: number; keepCents?: number }): number {
  const target = Math.floor((o.limitCents * (o.targetPct ?? 9)) / 100);
  const needed = Math.ceil(Math.max(0, o.balanceCents - target) / 100) * 100;
  const spare = Math.floor(Math.max(0, o.availableCents - (o.keepCents ?? 10_000)) / 100) * 100;
  return Math.min(needed, spare);
}

/** Next statement close on or after `today` (YYYY-MM-DD); days past the month's end clamp to its last day. */
export function nextStatementClose(statementDay: number, today: string): string {
  const [y, m] = today.split("-").map(Number);
  const onDay = (year: number, month0: number) => {
    const last = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
    return new Date(Date.UTC(year, month0, Math.min(statementDay, last))).toISOString().slice(0, 10);
  };
  const thisMonth = onDay(y, m - 1);
  return thisMonth >= today ? thisMonth : onDay(y, m);
}
