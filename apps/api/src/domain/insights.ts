import type { Transaction } from "@finni/shared";

// Things Finn notices in card and checking purchases. Pure: callers pass the purchases and "today".

const DAY_MS = 86_400_000;
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
const oldestFirst = (a: Transaction, b: Transaction) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id);

/**
 * Same merchant, amount and account within `windowDays` (default: the same day, since daily habits like
 * coffee repeat amounts on nearby days); the later charge is the duplicate. Each purchase pairs once.
 */
export function findDuplicateCharges(purchases: Transaction[], windowDays = 0): { original: Transaction; duplicate: Transaction }[] {
  const sorted = [...purchases].sort(oldestFirst);
  const used = new Set<string>();
  const pairs: { original: Transaction; duplicate: Transaction }[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    if (used.has(a.id)) continue;
    for (let j = i + 1; j < sorted.length; j++) {
      const b = sorted[j];
      if (daysBetween(a.date, b.date) > windowDays) break;
      if (used.has(b.id) || b.merchantName !== a.merchantName || b.amountCents !== a.amountCents || b.accountId !== a.accountId) continue;
      used.add(a.id).add(b.id);
      pairs.push({ original: a, duplicate: b });
      break;
    }
  }
  return pairs;
}

/** A subscription whose first and only charge landed in the last `lookbackDays`: a free trial that just converted. */
export function findConvertedTrials(purchases: Transaction[], today: string, lookbackDays = 14): Transaction[] {
  const subs = purchases.filter((p) => p.category === "Subscriptions");
  const count = new Map<string, number>();
  for (const p of subs) count.set(p.merchantName, (count.get(p.merchantName) ?? 0) + 1);
  return subs.filter((p) => count.get(p.merchantName) === 1 && daysBetween(p.date, today) <= lookbackDays && daysBetween(p.date, today) >= 0);
}

/** Categories whose last-7-days spend is over 1.5× their average week across the 4 weeks before, and at least $40. */
export function findSpendingSpikes(purchases: Transaction[], today: string): { category: string; weekCents: number; avgWeekCents: number }[] {
  const week = new Map<string, number>();
  const before = new Map<string, number>();
  for (const p of purchases) {
    const age = daysBetween(p.date, today);
    const category = p.category ?? "Other";
    if (age >= 0 && age < 7) week.set(category, (week.get(category) ?? 0) + p.amountCents);
    else if (age >= 7 && age < 35) before.set(category, (before.get(category) ?? 0) + p.amountCents);
  }
  return [...week]
    .map(([category, weekCents]) => ({ category, weekCents, avgWeekCents: Math.round((before.get(category) ?? 0) / 4) }))
    .filter((s) => s.weekCents >= 4_000 && s.weekCents > s.avgWeekCents * 1.5)
    .sort((a, b) => b.weekCents - a.weekCents);
}
