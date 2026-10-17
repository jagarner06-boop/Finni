import type { MerchantKey } from "../merchants.js";

// "Alex — UF junior" (Seed plan). All dates are day offsets from today so the demo always looks current.
// Whole dollars only: Nessie truncates cents.

export interface PersonaPurchase {
  merchant: MerchantKey;
  amount: number;
  daysAgo: number;
}
export interface PersonaMovement {
  amount: number;
  daysAgo: number;
  description: string;
}
export interface PersonaBill {
  payee: string;
  nickname: string;
  amount: number;
  /** Pending bills: due this many days from today. */
  dueInDays?: number;
  /** Recurring bills: day of month. */
  recurringDay?: number;
}
export interface PersonaGoal {
  name: string;
  emoji: string;
  targetDollars: number;
  currentDollars: number;
  targetInDays: number;
  milestonesHit: number[];
}

export interface PersonaPlan {
  /** Live balances we want the user to see after seeding. */
  checkingTarget: number;
  savingsTarget: number;
  deposits: PersonaMovement[];
  withdrawals: PersonaMovement[];
  purchases: PersonaPurchase[];
  bills: PersonaBill[];
  goals: PersonaGoal[];
}

// Deterministic PRNG so every seeded user gets the same, natural-looking amounts.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function alexPlan(): PersonaPlan {
  const rand = mulberry32(42);
  const between = (min: number, max: number) => Math.round(min + rand() * (max - min));
  const purchases: PersonaPurchase[] = [];
  const buy = (merchant: MerchantKey, days: number[], min: number, max = min) => {
    for (const daysAgo of days) purchases.push({ merchant, daysAgo, amount: between(min, max) });
  };

  buy("publix", [3, 10, 17, 24, 31, 38, 45, 52, 59], 40, 75);
  buy("starbucks", [1, 4, 6, 8, 11, 13, 15, 18, 20, 22, 25, 27, 29, 32, 36, 39, 43, 46, 50, 53, 57], 5, 7);
  buy("spotify", [14, 44], 12);
  buy("netflix", [9, 39], 15);
  buy("chipotle", [7, 21, 35, 49], 11, 14);
  buy("amc", [26], 16);
  buy("target", [12, 41], 25, 60);
  buy("uber", [19, 33], 12, 18);
  buy("wawa", [5, 20, 34, 48], 30, 40);
  buy("ufBookstore", [48], 120);
  // DoorDash spike: ~weekly before, then 4 orders in the last 7 days (trips the spending_spike nudge).
  buy("doordash", [16, 23, 30, 37, 44, 51, 58], 18, 26);
  buy("doordash", [1, 2, 4, 6], 22, 32);

  return {
    checkingTarget: 1240,
    savingsTarget: 400,
    deposits: [
      ...[2, 16, 30, 44, 58].map((daysAgo) => ({ amount: 620, daysAgo, description: "Campus job" })),
      ...[5, 35].map((daysAgo) => ({ amount: 250, daysAgo, description: "From Mom 💛" })),
    ],
    withdrawals: [16, 46].map((daysAgo) => ({ amount: 750, daysAgo, description: "Rent · Gainesville Place" })),
    purchases,
    bills: [
      { payee: "Gainesville Place", nickname: "Rent", amount: 750, recurringDay: 1 },
      { payee: "Visible", nickname: "Phone", amount: 45, dueInDays: 2 },
      { payee: "GRU", nickname: "Electric", amount: 82, dueInDays: 12 },
      { payee: "Lemonade", nickname: "Renter's insurance", amount: 14, recurringDay: 15 },
    ],
    goals: [{ name: "Spring Break", emoji: "🌴", targetDollars: 600, currentDollars: 270, targetInDays: 140, milestonesHit: [25] }],
  };
}

/** Nessie balances are fixed at creation, so pick the opening balance that makes the live balance land on target. */
export function openingChecking(plan: PersonaPlan): number {
  const sum = (xs: { amount: number }[]) => xs.reduce((s, x) => s + x.amount, 0);
  return Math.max(0, plan.checkingTarget - sum(plan.deposits) + sum(plan.withdrawals) + sum(plan.purchases));
}
